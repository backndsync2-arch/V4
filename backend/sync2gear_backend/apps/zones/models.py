"""
Zones, Floors, and Devices models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from django.db.models import JSONField
# ArrayField not available in SQLite - using JSONField instead
ArrayField = JSONField  # Compatibility alias
from apps.common.models import TimestampedModel


class Floor(TimestampedModel):
    """
    Physical floor/level within a client's location.
    
    Floors are a level above zones. The first floor is free,
    additional floors require premium subscription.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    
    # Client relationship
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='floors',
        db_index=True
    )
    
    # Premium feature
    is_premium = models.BooleanField(default=False, db_index=True)  # First floor is free
    
    # Metadata
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_floors'
    )
    
    class Meta:
        db_table = 'floors'
        ordering = ['name']
        indexes = [
            models.Index(fields=['client', 'is_premium']),
        ]
        unique_together = [['client', 'name']]  # Unique floor name per client
    
    def __str__(self):
        return f"{self.name} ({self.client.name})"


class Zone(TimestampedModel):
    """
    Physical zone/area within a floor.
    
    Zones are used for grouping devices and playback control.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    
    # Floor relationship (NEW - improved architecture)
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='zones',
        null=True,
        blank=True,
        db_index=True
    )
    
    # Client relationship (for backward compatibility and admin access)
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='zones',
        db_index=True
    )
    
    # Settings
    default_volume = models.IntegerField(default=70)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)

    # Zone image (for UI floor/zone icons)
    image = models.ImageField(upload_to='zone_images/', null=True, blank=True)
    
    class Meta:
        db_table = 'zones'
        ordering = ['floor', 'name']
        indexes = [
            models.Index(fields=['client', 'is_active']),
            models.Index(fields=['floor', 'is_active']),
        ]
        unique_together = [['client', 'name']]  # Unique zone name per client
    
    def __str__(self):
        floor_name = self.floor.name if self.floor else "No Floor"
        return f"{self.name} ({floor_name})"


class Device(TimestampedModel):
    """
    Playback device (speaker, tablet, etc.).
    
    Devices are assigned to zones and report their status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    device_type = models.CharField(max_length=50)  # speaker, tablet, etc.
    
    # Hardware info
    device_id = models.CharField(max_length=255, unique=True, db_index=True)  # Unique hardware ID
    model = models.CharField(max_length=100, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True)
    
    # Connection
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True, db_index=True)
    is_online = models.BooleanField(default=False, db_index=True)
    
    # Settings
    volume = models.IntegerField(default=70)
    
    # Relationships
    zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='devices',
        db_index=True
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='devices',
        db_index=True
    )
    
    class Meta:
        db_table = 'devices'
        ordering = ['zone', 'name']
        indexes = [
            models.Index(fields=['device_id']),
            models.Index(fields=['client', 'is_online']),
            models.Index(fields=['zone', 'is_online']),
            models.Index(fields=['last_seen']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.zone.name})"
    
    def update_heartbeat(self):
        """Update device heartbeat (called by device or heartbeat task)."""
        from django.utils import timezone
        self.last_seen = timezone.now()
        self.is_online = True
        self.save(update_fields=['last_seen', 'is_online'])
    
    def mark_offline(self, timeout_minutes=5):
        """Mark device as offline if last_seen is older than timeout."""
        from django.utils import timezone
        from datetime import timedelta
        
        if self.last_seen:
            if timezone.now() - self.last_seen > timedelta(minutes=timeout_minutes):
                self.is_online = False
                self.save(update_fields=['is_online'])
