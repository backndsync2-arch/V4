"""
Music library views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.db import transaction
from .models import Folder, MusicFile
from .serializers import FolderSerializer, MusicFileSerializer, MusicFileCreateSerializer
from apps.common.permissions import IsSameClient, IsOwnerOrReadOnly
from apps.common.exceptions import NotFoundError, ValidationError
from apps.common.utils import log_audit_event, get_effective_client
import logging

logger = logging.getLogger(__name__)


class FolderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Folder CRUD operations.
    
    Supports filtering by client and type.
    """
    serializer_class = FolderSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter folders by client and zone."""
        user = self.request.user
        if not user or not user.is_authenticated:
            return Folder.objects.none()
        
        # Use effective client (handles impersonation)
        effective_client = get_effective_client(self.request)
        
        # Admin not impersonating: show all folders
        if user.role == 'admin' and not effective_client:
            queryset = Folder.objects.all()
        # Admin impersonating or other users: filter by effective client
        elif effective_client:
            queryset = Folder.objects.filter(client=effective_client)
        else:
            return Folder.objects.none()
        
        # Filter by zone if provided (folders are zone-specific)
        zone_id = self.request.query_params.get('zone')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        
        # Filter by type if provided
        folder_type = self.request.query_params.get('type')
        if folder_type:
            queryset = queryset.filter(type=folder_type)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create folder with client, zone, and creator."""
        effective_client = get_effective_client(self.request)
        if not effective_client:
            from apps.common.exceptions import ValidationError
            raise ValidationError("No client associated with this user")
        
        zone_id = self.request.data.get('zone_id') or self.request.data.get('zone')
        zone = None
        if zone_id:
            from apps.zones.models import Zone
            try:
                zone = Zone.objects.get(id=zone_id, client=effective_client)
            except Zone.DoesNotExist:
                pass  # zone_id will be None if zone not found
        
        folder = serializer.save(
            client=effective_client,
            zone=zone,
            created_by=self.request.user
        )
        
        # Log folder creation
        log_audit_event(
            request=self.request,
            action='create',
            resource_type='folder',
            resource_id=str(folder.id),
            details={
                'name': folder.name,
                'type': folder.type,
                'zone_id': str(zone.id) if zone else None,
            },
            user=self.request.user,
            status_code=status.HTTP_201_CREATED
        )
    
    def perform_update(self, serializer):
        """Update folder and log the action."""
        folder = serializer.save()
        
        # Log folder update
        log_audit_event(
            request=self.request,
            action='update',
            resource_type='folder',
            resource_id=str(folder.id),
            details={
                'name': folder.name,
            },
            user=self.request.user,
            status_code=status.HTTP_200_OK
        )
    
    def perform_destroy(self, instance):
        """Delete folder and log the action."""
        folder_id = str(instance.id)
        folder_name = instance.name
        instance.delete()
        
        # Log folder deletion
        log_audit_event(
            request=self.request,
            action='delete',
            resource_type='folder',
            resource_id=folder_id,
            details={
                'name': folder_name,
            },
            user=self.request.user,
            status_code=status.HTTP_204_NO_CONTENT
        )


class MusicFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MusicFile CRUD operations.
    
    Supports filtering by folder, search, and pagination.
    """
    serializer_class = MusicFileSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'artist', 'album', 'genre']
    ordering_fields = ['title', 'artist', 'created_at', 'order']
    ordering = ['order', 'title']
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter music files by client."""
        user = self.request.user
        if not user or not user.is_authenticated:
            return MusicFile.objects.none()
        
        # Use effective client (handles impersonation)
        effective_client = get_effective_client(self.request)
        
        # Admin not impersonating: show all music files
        if user.role == 'admin' and not effective_client:
            queryset = MusicFile.objects.all()
        # Admin impersonating or other users: filter by effective client
        elif effective_client:
            queryset = MusicFile.objects.filter(client=effective_client)
        else:
            return MusicFile.objects.none()
        
        # Filter by folder if provided
        folder_id = self.request.query_params.get('folder')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
        
        # Filter by zone if provided
        zone_id = self.request.query_params.get('zone')
        if zone_id:
            queryset = queryset.filter(zone_id=zone_id)
        
        return queryset.select_related('folder', 'zone', 'uploaded_by')
    
    def get_serializer_class(self):
        """Use create serializer for POST."""
        if self.action == 'create':
            return MusicFileCreateSerializer
        return MusicFileSerializer
    
    def perform_create(self, serializer):
        """Create music file (client set in serializer)."""
        effective_client = get_effective_client(self.request)
        if not effective_client:
            from apps.common.exceptions import ValidationError
            raise ValidationError("No client associated with this user")
        
        serializer.save(
            client=effective_client,
            uploaded_by=self.request.user
        )

    def create(self, request, *args, **kwargs):
        """
        Create a music file upload and return the full read serializer payload
        (including id + file_url), not the write serializer fields.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        effective_client = get_effective_client(request)
        if not effective_client:
            from apps.common.exceptions import ValidationError
            raise ValidationError("No client associated with this user")
        
        music_file = serializer.save(client=effective_client, uploaded_by=request.user)

        # Log music file upload
        log_audit_event(
            request=request,
            action='upload',
            resource_type='music_file',
            resource_id=str(music_file.id),
            details={
                'title': music_file.title,
                'artist': music_file.artist,
                'file_name': music_file.file.name if music_file.file else None,
                'file_size': music_file.file.size if music_file.file else None,
                'folder_id': str(music_file.folder.id) if music_file.folder else None,
            },
            user=request.user,
            status_code=status.HTTP_201_CREATED
        )

        read_serializer = MusicFileSerializer(music_file, context={'request': request})
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_destroy(self, instance):
        """Delete music file and log the action."""
        music_file_id = str(instance.id)
        music_file_title = instance.title
        music_file_name = instance.file.name if instance.file else None
        instance.delete()
        
        # Log music file deletion
        log_audit_event(
            request=self.request,
            action='delete',
            resource_type='music_file',
            resource_id=music_file_id,
            details={
                'title': music_file_title,
                'file_name': music_file_name,
            },
            user=self.request.user,
            status_code=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=False, methods=['post'])
    def batch_upload(self, request):
        """Upload multiple music files."""
        files = request.FILES.getlist('files')
        folder_id = request.data.get('folder_id')
        
        if not files:
            raise ValidationError("No files provided")
        
        if len(files) > 20:
            raise ValidationError("Maximum 20 files allowed per batch")
        
        uploaded_files = []
        errors = []
        
        for file in files:
            try:
                serializer = MusicFileCreateSerializer(
                    data={'file': file, 'folder_id': folder_id},
                    context={'request': request}
                )
                serializer.is_valid(raise_exception=True)
                music_file = serializer.save()
                uploaded_files.append(MusicFileSerializer(music_file, context={'request': request}).data)
                
                # Log each file upload
                log_audit_event(
                    request=request,
                    action='batch_upload',
                    resource_type='music_file',
                    resource_id=str(music_file.id),
                    details={
                        'title': music_file.title,
                        'file_name': file.name,
                        'file_size': file.size,
                        'folder_id': folder_id,
                        'batch_total': len(files),
                    },
                    user=request.user,
                    status_code=status.HTTP_201_CREATED
                )
            except Exception as e:
                errors.append({'file': file.name, 'error': str(e)})
        
        return Response({
            'uploaded': uploaded_files,
            'errors': errors,
            'total': len(files),
            'success': len(uploaded_files)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def upload_cover_art(self, request, pk=None):
        """Upload cover art for music file."""
        music_file = self.get_object()
        cover_file = request.FILES.get('cover_art')
        
        if not cover_file:
            raise ValidationError("No cover art file provided")
        
        music_file.cover_art = cover_file
        music_file.save()
        
        # Log cover art upload
        log_audit_event(
            request=request,
            action='upload_cover_art',
            resource_type='music_file',
            resource_id=str(music_file.id),
            details={
                'title': music_file.title,
                'cover_file_name': cover_file.name,
                'cover_file_size': cover_file.size,
            },
            user=request.user,
            status_code=status.HTTP_200_OK
        )
        
        serializer = self.get_serializer(music_file)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder tracks in a folder."""
        folder_id = request.data.get('folder_id')
        track_ids = request.data.get('track_ids', [])
        
        if not folder_id or not track_ids:
            raise ValidationError("folder_id and track_ids are required")
        
        effective_client = get_effective_client(request)
        if not effective_client:
            from apps.common.exceptions import ValidationError
            raise ValidationError("No client associated with this user")
        
        try:
            folder = Folder.objects.get(id=folder_id, client=effective_client)
        except Folder.DoesNotExist:
            raise NotFoundError("Folder", folder_id)
        
        # Update order for each track
        with transaction.atomic():
            for order, track_id in enumerate(track_ids):
                MusicFile.objects.filter(
                    id=track_id,
                    folder=folder,
                    client=effective_client
                ).update(order=order)
        
        # Log track reordering
        log_audit_event(
            request=request,
            action='reorder',
            resource_type='music_file',
            details={
                'folder_id': str(folder.id),
                'folder_name': folder.name,
                'track_count': len(track_ids),
            },
            user=request.user,
            status_code=status.HTTP_200_OK
        )
        
        return Response({'message': 'Tracks reordered successfully'})
