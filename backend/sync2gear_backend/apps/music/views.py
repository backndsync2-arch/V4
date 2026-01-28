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
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Folder.objects.none()
        
        queryset = Folder.objects.filter(client=user.client)
        
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
        zone_id = self.request.data.get('zone_id') or self.request.data.get('zone')
        zone = None
        if zone_id:
            from apps.zones.models import Zone
            try:
                zone = Zone.objects.get(id=zone_id, client=self.request.user.client)
            except Zone.DoesNotExist:
                pass  # zone_id will be None if zone not found
        
        serializer.save(
            client=self.request.user.client,
            zone=zone,
            created_by=self.request.user
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
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return MusicFile.objects.none()
        
        queryset = MusicFile.objects.filter(client=user.client)
        
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
        serializer.save(
            client=self.request.user.client,
            uploaded_by=self.request.user
        )

    def create(self, request, *args, **kwargs):
        """
        Create a music file upload and return the full read serializer payload
        (including id + file_url), not the write serializer fields.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        music_file = serializer.save(client=request.user.client, uploaded_by=request.user)

        read_serializer = MusicFileSerializer(music_file, context={'request': request})
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
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
        
        serializer = self.get_serializer(music_file)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder tracks in a folder."""
        folder_id = request.data.get('folder_id')
        track_ids = request.data.get('track_ids', [])
        
        if not folder_id or not track_ids:
            raise ValidationError("folder_id and track_ids are required")
        
        try:
            folder = Folder.objects.get(id=folder_id, client=request.user.client)
        except Folder.DoesNotExist:
            raise NotFoundError("Folder", folder_id)
        
        # Update order for each track
        with transaction.atomic():
            for order, track_id in enumerate(track_ids):
                MusicFile.objects.filter(
                    id=track_id,
                    folder=folder,
                    client=request.user.client
                ).update(order=order)
        
        return Response({'message': 'Tracks reordered successfully'})
