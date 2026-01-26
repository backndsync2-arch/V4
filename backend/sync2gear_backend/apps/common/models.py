"""
Common models and base classes for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models


class TimestampedModel(models.Model):
    """
    Abstract base model that provides created_at and updated_at timestamps.
    
    All models should inherit from this to ensure consistent timestamp tracking.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
        ordering = ['-created_at']


class SoftDeleteModel(TimestampedModel):
    """
    Abstract model that provides soft delete functionality.
    
    Instead of actually deleting records, sets is_deleted=True.
    """
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True
    
    def soft_delete(self):
        """Mark the object as deleted without actually removing it."""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
    
    def restore(self):
        """Restore a soft-deleted object."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])
