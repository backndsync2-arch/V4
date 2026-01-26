"""
Authentication models for sync2gear.

Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.db.models import JSONField
from apps.common.models import TimestampedModel


class UserManager(BaseUserManager):
    """Custom user manager."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self.create_user(email, password, **extra_fields)


class Client(TimestampedModel):
    """
    Business client/organization.
    
    Each client represents a business using sync2gear.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    business_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(db_index=True)
    telephone = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    
    # Subscription Management
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('basic', 'Basic'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='basic',
        db_index=True
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('suspended', 'Suspended'),
            ('cancelled', 'Cancelled'),
            ('trial', 'Trial'),
        ],
        default='trial',
        db_index=True
    )
    subscription_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    subscription_start = models.DateField(null=True, blank=True)
    subscription_end = models.DateField(null=True, blank=True)
    trial_days = models.IntegerField(default=14)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    
    # Stripe Integration
    stripe_customer_id = models.CharField(max_length=255, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    
    # Premium Features (flexible JSON field)
    premium_features = JSONField(default=dict, blank=True)
    # Structure: {
    #   "multiFloor": true,
    #   "aiCredits": 1000,
    #   "maxFloors": 5,
    #   "maxDevices": 20,
    #   "maxStorageGB": 100
    # }
    
    # Limits
    max_devices = models.IntegerField(default=5)
    max_storage_gb = models.IntegerField(default=10)
    max_floors = models.IntegerField(default=1)  # First floor free
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['subscription_status', 'is_active']),
        ]
    
    def __str__(self):
        return self.business_name or self.name
    
    def get_premium_feature(self, feature_name, default=None):
        """Get a premium feature value."""
        return self.premium_features.get(feature_name, default)
    
    def set_premium_feature(self, feature_name, value):
        """Set a premium feature value."""
        if not self.premium_features:
            self.premium_features = {}
        self.premium_features[feature_name] = value
        self.save(update_fields=['premium_features'])


class User(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    """
    Custom user model for sync2gear.
    
    Uses email as the unique identifier instead of username.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    
    # Client relationship
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        db_index=True
    )
    
    # Floor restriction (for floor_user role)
    floor = models.ForeignKey(
        'zones.Floor',
        on_delete=models.SET_NULL,
        related_name='users',
        null=True,
        blank=True,
        db_index=True
    )
    
    # Role
    role = models.CharField(
        max_length=20,
        choices=[
            ('client', 'Client User'),      # Business user
            ('floor_user', 'Floor User'),  # Restricted to one floor
            ('staff', 'sync2gear Staff'),  # Support staff
            ('admin', 'sync2gear Admin'),  # System admin
        ],
        default='client',
        db_index=True
    )
    
    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')

    # User preferences and settings
    settings = JSONField(default=dict, blank=True)
    # Structure: {
    #   "dashboard": {
    #     "ducking": {
    #       "enabled": true,
    #       "volume": 20
    #     }
    #   }
    # }
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    
    # Timestamps
    last_seen = models.DateTimeField(null=True, blank=True)
    
    # Manager
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['client', 'role']),
            models.Index(fields=['role', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def get_full_name(self):
        return self.name
    
    def get_short_name(self):
        return self.name.split()[0] if self.name else self.email
    
    def update_last_seen(self):
        """Update the last_seen timestamp."""
        from django.utils import timezone
        self.last_seen = timezone.now()
        self.save(update_fields=['last_seen'])
