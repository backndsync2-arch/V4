"""
Playback views for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import PlaybackState, PlayEvent
from .serializers import PlaybackStateSerializer, PlayEventSerializer
from .engine import PlaybackEngine
from apps.common.permissions import IsSameClient
from apps.common.exceptions import ValidationError, NotFoundError
from apps.zones.models import Zone
import logging

logger = logging.getLogger(__name__)


class PlaybackStateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for reading playback state.
    """
    serializer_class = PlaybackStateSerializer
    permission_classes = [IsSameClient]
    
    def get_queryset(self):
        """Filter playback states by client."""
        user = self.request.user
        return PlaybackState.objects.filter(
            zone__client=user.client
        ).select_related('zone', 'current_track', 'current_announcement')
    
    @action(detail=False, methods=['get'])
    def by_zone(self, request):
        """Get playback state for a specific zone."""
        zone_id = request.query_params.get('zone_id')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        state, created = PlaybackState.objects.get_or_create(
            zone=zone,
            defaults={'is_playing': False}
        )
        
        serializer = self.get_serializer(state)
        return Response(serializer.data)


class PlaybackControlViewSet(viewsets.ViewSet):
    """
    ViewSet for playback control actions.
    """
    permission_classes = [IsSameClient]
    
    @action(detail=False, methods=['post'])
    def play(self, request):
        """Start playback with playlists or music file IDs."""
        zone_id = request.data.get('zone_id')
        playlist_ids = request.data.get('playlist_ids', [])
        music_file_ids = request.data.get('music_file_ids', [])
        shuffle = request.data.get('shuffle', False)
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        if not playlist_ids and not music_file_ids:
            raise ValidationError("playlist_ids or music_file_ids are required")
        
        # Handle "all-zones" - start playback on all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            started_count = 0
            for zone in zones:
                try:
                    if music_file_ids:
                        PlaybackEngine.start_music_files(str(zone.id), music_file_ids, shuffle)
                    else:
                        PlaybackEngine.start_playlist(str(zone.id), playlist_ids, shuffle)
                    started_count += 1
                except Exception as e:
                    logger.error(f"Failed to start playback on zone {zone.id}: {e}")
            return Response({
                'message': f'Playback started on {started_count} zones',
                'zones_updated': started_count
            })
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        # If music_file_ids provided, use them directly; otherwise use playlist_ids
        if music_file_ids:
            PlaybackEngine.start_music_files(zone_id, music_file_ids, shuffle)
        else:
            PlaybackEngine.start_playlist(zone_id, playlist_ids, shuffle)
        
        return Response({
            'message': 'Playback started',
            'zone_id': zone_id
        })
    
    @action(detail=False, methods=['post'])
    def pause(self, request):
        """Pause playback."""
        zone_id = request.data.get('zone_id')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        # Handle "all-zones" - pause all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            for zone in zones:
                PlaybackEngine.pause(str(zone.id))
            return Response({'message': f'Playback paused on {zones.count()} zones'})
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        PlaybackEngine.pause(zone_id)
        
        return Response({'message': 'Playback paused'})
    
    @action(detail=False, methods=['post'])
    def resume(self, request):
        """Resume playback."""
        zone_id = request.data.get('zone_id')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        # Handle "all-zones" - resume all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            for zone in zones:
                PlaybackEngine.resume(str(zone.id))
            return Response({'message': f'Playback resumed on {zones.count()} zones'})
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        PlaybackEngine.resume(zone_id)
        
        return Response({'message': 'Playback resumed'})
    
    @action(detail=False, methods=['post'])
    def next(self, request):
        """Next track."""
        zone_id = request.data.get('zone_id')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        # Handle "all-zones" - next track on all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            for zone in zones:
                PlaybackEngine.next_track(str(zone.id))
            return Response({'message': f'Next track on {zones.count()} zones'})
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        PlaybackEngine.next_track(zone_id)
        
        return Response({'message': 'Next track'})
    
    @action(detail=False, methods=['post'])
    def previous(self, request):
        """Previous track."""
        zone_id = request.data.get('zone_id')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        # Handle "all-zones" - previous track on all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            for zone in zones:
                PlaybackEngine.previous_track(str(zone.id))
            return Response({'message': f'Previous track on {zones.count()} zones'})
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        PlaybackEngine.previous_track(zone_id)
        
        return Response({'message': 'Previous track'})
    
    @action(detail=False, methods=['post'])
    def volume(self, request):
        """Set volume."""
        zone_id = request.data.get('zone_id')
        volume = request.data.get('volume')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        if volume is None:
            raise ValidationError("volume is required")
        
        # Handle "all-zones" - set volume on all zones for user's client
        if zone_id == 'all-zones':
            zones = Zone.objects.filter(client=request.user.client)
            for zone in zones:
                PlaybackEngine.set_volume(str(zone.id), volume)
            return Response({'message': f'Volume set on {zones.count()} zones', 'volume': volume})
        
        # Validate zone belongs to user's client
        try:
            zone = Zone.objects.get(id=zone_id, client=request.user.client)
        except Zone.DoesNotExist:
            raise NotFoundError("Zone", zone_id)
        
        PlaybackEngine.set_volume(zone_id, volume)
        
        return Response({'message': 'Volume set', 'volume': volume})
    
    @action(detail=False, methods=['post'])
    def seek(self, request):
        """Seek to position."""
        zone_id = request.data.get('zone_id')
        position = request.data.get('position')
        
        if not zone_id:
            raise ValidationError("zone_id is required")
        
        if position is None:
            raise ValidationError("position is required")
        
        PlaybackEngine.seek(zone_id, position)
        
        return Response({'message': 'Seeked', 'position': position})


class PlayEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing play events.
    """
    serializer_class = PlayEventSerializer
    permission_classes = [IsSameClient]
    
    def get_queryset(self):
        """Filter play events by client."""
        user = self.request.user
        if not user or not user.is_authenticated or not hasattr(user, 'client'):
            return PlayEvent.objects.none()
        
        queryset = PlayEvent.objects.filter(client=user.client)
        
        # Filter by device if provided
        device_id = self.request.query_params.get('device')
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('announcement', 'device', 'created_by')
