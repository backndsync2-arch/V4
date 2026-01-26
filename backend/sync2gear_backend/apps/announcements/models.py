"""
Announcements models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from apps.common.models import TimestampedModel


class Announcement(TimestampedModel):
    """
    Announcement audio file.
    
    Can be created via:
    - Text-to-Speech (TTS)
    - Audio file upload
    - Browser recording
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=255, db_index=True)
    
    # Audio file
    file = models.FileField(upload_to='announcements/')
    duration = models.IntegerField()  # seconds
    file_size = models.BigIntegerField()  # bytes
    
    # TTS info (if generated)
    is_tts = models.BooleanField(default=False, db_index=True)
    tts_text = models.TextField(blank=True)
    tts_voice = models.CharField(max_length=50, blank=True)
    tts_provider = models.CharField(max_length=50, blank=True)  # google, openai, elevenlabs, etc.
    
    # Recording info
    is_recording = models.BooleanField(default=False)
    
    # Status
    enabled = models.BooleanField(default=True, db_index=True)
    category = models.CharField(max_length=100, blank=True)  # promotion, operational, etc.
    
    # Relationships
    folder = models.ForeignKey(
        'music.Folder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
        db_index=True
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='announcements',
        db_index=True
    )
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_announcements'
    )
    
    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client', 'enabled']),
            models.Index(fields=['client', 'is_tts']),
            models.Index(fields=['folder', 'enabled']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def file_url(self):
        """Get the file URL."""
        if self.file:
            return self.file.url
        return None
    
    @property
    def type(self):
        """Get the announcement type."""
        if self.is_tts:
            return 'tts'
        elif self.is_recording:
            return 'recorded'
        else:
            return 'uploaded'


class AnnouncementTemplate(TimestampedModel):
    """
    Ready-made announcement template.
    
    These are pre-generated templates that users can use as starting points.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    script = models.TextField()  # The announcement text
    
    category = models.CharField(
        max_length=50,
        choices=[
            ('retail', 'Retail'),
            ('restaurant', 'Restaurant'),
            ('office', 'Office'),
            ('healthcare', 'Healthcare'),
            ('gym', 'Gym'),
            ('general', 'General'),
        ],
        db_index=True
    )
    
    duration = models.IntegerField(default=0)  # Estimated duration in seconds
    voice_type = models.CharField(
        max_length=50,
        choices=[
            ('professional', 'Professional'),
            ('friendly', 'Friendly'),
            ('urgent', 'Urgent'),
            ('casual', 'Casual'),
            ('energetic', 'Energetic'),
            ('calm', 'Calm'),
        ],
        default='friendly'
    )
    
    # Template folder (grouping)
    folder = models.ForeignKey(
        'AnnouncementTemplateFolder',
        on_delete=models.CASCADE,
        related_name='templates',
        db_index=True
    )
    
    active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'announcement_templates'
        ordering = ['folder', 'title']
        indexes = [
            models.Index(fields=['category', 'active']),
            models.Index(fields=['folder', 'active']),
        ]
    
    def __str__(self):
        return f"{self.folder.name} - {self.title}"


class AnnouncementTemplateFolder(TimestampedModel):
    """
    Folder/collection of announcement templates.
    
    Groups related templates together (e.g., "Retail Essentials", "Restaurant Daily")
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)  # Optional image for the folder
    
    category = models.CharField(
        max_length=50,
        choices=[
            ('retail', 'Retail'),
            ('restaurant', 'Restaurant'),
            ('office', 'Office'),
            ('healthcare', 'Healthcare'),
            ('gym', 'Gym'),
            ('general', 'General'),
        ],
        db_index=True
    )
    
    active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'announcement_template_folders'
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category', 'active']),
        ]
    
    def __str__(self):
        return self.name
