"""
Playback serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from .models import PlaybackState, PlayEvent
from apps.music.serializers import MusicFileSerializer
from apps.announcements.serializers import AnnouncementSerializer


class PlaybackStateSerializer(serializers.ModelSerializer):
    """Serializer for PlaybackState model."""
    
    current_track_data = MusicFileSerializer(source='current_track', read_only=True)
    current_announcement_data = AnnouncementSerializer(source='current_announcement', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    
    class Meta:
        model = PlaybackState
        fields = [
            'id', 'zone_id', 'zone_name',
            'current_track', 'current_track_data',
            'current_announcement', 'current_announcement_data',
            'queue', 'queue_position', 'is_playing',
            'position', 'volume', 'current_playlists',
            'mode', 'shuffle', 'repeat',
            'announcement_interval_minutes', 'fade_duration_seconds',
            'background_volume_percent', 'last_updated'
        ]
        read_only_fields = [
            'id', 'current_track_data', 'current_announcement_data',
            'zone_name', 'last_updated'
        ]


class PlayEventSerializer(serializers.ModelSerializer):
    """Serializer for PlayEvent model."""
    
    announcement_title = serializers.CharField(source='announcement.title', read_only=True)
    device_name = serializers.CharField(source='device.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = PlayEvent
        fields = [
            'id', 'announcement', 'announcement_title',
            'device', 'device_name', 'client_id',
            'event_type', 'status', 'delivered_at',
            'completed_at', 'error_message', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'announcement_title', 'device_name',
            'created_by_name', 'created_at', 'updated_at'
        ]
