"""
Music library models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from apps.common.models import TimestampedModel


class Folder(TimestampedModel):
    """
    Music folder/playlist.
    
    Used to organize music files and announcements.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    type = models.CharField(
        max_length=20,
        choices=[('music', 'Music'), ('announcements', 'Announcements')],
        default='music',
        db_index=True
    )
    
    # Client relationship
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='folders',
        db_index=True
    )
    
    # Zone relationship (folders are zone-specific)
    zone = models.ForeignKey(
        'zones.Zone',
        on_delete=models.CASCADE,
        related_name='folders',
        null=True,
        blank=True,
        db_index=True
    )
    
    # Parent folder (for nested folders)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Metadata
    cover_image = models.ImageField(upload_to='folder_covers/', null=True, blank=True)
    is_system = models.BooleanField(default=False)  # System playlists
    
    # Creator
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_folders'
    )
    
    class Meta:
        db_table = 'folders'
        ordering = ['name']
        indexes = [
            models.Index(fields=['client', 'type']),
            models.Index(fields=['zone', 'type']),
            models.Index(fields=['parent']),
        ]
        unique_together = [['client', 'zone', 'name', 'type']]  # Unique folder name per client, zone and type
    
    def __str__(self):
        return f"{self.name} ({self.type})"


class MusicFile(TimestampedModel):
    """
    Music track file.
    
    Stores music files with metadata extracted from audio files.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File
    file = models.FileField(upload_to='music/')
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # bytes
    
    # Metadata
    title = models.CharField(max_length=255, db_index=True)
    artist = models.CharField(max_length=255, blank=True, db_index=True)
    album = models.CharField(max_length=255, blank=True)
    genre = models.CharField(max_length=100, blank=True)
    year = models.IntegerField(null=True, blank=True)
    duration = models.IntegerField()  # seconds
    
    # Cover art
    cover_art = models.ImageField(upload_to='covers/', null=True, blank=True)
    
    # Relationships
    folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='music_files',
        db_index=True
    )
    zone = models.ForeignKey(
        'zones.Zone',
        on_delete=models.CASCADE,
        related_name='music_files',
        null=True,
        blank=True,
        db_index=True
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='music_files',
        db_index=True
    )
    uploaded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_music'
    )
    
    # Ordering within folder
    order = models.IntegerField(default=0, db_index=True)
    
    class Meta:
        db_table = 'music_files'
        ordering = ['folder', 'order', 'title']
        indexes = [
            models.Index(fields=['client', 'folder']),
            models.Index(fields=['zone', 'folder']),
            models.Index(fields=['title', 'artist']),
            models.Index(fields=['folder', 'order']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.artist}" if self.artist else self.title
    
    @property
    def file_url(self):
        """Get the file URL."""
        if self.file:
            return self.file.url
        return None
    
    @property
    def cover_art_url(self):
        """Get the cover art URL."""
        if self.cover_art:
            return self.cover_art.url
        return None
