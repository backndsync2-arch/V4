"""
Scheduler serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from rest_framework import serializers
# ArrayField not available in SQLite - using JSONField in models instead
from .models import Schedule, ChannelPlaylist, ChannelPlaylistItem
from apps.zones.serializers import ZoneSerializer


class ScheduleSerializer(serializers.ModelSerializer):
    """Serializer for Schedule model."""
    
    zones_data = ZoneSerializer(source='zones', many=True, read_only=True)
    schedule_type = serializers.CharField(source='schedule_type', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'name', 'schedule_config', 'schedule_type',
            'zones', 'zones_data', 'devices', 'priority',
            'enabled', 'client_id', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schedule_type', 'created_by_name', 'created_at', 'updated_at']


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schedules."""
    
    class Meta:
        model = Schedule
        fields = [
            'name', 'schedule_config', 'zones', 'devices',
            'priority', 'enabled'
        ]
    
    def validate_schedule_config(self, value):
        """Validate schedule configuration."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("schedule_config must be a dictionary")
        
        schedule_type = value.get('type')
        if schedule_type not in ['interval', 'timeline']:
            raise serializers.ValidationError("schedule type must be 'interval' or 'timeline'")
        
        if schedule_type == 'interval':
            if 'intervalMinutes' not in value:
                raise serializers.ValidationError("intervalMinutes required for interval schedules")
            if 'announcementIds' not in value:
                raise serializers.ValidationError("announcementIds required for interval schedules")
        
        if schedule_type == 'timeline':
            if 'cycleDurationMinutes' not in value:
                raise serializers.ValidationError("cycleDurationMinutes required for timeline schedules")
            if 'announcements' not in value:
                raise serializers.ValidationError("announcements required for timeline schedules")
        
        return value


class ChannelPlaylistItemSerializer(serializers.ModelSerializer):
    """Serializer for ChannelPlaylistItem."""
    
    class Meta:
        model = ChannelPlaylistItem
        fields = [
            'id', 'item_type', 'content_id', 'interval_minutes',
            'fixed_times', 'order'
        ]
        read_only_fields = ['id']


class ChannelPlaylistSerializer(serializers.ModelSerializer):
    """Serializer for ChannelPlaylist."""
    
    items = ChannelPlaylistItemSerializer(many=True, read_only=True)
    floors_data = serializers.SerializerMethodField()
    zones_data = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = ChannelPlaylist
        fields = [
            'id', 'name', 'description', 'floors', 'floors_data',
            'zones', 'zones_data', 'default_music_interval',
            'default_announcement_interval', 'shuffle_music',
            'shuffle_announcements', 'quiet_hours_start',
            'quiet_hours_end', 'enabled', 'items', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'floors_data', 'zones_data', 'items',
            'created_by_name', 'created_at', 'updated_at'
        ]
    
    def get_floors_data(self, obj):
        """Get floors data."""
        from apps.zones.serializers import FloorSerializer
        return FloorSerializer(obj.floors.all(), many=True, context=self.context).data
    
    def get_zones_data(self, obj):
        """Get zones data."""
        return ZoneSerializer(obj.zones.all(), many=True, context=self.context).data
