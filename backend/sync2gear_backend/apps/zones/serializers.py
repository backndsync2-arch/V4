"""
Zones serializers for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

from rest_framework import serializers
from .models import Floor, Zone, Device


class FloorSerializer(serializers.ModelSerializer):
    """Serializer for Floor model."""
    
    zones_count = serializers.SerializerMethodField()
    devices_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = Floor
        fields = [
            'id', 'name', 'description', 'client_id', 'is_premium',
            'zones_count', 'devices_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'zones_count', 'devices_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
    
    def get_zones_count(self, obj):
        """Get count of zones in floor."""
        return obj.zones.count()
    
    def get_devices_count(self, obj):
        """Get count of devices in floor."""
        total = 0
        for zone in obj.zones.all():
            total += zone.devices.count()
        return total


class ZoneSerializer(serializers.ModelSerializer):
    """Serializer for Zone model."""
    
    devices_count = serializers.SerializerMethodField()
    floor_name = serializers.CharField(source='floor.name', read_only=True)
    is_playing = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Zone
        fields = [
            'id', 'name', 'description', 'floor_id', 'floor_name',
            'client_id', 'default_volume', 'is_active',
            'image', 'image_url',
            'devices_count', 'is_playing',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'floor_name', 'devices_count', 'is_playing', 'image_url',
            'created_at', 'updated_at'
        ]
    
    def get_devices_count(self, obj):
        """Get count of devices in zone."""
        return obj.devices.count()
    
    def get_is_playing(self, obj):
        """Check if zone is currently playing."""
        try:
            return obj.playback_state.is_playing
        except:
            return False

    def get_image_url(self, obj):
        """Get zone image URL."""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class DeviceSerializer(serializers.ModelSerializer):
    """Serializer for Device model."""
    
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    floor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Device
        fields = [
            'id', 'name', 'device_type', 'device_id', 'model',
            'firmware_version', 'ip_address', 'last_seen',
            'is_online', 'volume', 'zone_id', 'zone_name',
            'floor_name', 'client_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'zone_name', 'floor_name', 'last_seen',
            'created_at', 'updated_at'
        ]
    
    def get_floor_name(self, obj):
        """Get floor name."""
        if obj.zone and obj.zone.floor:
            return obj.zone.floor.name
        return None
