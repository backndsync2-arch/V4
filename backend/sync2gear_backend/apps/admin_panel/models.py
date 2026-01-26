"""
Admin panel models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.db import models
from django.db.models import JSONField
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.common.models import TimestampedModel
# Encryption imports removed - handle encryption at application level


# Note: API key encryption should be handled at the application level
# For now, storing as regular CharField - encryption can be added via
# django-encrypted-model-fields or handled in serializers/views


class AuditLog(TimestampedModel):
    """
    Audit log for tracking all user actions.
    
    This is a NEW model that was missing from the original architecture.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User who performed the action
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        db_index=True
    )
    
    # Action details
    action = models.CharField(max_length=50, db_index=True)  # create, update, delete, etc.
    resource_type = models.CharField(max_length=50, db_index=True)  # music, announcement, etc.
    resource_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    # Client context
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        db_index=True
    )
    
    # Additional details (flexible JSON field)
    details = JSONField(default=dict, blank=True)
    
    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['client', 'created_at']),
            models.Index(fields=['resource_type', 'action']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.action} {self.resource_type} by {self.user}"


class AIProvider(TimestampedModel):
    """
    AI service provider configuration.
    
    Manages multiple TTS providers (OpenAI, Anthropic, Google, ElevenLabs).
    This is a NEW model that was missing from the original architecture.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Provider info
    name = models.CharField(max_length=100)  # Display name
    provider_type = models.CharField(
        max_length=20,
        choices=[
            ('openai', 'OpenAI'),
            ('anthropic', 'Anthropic'),
            ('google', 'Google Cloud'),
            ('elevenlabs', 'ElevenLabs'),
        ],
        db_index=True
    )
    
    # API credentials (should be encrypted in production - use django-encrypted-model-fields)
    api_key = models.CharField(max_length=500)  # TODO: Add encryption
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Usage limits
    daily_request_limit = models.IntegerField(default=1000, validators=[MinValueValidator(0)])
    monthly_budget_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # Usage tracking
    requests_count = models.IntegerField(default=0)
    tokens_used = models.BigIntegerField(default=0)
    cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Features (flexible JSON field)
    features = JSONField(default=list, blank=True)
    # Example: ["tts", "voice_cloning", "emotion_control"]
    
    # Metadata
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'ai_providers'
        ordering = ['name']
        indexes = [
            models.Index(fields=['provider_type', 'is_active']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.provider_type})"
    
    def can_make_request(self):
        """Check if provider can make a request based on limits."""
        if not self.is_active:
            return False
        
        # Check daily limit
        # TODO: Implement daily reset logic
        if self.requests_count >= self.daily_request_limit:
            return False
        
        # Check monthly budget
        if self.monthly_budget_usd > 0 and self.cost_usd >= self.monthly_budget_usd:
            return False
        
        return True
    
    def record_usage(self, tokens=0, cost=Decimal('0.00')):
        """Record API usage."""
        from django.utils import timezone
        
        self.requests_count += 1
        self.tokens_used += tokens
        self.cost_usd += cost
        self.last_used_at = timezone.now()
        self.save(update_fields=['requests_count', 'tokens_used', 'cost_usd', 'last_used_at'])
