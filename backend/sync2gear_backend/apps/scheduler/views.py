"""
Scheduler views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Schedule, ChannelPlaylist, ChannelPlaylistItem
from .serializers import (
    ScheduleSerializer, ScheduleCreateSerializer,
    ChannelPlaylistSerializer, ChannelPlaylistItemSerializer
)
from apps.common.permissions import IsSameClient
from apps.common.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Schedule CRUD operations.
    
    Supports filtering by client and enabled status.
    """
    serializer_class = ScheduleSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter schedules by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return Schedule.objects.none()
        
        queryset = Schedule.objects.filter(client=user.client)
        
        # Filter by enabled status
        enabled = self.request.query_params.get('enabled')
        if enabled is not None:
            queryset = queryset.filter(enabled=enabled.lower() == 'true')
        
        return queryset.prefetch_related('zones')
    
    def get_serializer_class(self):
        """Use create serializer for POST."""
        if self.action == 'create':
            return ScheduleCreateSerializer
        return ScheduleSerializer
    
    def perform_create(self, serializer):
        """Create schedule with client and creator, handling zones."""
        zones_data = self.request.data.get('zones', [])
        
        with transaction.atomic():
            schedule = serializer.save(
                client=self.request.user.client,
                created_by=self.request.user
            )
            if zones_data:
                schedule.zones.set(zones_data)
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle schedule enabled status."""
        schedule = self.get_object()
        enabled_status = request.data.get('enabled', None)
        if enabled_status is None:
            raise ValidationError("Boolean field 'enabled' is required.")

        schedule.enabled = bool(enabled_status)
        schedule.save(update_fields=['enabled'])

        return Response({
            'id': str(schedule.id),
            'enabled': schedule.enabled,
            'message': 'Schedule enabled' if schedule.enabled else 'Schedule disabled'
        })
    
    @action(detail=False, methods=['post'])
    def check_now(self, request):
        """Manually trigger schedule check (for testing without Celery)."""
        try:
            from .tasks import check_schedules
            # Try to run as Celery task, fallback to direct call if Celery unavailable
            try:
                check_schedules.delay()
                return Response({'message': 'Schedule check queued'})
            except Exception:
                # Celery not available, run directly
                check_schedules()
                return Response({'message': 'Schedule check executed (direct mode)'})
        except Exception as e:
            logger.error(f"Error in manual schedule check: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def check_now(self, request):
        """Manually trigger schedule check (for testing without Celery)."""
        try:
            from .tasks import check_schedules
            # Try to run as Celery task, fallback to direct call if Celery unavailable
            try:
                check_schedules.delay()
                return Response({'message': 'Schedule check queued'})
            except Exception:
                # Celery not available, run directly
                check_schedules()
                return Response({'message': 'Schedule check executed (direct mode)'})
        except Exception as e:
            logger.error(f"Error in manual schedule check: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChannelPlaylistViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ChannelPlaylist CRUD operations.
    """
    serializer_class = ChannelPlaylistSerializer
    permission_classes = [IsSameClient]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter playlists by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return ChannelPlaylist.objects.none()
        
        queryset = ChannelPlaylist.objects.filter(client=user.client)
        
        # Filter by enabled status
        enabled = self.request.query_params.get('enabled')
        if enabled is not None:
            queryset = queryset.filter(enabled=enabled.lower() == 'true')
        
        return queryset.prefetch_related('floors', 'zones', 'items')
    
    def perform_create(self, serializer):
        """Create playlist with client and creator."""
        serializer.save(
            client=self.request.user.client,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post', 'get', 'delete'])
    def items(self, request, pk=None):
        """Manage playlist items."""
        playlist = self.get_object()
        
        if request.method == 'GET':
            items = playlist.items.all()
            serializer = ChannelPlaylistItemSerializer(items, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = ChannelPlaylistItemSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(playlist=playlist)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        elif request.method == 'DELETE':
            item_id = request.data.get('item_id')
            if not item_id:
                raise ValidationError("item_id is required")
            
            try:
                item = playlist.items.get(id=item_id)
                item.delete()
                return Response({'message': 'Item deleted'})
            except ChannelPlaylistItem.DoesNotExist:
                raise ValidationError("Item not found")
