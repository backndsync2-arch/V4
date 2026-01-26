"""
Playback control models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from django.db.models import JSONField
# ArrayField not available in SQLite - using JSONField instead
ArrayField = JSONField  # Compatibility alias
from apps.common.models import TimestampedModel


class PlaybackState(TimestampedModel):
    """
    Current playback state for a zone.
    
    Tracks what's currently playing, queue, position, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Zone relationship (one playback state per zone)
    zone = models.OneToOneField(
        'zones.Zone',
        on_delete=models.CASCADE,
        related_name='playback_state',
        db_index=True
    )
    
    # Current track
    current_track = models.ForeignKey(
        'music.MusicFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='playback_states'
    )
    
    # Current announcement (if playing)
    current_announcement = models.ForeignKey(
        'announcements.Announcement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='playback_states'
    )
    
    # Queue (array of UUIDs)
    queue = JSONField(
        models.UUIDField(),
        default=list,
        blank=True
    )
    queue_position = models.IntegerField(default=0)
    
    # State
    is_playing = models.BooleanField(default=False, db_index=True)
    position = models.IntegerField(default=0)  # Current position in seconds
    volume = models.IntegerField(default=70)
    
    # Playlist info
    current_playlists = JSONField(
        models.UUIDField(),
        default=list,
        blank=True
    )  # ChannelPlaylist IDs or Folder IDs
    
    # Playback mode
    mode = models.CharField(
        max_length=20,
        choices=[
            ('music', 'Music Only'),
            ('music+announcements', 'Music + Announcements'),
            ('announcements', 'Announcements Only'),
        ],
        default='music+announcements'
    )
    
    # Settings
    shuffle = models.BooleanField(default=False)
    repeat = models.BooleanField(default=False)
    
    # Announcement settings
    announcement_interval_minutes = models.IntegerField(default=30)
    fade_duration_seconds = models.IntegerField(default=3)
    background_volume_percent = models.IntegerField(default=30)  # Music volume during announcement
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        db_table = 'playback_states'
        indexes = [
            models.Index(fields=['zone', 'is_playing']),
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        status = "Playing" if self.is_playing else "Paused"
        return f"{self.zone.name} - {status}"


class PlayEvent(TimestampedModel):
    """
    Play event tracking for announcements.
    
    Tracks when announcements are played, delivery status, etc.
    This is a NEW model that was missing from the original architecture.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Event details
    announcement = models.ForeignKey(
        'announcements.Announcement',
        on_delete=models.CASCADE,
        related_name='play_events',
        db_index=True
    )
    device = models.ForeignKey(
        'zones.Device',
        on_delete=models.CASCADE,
        related_name='play_events',
        db_index=True
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='play_events',
        db_index=True
    )
    
    # Event type
    event_type = models.CharField(
        max_length=20,
        choices=[
            ('instant', 'Instant'),
            ('scheduled', 'Scheduled'),
        ],
        db_index=True
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('delivered', 'Delivered'),
            ('playing', 'Playing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending',
        db_index=True
    )
    
    # Timestamps
    delivered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    # Creator
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_play_events'
    )
    
    class Meta:
        db_table = 'play_events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'status']),
            models.Index(fields=['device', 'status']),
            models.Index(fields=['announcement', 'status']),
            models.Index(fields=['event_type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.announcement.title} on {self.device.name} - {self.status}"
