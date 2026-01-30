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
    schedule_type = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Schedule
        fields = [
            'id', 'name', 'schedule_config', 'schedule_type',
            'zones', 'zones_data', 'enabled', 'last_executed_at', 'client_id', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schedule_type', 'created_by_name', 'created_at', 'updated_at']


class ScheduleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating schedules."""
    from apps.zones.models import Zone
    zones = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Zone.objects.all(),  # Default queryset, will be filtered in __init__
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Schedule
        fields = [
            'name', 'schedule_config', 'zones', 'enabled'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter queryset for zones field based on user's client
        from apps.zones.models import Zone
        if self.context.get('request'):
            user = self.context['request'].user
            if hasattr(user, 'client'):
                self.fields['zones'].queryset = Zone.objects.filter(client=user.client)
            else:
                self.fields['zones'].queryset = Zone.objects.none()
    
    def validate_schedule_config(self, value):
        """Validate schedule configuration."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("schedule_config must be a dictionary")
        
        schedule_type = value.get('type')
        if schedule_type not in ['interval', 'timeline', 'datetime']:
            raise serializers.ValidationError("schedule type must be 'interval', 'timeline', or 'datetime'")
        
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
        
        if schedule_type == 'datetime':
            if 'dateTimeSlots' not in value:
                raise serializers.ValidationError("dateTimeSlots required for datetime schedules")
            if not isinstance(value.get('dateTimeSlots'), list):
                raise serializers.ValidationError("dateTimeSlots must be a list")
            if len(value.get('dateTimeSlots', [])) == 0:
                raise serializers.ValidationError("At least one dateTimeSlot is required")
            
            # Validate each slot
            for slot in value.get('dateTimeSlots', []):
                if not isinstance(slot, dict):
                    raise serializers.ValidationError("Each dateTimeSlot must be a dictionary")
                if 'announcementId' not in slot:
                    raise serializers.ValidationError("announcementId required in dateTimeSlot")
                if 'date' not in slot:
                    raise serializers.ValidationError("date required in dateTimeSlot")
                if 'time' not in slot:
                    raise serializers.ValidationError("time required in dateTimeSlot")
                if 'repeat' in slot and slot['repeat'] not in ['daily', 'weekly', 'monthly', 'yearly', 'none']:
                    raise serializers.ValidationError("repeat must be 'daily', 'weekly', 'monthly', 'yearly', or 'none'")
        
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
