"""
Scheduler models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from django.db.models import JSONField
# ArrayField not available in SQLite - using JSONField instead
ArrayField = JSONField  # Compatibility alias
from apps.common.models import TimestampedModel


class Schedule(TimestampedModel):
    """
    Scheduled playback event.
    
    Supports both interval-based and timeline-based scheduling.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255, db_index=True)
    
    # Schedule configuration (flexible JSON field)
    schedule_config = JSONField(default=dict)
    # Structure for interval:
    # {
    #   "type": "interval",
    #   "intervalMinutes": 60,
    #   "announcementIds": ["uuid1", "uuid2"],
    #   "avoidRepeat": true,
    #   "quietHoursStart": "22:00",
    #   "quietHoursEnd": "08:00"
    # }
    # Structure for timeline:
    # {
    #   "type": "timeline",
    #   "cycleDurationMinutes": 30,
    #   "announcements": [
    #     {"announcementId": "uuid1", "timestampSeconds": 300},
    #     {"announcementId": "uuid2", "timestampSeconds": 1500}
    #   ]
    # }
    
    # Target zones/devices
    zones = models.ManyToManyField('zones.Zone', related_name='schedules', blank=True)
    devices = models.ManyToManyField('zones.Device', related_name='schedules', blank=True)
    
    # Priority (higher = more important)
    priority = models.IntegerField(default=0, db_index=True)
    
    # State
    enabled = models.BooleanField(default=True, db_index=True)
    
    # Relationships
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='schedules',
        db_index=True
    )
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_schedules'
    )
    
    class Meta:
        db_table = 'schedules'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['client', 'enabled']),
            models.Index(fields=['enabled', 'priority']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.client.name})"
    
    @property
    def schedule_type(self):
        """Get the schedule type from config."""
        return self.schedule_config.get('type', 'interval')


class ChannelPlaylist(TimestampedModel):
    """
    Channel Playlist - Unified playlist mixing music and announcements.
    
    This is a NEW model that was missing from the original architecture.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    
    # Client relationship
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='channel_playlists',
        db_index=True
    )
    
    # Assigned floors/zones
    floors = models.ManyToManyField('zones.Floor', related_name='channel_playlists', blank=True)
    zones = models.ManyToManyField('zones.Zone', related_name='channel_playlists', blank=True)
    
    # Default intervals
    default_music_interval = models.IntegerField(default=15)  # minutes
    default_announcement_interval = models.IntegerField(default=30)  # minutes
    
    # Shuffle settings
    shuffle_music = models.BooleanField(default=False)
    shuffle_announcements = models.BooleanField(default=False)
    
    # Quiet hours
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    # Status
    enabled = models.BooleanField(default=True, db_index=True)
    
    # Creator
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_channel_playlists'
    )
    
    class Meta:
        db_table = 'channel_playlists'
        ordering = ['name']
        indexes = [
            models.Index(fields=['client', 'enabled']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.client.name})"


class ChannelPlaylistItem(TimestampedModel):
    """
    Individual item in a channel playlist.
    
    Can be either music or announcement.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Playlist relationship
    playlist = models.ForeignKey(
        ChannelPlaylist,
        on_delete=models.CASCADE,
        related_name='items',
        db_index=True
    )
    
    # Item type and content
    item_type = models.CharField(
        max_length=20,
        choices=[('music', 'Music'), ('announcement', 'Announcement')],
        db_index=True
    )
    content_id = models.UUIDField()  # MusicFile.id or Announcement.id
    
    # Playback settings
    interval_minutes = models.IntegerField(null=True, blank=True)  # Override default
    fixed_times = JSONField(default=list, blank=True)  # Fixed times like ["09:00", "12:00"] - stored as JSON array
    
    # Ordering
    order = models.IntegerField(default=0, db_index=True)
    
    class Meta:
        db_table = 'channel_playlist_items'
        ordering = ['playlist', 'order']
        indexes = [
            models.Index(fields=['playlist', 'item_type']),
            models.Index(fields=['playlist', 'order']),
        ]
    
    def __str__(self):
        return f"{self.item_type} item in {self.playlist.name}"
