# 🎯 SYNC2GEAR - Complete Django Backend Setup Guide

## 📋 **OVERVIEW**

This guide provides complete step-by-step instructions for Cursor AI to build the entire Django REST API backend for sync2gear in one go.

**Tech Stack:**
- Django 5.0+
- Django REST Framework (DRF)
- PostgreSQL
- Django Channels (for WebSockets - real-time device communication)
- Celery (for background tasks - scheduled announcements)
- Redis (for Celery broker + caching)
- AWS S3 / Local Storage (for audio file storage)

---

## 🗂️ **DATABASE MODELS**

### **1. User & Authentication**

```python
# users/models.py
from django.contrib.auth.models.AbstractUser import AbstractUser
from django.db import models

class User(AbstractUser):
    """Extended user model with roles"""
    ROLE_CHOICES = [
        ('admin', 'Super Admin'),  # sync2gear staff
        ('client', 'Client Admin'),  # Business owner
        ('floor_user', 'Floor User'),  # Restricted to single floor
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    client = models.ForeignKey('Client', on_delete=models.CASCADE, null=True, blank=True)
    floor = models.ForeignKey('Floor', on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    class Meta:
        db_table = 'users'
```

### **2. Client (Business)**

```python
# clients/models.py
from django.db import models

class Client(models.Model):
    """Business/Organization using sync2gear"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('suspended', 'Suspended'),
    ]
    
    name = models.CharField(max_length=255)
    business_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    telephone = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    
    # Trial & Subscription
    trial_days = models.IntegerField(default=14)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    subscription_price = models.DecimalField(max_digits=10, decimal_places=2, default=49.99)
    subscription_status = models.CharField(max_length=20, default='trial')
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    
    # Premium Features
    multi_floor_enabled = models.BooleanField(default=False)
    ai_credits = models.IntegerField(default=100)
    max_floors = models.IntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'clients'
        
    def __str__(self):
        return self.name
```

### **3. Floor/Zone**

```python
# zones/models.py
from django.db import models

class Floor(models.Model):
    """Zone/Floor/Department within a business"""
    name = models.CharField(max_length=255)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='floors')
    description = models.TextField(blank=True)
    is_premium = models.BooleanField(default=False)  # First floor free, rest premium
    
    # Zone Settings
    default_volume = models.IntegerField(default=75)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'floors'
        
    def __str__(self):
        return f"{self.client.name} - {self.name}"
```

### **4. Device**

```python
# devices/models.py
from django.db import models

class Device(models.Model):
    """Physical speaker/player device"""
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
    ]
    
    name = models.CharField(max_length=255)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='devices')
    floor = models.ForeignKey('zones.Floor', on_delete=models.SET_NULL, null=True, related_name='devices')
    device_id = models.CharField(max_length=100, unique=True)  # Hardware ID
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Device Settings
    volume = models.IntegerField(default=75)
    
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'devices'
        
    def __str__(self):
        return f"{self.name} ({self.device_id})"
```

### **5. Music File**

```python
# music/models.py
from django.db import models

class MusicFile(models.Model):
    """Uploaded music tracks"""
    name = models.CharField(max_length=255)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='music_files')
    file = models.FileField(upload_to='music/%Y/%m/')
    file_size = models.BigIntegerField()  # in bytes
    duration = models.IntegerField()  # in seconds
    mime_type = models.CharField(max_length=100)
    
    # Metadata
    artist = models.CharField(max_length=255, blank=True)
    album = models.CharField(max_length=255, blank=True)
    genre = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'music_files'
        
    def __str__(self):
        return self.name
```

### **6. Announcement**

```python
# announcements/models.py
from django.db import models

class Announcement(models.Model):
    """Audio announcements (TTS or uploaded)"""
    TYPE_CHOICES = [
        ('tts', 'Text-to-Speech'),
        ('uploaded', 'Uploaded Audio'),
        ('recorded', 'Recorded'),
    ]
    
    title = models.CharField(max_length=255)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='announcements')
    
    # Content
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    text = models.TextField(blank=True)  # For TTS
    voice = models.CharField(max_length=100, blank=True)  # TTS voice ID
    audio_file = models.FileField(upload_to='announcements/%Y/%m/', null=True, blank=True)
    duration = models.IntegerField(default=0)  # seconds
    
    # Settings
    enabled = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'announcements'
        
    def __str__(self):
        return self.title
```

### **7. Channel Playlist**

```python
# playlists/models.py
from django.db import models

class ChannelPlaylist(models.Model):
    """Unified playlist combining music + announcements"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='channel_playlists')
    
    # Settings
    default_music_interval = models.IntegerField(default=5)  # minutes
    default_announcement_interval = models.IntegerField(default=15)  # minutes
    shuffle_music = models.BooleanField(default=True)
    shuffle_announcements = models.BooleanField(default=False)
    
    # Quiet Hours
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'channel_playlists'
        
    def __str__(self):
        return self.name


class ChannelPlaylistItem(models.Model):
    """Items in a channel playlist"""
    ITEM_TYPE_CHOICES = [
        ('music', 'Music'),
        ('announcement', 'Announcement'),
    ]
    
    playlist = models.ForeignKey(ChannelPlaylist, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    music_file = models.ForeignKey('music.MusicFile', on_delete=models.CASCADE, null=True, blank=True)
    announcement = models.ForeignKey('announcements.Announcement', on_delete=models.CASCADE, null=True, blank=True)
    interval_minutes = models.IntegerField(null=True, blank=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'channel_playlist_items'
        ordering = ['order']


class ChannelPlaylistFloor(models.Model):
    """Many-to-many: Playlists assigned to floors"""
    playlist = models.ForeignKey(ChannelPlaylist, on_delete=models.CASCADE)
    floor = models.ForeignKey('zones.Floor', on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'channel_playlist_floors'
        unique_together = ['playlist', 'floor']
```

### **8. Schedule**

```python
# schedules/models.py
from django.db import models

class Schedule(models.Model):
    """Automated announcement schedules"""
    SCHEDULE_TYPE_CHOICES = [
        ('interval', 'Interval-Based'),
        ('timeline', 'Timeline-Based'),
    ]
    
    name = models.CharField(max_length=255)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='schedules')
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_TYPE_CHOICES)
    enabled = models.BooleanField(default=True)
    
    # Interval-Based Settings
    interval_minutes = models.IntegerField(null=True, blank=True)
    avoid_repeat = models.BooleanField(default=True)
    
    # Timeline-Based Settings
    cycle_duration_minutes = models.IntegerField(null=True, blank=True)
    
    # Quiet Hours
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    
    # Days of Week (JSON array: [1,2,3,4,5] for Mon-Fri)
    active_days = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedules'
        
    def __str__(self):
        return self.name


class ScheduleAnnouncement(models.Model):
    """Announcements in a schedule"""
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='schedule_announcements')
    announcement = models.ForeignKey('announcements.Announcement', on_delete=models.CASCADE)
    timestamp_seconds = models.IntegerField(null=True, blank=True)  # For timeline mode
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'schedule_announcements'
        ordering = ['order']


class ScheduleDevice(models.Model):
    """Devices assigned to a schedule"""
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='schedule_devices')
    device = models.ForeignKey('devices.Device', on_delete=models.CASCADE)
    
    class Meta:
        db_table = 'schedule_devices'
        unique_together = ['schedule', 'device']
```

### **9. Play Event**

```python
# events/models.py
from django.db import models

class PlayEvent(models.Model):
    """Track announcement playback events"""
    TYPE_CHOICES = [
        ('instant', 'Instant'),
        ('scheduled', 'Scheduled'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('delivered', 'Delivered'),
        ('playing', 'Playing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    announcement = models.ForeignKey('announcements.Announcement', on_delete=models.CASCADE)
    device = models.ForeignKey('devices.Device', on_delete=models.CASCADE)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE)
    
    event_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'play_events'
        ordering = ['-created_at']
```

### **10. AI Configuration (Super Admin)**

```python
# ai_config/models.py
from django.db import models

class AIProvider(models.Model):
    """AI Provider configuration for Super Admin"""
    PROVIDER_CHOICES = [
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic'),
        ('google', 'Google AI'),
        ('elevenlabs', 'ElevenLabs'),
    ]
    
    name = models.CharField(max_length=255)
    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES)
    api_key = models.CharField(max_length=500)  # Encrypted
    is_active = models.BooleanField(default=True)
    
    # Usage Tracking
    total_requests = models.BigIntegerField(default=0)
    total_tokens = models.BigIntegerField(default=0)
    total_cost_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Limits
    daily_request_limit = models.IntegerField(default=1000)
    monthly_budget_usd = models.DecimalField(max_digits=10, decimal_places=2, default=500)
    
    last_used = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_providers'
        
    def __str__(self):
        return f"{self.name} ({self.provider})"
```

### **11. Audit Log**

```python
# audit/models.py
from django.db import models

class AuditLog(models.Model):
    """System audit trail"""
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, null=True, blank=True)
    
    action = models.CharField(max_length=100)  # create, update, delete, play, etc.
    resource = models.CharField(max_length=100)  # client, device, announcement, etc.
    resource_id = models.CharField(max_length=100)
    details = models.TextField()
    ip_address = models.GenericIPAddressField(null=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['client', '-timestamp']),
        ]
```

---

## 🔌 **API ENDPOINTS**

### **Authentication**
```
POST   /api/auth/login/
POST   /api/auth/logout/
POST   /api/auth/register/
POST   /api/auth/refresh/
GET    /api/auth/me/
```

### **Clients** (Super Admin Only)
```
GET    /api/clients/
POST   /api/clients/
GET    /api/clients/{id}/
PATCH  /api/clients/{id}/
DELETE /api/clients/{id}/
POST   /api/clients/{id}/impersonate/
```

### **Users**
```
GET    /api/users/
POST   /api/users/
GET    /api/users/{id}/
PATCH  /api/users/{id}/
DELETE /api/users/{id}/
```

### **Floors/Zones**
```
GET    /api/floors/
POST   /api/floors/
GET    /api/floors/{id}/
PATCH  /api/floors/{id}/
DELETE /api/floors/{id}/
GET    /api/floors/{id}/devices/
```

### **Devices**
```
GET    /api/devices/
POST   /api/devices/
GET    /api/devices/{id}/
PATCH  /api/devices/{id}/
DELETE /api/devices/{id}/
POST   /api/devices/{id}/control/
POST   /api/devices/{id}/volume/
POST   /api/devices/{id}/test-tone/
GET    /api/devices/{id}/status/
```

### **Music**
```
GET    /api/music/
POST   /api/music/upload/
GET    /api/music/{id}/
DELETE /api/music/{id}/
GET    /api/music/{id}/stream/
```

### **Announcements**
```
GET    /api/announcements/
POST   /api/announcements/
GET    /api/announcements/{id}/
PATCH  /api/announcements/{id}/
DELETE /api/announcements/{id}/
POST   /api/announcements/tts/generate/
POST   /api/announcements/{id}/play/
```

### **Channel Playlists**
```
GET    /api/channel-playlists/
POST   /api/channel-playlists/
GET    /api/channel-playlists/{id}/
PATCH  /api/channel-playlists/{id}/
DELETE /api/channel-playlists/{id}/
POST   /api/channel-playlists/{id}/assign-floors/
```

### **Schedules**
```
GET    /api/schedules/
POST   /api/schedules/
GET    /api/schedules/{id}/
PATCH  /api/schedules/{id}/
DELETE /api/schedules/{id}/
POST   /api/schedules/{id}/toggle/
```

### **Play Events**
```
GET    /api/play-events/
GET    /api/play-events/{id}/
```

### **AI Configuration** (Super Admin Only)
```
GET    /api/ai-providers/
POST   /api/ai-providers/
GET    /api/ai-providers/{id}/
PATCH  /api/ai-providers/{id}/
DELETE /api/ai-providers/{id}/
POST   /api/ai-providers/{id}/toggle/
```

### **Audit Logs** (Admin Only)
```
GET    /api/audit-logs/
GET    /api/audit-logs/export/
```

---

## 🔐 **PERMISSIONS**

### **Custom Permissions Class**

```python
# core/permissions.py
from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """Only sync2gear staff (super admin)"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsClientAdmin(permissions.BasePermission):
    """Client admin or super admin"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['admin', 'client']


class IsFloorUser(permissions.BasePermission):
    """Any authenticated user"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsOwnerOrAdmin(permissions.BasePermission):
    """User can only access their client's data"""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        return obj.client_id == request.user.client_id
```

---

## 📦 **CELERY TASKS**

### **Scheduled Announcement Task**

```python
# schedules/tasks.py
from celery import shared_task
from .models import Schedule, PlayEvent
from announcements.models import Announcement
from devices.models import Device

@shared_task
def process_interval_schedule(schedule_id):
    """Process interval-based schedule"""
    schedule = Schedule.objects.get(id=schedule_id)
    
    if not schedule.enabled:
        return
    
    # Check quiet hours
    from datetime import datetime
    now = datetime.now().time()
    if schedule.quiet_hours_start and schedule.quiet_hours_end:
        if schedule.quiet_hours_start <= now <= schedule.quiet_hours_end:
            return  # Skip during quiet hours
    
    # Get devices from schedule
    devices = Device.objects.filter(schedule_devices__schedule=schedule, status='online')
    
    # Get announcements
    announcements = Announcement.objects.filter(
        schedule_announcements__schedule=schedule,
        enabled=True
    )
    
    # Create play events
    for device in devices:
        # Logic to avoid repeating same announcement
        announcement = announcements.order_by('?').first()  # Random
        
        PlayEvent.objects.create(
            announcement=announcement,
            device=device,
            client=schedule.client,
            event_type='scheduled',
            status='pending',
            created_by=schedule.created_by
        )
        
        # Send to device via WebSocket
        send_to_device.delay(device.id, announcement.id)
```

### **TTS Generation Task**

```python
# announcements/tasks.py
from celery import shared_task
import requests
from django.conf import settings

@shared_task
def generate_tts_audio(announcement_id):
    """Generate TTS audio using AI provider"""
    from .models import Announcement
    from ai_config.models import AIProvider
    
    announcement = Announcement.objects.get(id=announcement_id)
    
    # Get active TTS provider (ElevenLabs)
    provider = AIProvider.objects.filter(
        provider='elevenlabs',
        is_active=True
    ).first()
    
    if not provider:
        return
    
    # Call ElevenLabs API
    response = requests.post(
        'https://api.elevenlabs.io/v1/text-to-speech/...',
        headers={'xi-api-key': provider.api_key},
        json={
            'text': announcement.text,
            'voice': announcement.voice
        }
    )
    
    if response.status_code == 200:
        # Save audio file
        from django.core.files.base import ContentFile
        announcement.audio_file.save(
            f'announcement_{announcement.id}.mp3',
            ContentFile(response.content)
        )
        announcement.save()
        
        # Update provider usage
        provider.total_requests += 1
        provider.save()
```

---

## 🌐 **WEBSOCKETS (Django Channels)**

### **Consumer for Real-Time Device Communication**

```python
# devices/consumers.py
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class DeviceConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket consumer for device communication"""
    
    async def connect(self):
        self.device_id = self.scope['url_route']['kwargs']['device_id']
        self.room_group_name = f'device_{self.device_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Update device status to online
        await self.update_device_status('online')
    
    async def disconnect(self, close_code):
        # Update device status to offline
        await self.update_device_status('offline')
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """Receive message from device"""
        message_type = content.get('type')
        
        if message_type == 'status_update':
            await self.handle_status_update(content)
        elif message_type == 'playback_complete':
            await self.handle_playback_complete(content)
    
    async def play_announcement(self, event):
        """Send announcement to device"""
        await self.send_json({
            'type': 'play_announcement',
            'announcement_id': event['announcement_id'],
            'audio_url': event['audio_url'],
            'volume': event['volume']
        })
    
    @database_sync_to_async
    def update_device_status(self, status):
        from .models import Device
        device = Device.objects.get(device_id=self.device_id)
        device.status = status
        device.save()
```

### **Routing**

```python
# core/routing.py
from django.urls import re_path
from devices.consumers import DeviceConsumer

websocket_urlpatterns = [
    re_path(r'ws/devices/(?P<device_id>\w+)/$', DeviceConsumer.as_asgi()),
]
```

---

## 📁 **PROJECT STRUCTURE**

```
backend/
├── manage.py
├── requirements.txt
├── core/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── routing.py
│   └── permissions.py
├── users/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── clients/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── zones/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── devices/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── consumers.py
│   └── urls.py
├── music/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── announcements/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── tasks.py
│   └── urls.py
├── playlists/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── schedules/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── tasks.py
│   └── urls.py
├── events/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
├── ai_config/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
└── audit/
    ├── models.py
    ├── serializers.py
    ├── views.py
    └── urls.py
```

---

## 📦 **REQUIREMENTS.TXT**

```
Django==5.0.1
djangorestframework==3.14.0
django-cors-headers==4.3.1
psycopg2-binary==2.9.9
Pillow==10.1.0
channels==4.0.0
channels-redis==4.1.0
celery==5.3.4
redis==5.0.1
django-celery-beat==2.5.0
boto3==1.34.10
python-dotenv==1.0.0
gunicorn==21.2.0
dj-database-url==2.1.0
whitenoise==6.6.0
djangorestframework-simplejwt==5.3.1
cryptography==41.0.7
mutagen==1.47.0
```

---

## ⚙️ **SETTINGS.PY CONFIGURATION**

```python
# core/settings.py

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')

DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'django_celery_beat',
    
    # Local apps
    'users',
    'clients',
    'zones',
    'devices',
    'music',
    'announcements',
    'playlists',
    'schedules',
    'events',
    'ai_config',
    'audit',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTH_USER_MODEL = 'users.User'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# CORS
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL', 'postgresql://user:pass@localhost:5432/sync2gear'),
        conn_max_age=600
    )
}

# Channels
ASGI_APPLICATION = 'core.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [(os.environ.get('REDIS_HOST', 'localhost'), 6379)],
        },
    },
}

# Celery
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# File Storage
if os.environ.get('USE_S3', 'False') == 'True':
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'us-east-1')
else:
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    MEDIA_URL = '/media/'

# Static files
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

---

## 🚀 **DEPLOYMENT COMMANDS**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/sync2gear"
export SECRET_KEY="your-secret-key"
export DEBUG="False"

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Run development server
python manage.py runserver

# Run Celery worker (separate terminal)
celery -A core worker -l info

# Run Celery beat (separate terminal)
celery -A core beat -l info

# Run Channels/Daphne (production)
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

---

## ✅ **CURSOR AI CHECKLIST**

Use Cursor AI to generate:

1. ✅ All database models with proper relationships
2. ✅ All DRF serializers
3. ✅ All ViewSets with proper permissions
4. ✅ All URL routing
5. ✅ Celery tasks for schedules and TTS
6. ✅ WebSocket consumers for devices
7. ✅ Permissions classes
8. ✅ Settings configuration
9. ✅ requirements.txt
10. ✅ Migration files
11. ✅ Admin panel configuration
12. ✅ API documentation (OpenAPI/Swagger)

---

## 🎯 **FINAL NOTES FOR CURSOR AI**

1. **Generate all models first** - Ensure foreign key relationships are correct
2. **Create serializers** - Include nested serializers for related objects
3. **Build ViewSets** - Use ModelViewSet with proper filtering
4. **Add permissions** - Restrict by role and client ownership
5. **Implement Celery tasks** - For scheduled announcements and TTS generation
6. **Setup WebSockets** - For real-time device communication
7. **Add file upload handling** - For music and announcement audio
8. **Implement audit logging** - Track all important actions
9. **Add API documentation** - Use drf-spectacular for Swagger docs
10. **Test endpoints** - Create test cases for all major features

**This guide provides EVERYTHING needed for Cursor AI to build the complete Django backend in one go!**
