# sync2gear Django Backend - Complete Architecture

**Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.**

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Permissions](#authentication--permissions)
7. [File Storage & Media](#file-storage--media)
8. [Real-time Features](#real-time-features)
9. [Scheduled Tasks](#scheduled-tasks)
10. [Deployment](#deployment)
11. [Cursor AI Implementation Guide](#cursor-ai-implementation-guide)

---

## 🎯 Project Overview

sync2gear is a music and announcements management system for businesses that handles:
- Music library management with folders and metadata
- Announcement creation (TTS, upload, recording)
- Scheduling system (interval and timeline-based)
- Multi-zone playback control
- Real-time device synchronization
- Admin dashboard for client management

---

## 🛠️ Technology Stack

### Core Framework
- **Django 5.0+** - Web framework
- **Django REST Framework (DRF) 3.14+** - API framework
- **Django Channels 4.0+** - WebSocket support

### Database & Caching
- **PostgreSQL 15+** - Primary database
- **Redis 7.0+** - Caching & real-time messaging

### Task Queue
- **Celery 5.3+** - Background tasks
- **Celery Beat** - Scheduled tasks

### Storage
- **AWS S3** - Media file storage
- **CloudFront** - CDN for media delivery

### Authentication
- **djangorestframework-simplejwt** - JWT tokens
- **django-cors-headers** - CORS handling

### Additional Libraries
- **Pillow** - Image processing
- **mutagen** - Audio metadata extraction
- **google-cloud-texttospeech** - TTS generation
- **django-storages** - S3 integration
- **channels-redis** - WebSocket channel layer
- **psycopg2-binary** - PostgreSQL adapter
- **gunicorn** - Production WSGI server
- **daphne** - Production ASGI server

---

## 📁 Project Structure

```
sync2gear_backend/
├── manage.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .env
│
├── config/                      # Project settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py             # Base settings
│   │   ├── development.py       # Dev settings
│   │   └── production.py        # Prod settings
│   ├── urls.py                  # Root URL config
│   ├── asgi.py                  # ASGI config (WebSocket)
│   └── wsgi.py                  # WSGI config
│
├── apps/
│   ├── __init__.py
│   │
│   ├── authentication/          # User authentication
│   │   ├── __init__.py
│   │   ├── models.py           # User, Client models
│   │   ├── serializers.py      # User serializers
│   │   ├── views.py            # Auth endpoints
│   │   ├── permissions.py      # Custom permissions
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── music/                   # Music library
│   │   ├── __init__.py
│   │   ├── models.py           # MusicFile, Folder models
│   │   ├── serializers.py
│   │   ├── views.py            # Music CRUD
│   │   ├── tasks.py            # Metadata extraction
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── announcements/           # Announcements
│   │   ├── __init__.py
│   │   ├── models.py           # Announcement, Folder models
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── tasks.py            # TTS generation
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── scheduler/               # Schedule engine
│   │   ├── __init__.py
│   │   ├── models.py           # Schedule model
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── tasks.py            # Schedule execution
│   │   ├── engine.py           # Schedule engine logic
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── zones/                   # Zones & devices
│   │   ├── __init__.py
│   │   ├── models.py           # Zone, Device models
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   ├── playback/                # Playback control
│   │   ├── __init__.py
│   │   ├── models.py           # PlaybackState model
│   │   ├── serializers.py
│   │   ├── views.py            # Playback endpoints
│   │   ├── consumers.py        # WebSocket consumers
│   │   ├── engine.py           # Playback engine
│   │   ├── urls.py
│   │   └── tests.py
│   │
│   └── admin_panel/             # Admin features
│       ├── __init__.py
│       ├── views.py            # Admin endpoints
│       ├── serializers.py
│       ├── urls.py
│       └── tests.py
│
├── common/                      # Shared utilities
│   ├── __init__.py
│   ├── models.py               # Base models
│   ├── permissions.py          # Shared permissions
│   ├── utils.py
│   └── validators.py
│
└── static/                      # Static files
    └── media/                   # Local media (dev only)
```

---

## 🗄️ Database Models

### 1. Authentication App (`apps/authentication/models.py`)

```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from common.models import TimestampedModel

class Client(TimestampedModel):
    """Business client/organization"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    
    # Subscription
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('basic', 'Basic'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='basic'
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('suspended', 'Suspended'),
            ('cancelled', 'Cancelled'),
        ],
        default='active'
    )
    subscription_start = models.DateField(null=True, blank=True)
    subscription_end = models.DateField(null=True, blank=True)
    
    # Limits
    max_devices = models.IntegerField(default=5)
    max_storage_gb = models.IntegerField(default=10)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']

class User(AbstractBaseUser, PermissionsMixin, TimestampedModel):
    """Custom user model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    
    # Client relationship
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True
    )
    
    # Role
    role = models.CharField(
        max_length=20,
        choices=[
            ('client', 'Client User'),      # Business user
            ('staff', 'sync2gear Staff'),   # Support staff
            ('admin', 'sync2gear Admin'),   # System admin
        ],
        default='client'
    )
    
    # Profile
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
```

### 2. Music App (`apps/music/models.py`)

```python
from django.db import models
from common.models import TimestampedModel

class Folder(TimestampedModel):
    """Music folder/playlist"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    type = models.CharField(
        max_length=20,
        choices=[('music', 'Music'), ('announcement', 'Announcement')],
        default='music'
    )
    
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='folders'
    )
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_folders'
    )
    
    # Metadata
    cover_image = models.ImageField(upload_to='folder_covers/', null=True, blank=True)
    is_system = models.BooleanField(default=False)  # System playlists
    
    class Meta:
        db_table = 'folders'
        ordering = ['name']

class MusicFile(TimestampedModel):
    """Music track"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File
    file = models.FileField(upload_to='music/')
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # bytes
    
    # Metadata
    title = models.CharField(max_length=255)
    artist = models.CharField(max_length=255, blank=True)
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
        related_name='music_files'
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='music_files'
    )
    uploaded_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True
    )
    
    # Ordering
    order = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'music_files'
        ordering = ['folder', 'order', 'title']
```

### 3. Announcements App (`apps/announcements/models.py`)

```python
from django.db import models
from common.models import TimestampedModel

class Announcement(TimestampedModel):
    """Announcement audio file"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=255)
    
    # Audio file
    file = models.FileField(upload_to='announcements/')
    duration = models.IntegerField()  # seconds
    file_size = models.BigIntegerField()  # bytes
    
    # TTS info (if generated)
    is_tts = models.BooleanField(default=False)
    tts_text = models.TextField(blank=True)
    tts_voice = models.CharField(max_length=50, blank=True)
    
    # Recording info
    is_recording = models.BooleanField(default=False)
    
    # Relationships
    folder = models.ForeignKey(
        'music.Folder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements'
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='announcements'
    )
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']
```

### 4. Scheduler App (`apps/scheduler/models.py`)

```python
from django.db import models
from django.contrib.postgres.fields import ArrayField
from common.models import TimestampedModel

class Schedule(TimestampedModel):
    """Scheduled playback event"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255)
    
    # Type
    type = models.CharField(
        max_length=20,
        choices=[
            ('music', 'Music Playlist'),
            ('announcement', 'Announcement'),
        ]
    )
    
    # Content
    content_type = models.CharField(
        max_length=20,
        choices=[
            ('folder', 'Folder'),
            ('announcement', 'Single Announcement'),
        ]
    )
    folder = models.ForeignKey(
        'music.Folder',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='schedules'
    )
    announcement = models.ForeignKey(
        'announcements.Announcement',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='schedules'
    )
    
    # Schedule mode
    mode = models.CharField(
        max_length=20,
        choices=[
            ('interval', 'Interval-based'),
            ('timeline', 'Timeline-based'),
        ]
    )
    
    # Interval settings
    interval_minutes = models.IntegerField(null=True, blank=True)
    interval_type = models.CharField(
        max_length=20,
        choices=[
            ('tracks', 'After X tracks'),
            ('time', 'Every X minutes'),
        ],
        null=True,
        blank=True
    )
    
    # Timeline settings
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    # Days of week (0=Monday, 6=Sunday)
    days_of_week = ArrayField(
        models.IntegerField(),
        default=list,
        blank=True
    )
    
    # Target zones
    zones = models.ManyToManyField('zones.Zone', related_name='schedules')
    
    # Priority (higher = more important)
    priority = models.IntegerField(default=0)
    
    # State
    is_active = models.BooleanField(default=True)
    
    # Relationships
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'schedules'
        ordering = ['-priority', 'name']
```

### 5. Zones App (`apps/zones/models.py`)

```python
from django.db import models
from common.models import TimestampedModel

class Zone(TimestampedModel):
    """Physical zone/area"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Settings
    default_volume = models.IntegerField(default=70)
    
    # Relationships
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='zones'
    )
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'zones'
        ordering = ['name']

class Device(TimestampedModel):
    """Playback device"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=50)  # speaker, tablet, etc.
    
    # Hardware info
    device_id = models.CharField(max_length=255, unique=True)  # Unique hardware ID
    model = models.CharField(max_length=100, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True)
    
    # Connection
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    
    # Settings
    volume = models.IntegerField(default=70)
    
    # Relationships
    zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    client = models.ForeignKey(
        'authentication.Client',
        on_delete=models.CASCADE,
        related_name='devices'
    )
    
    class Meta:
        db_table = 'devices'
        ordering = ['zone', 'name']
```

### 6. Playback App (`apps/playback/models.py`)

```python
from django.db import models
from django.contrib.postgres.fields import ArrayField, JSONField
from common.models import TimestampedModel

class PlaybackState(TimestampedModel):
    """Current playback state for a zone"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    zone = models.OneToOneField(
        'zones.Zone',
        on_delete=models.CASCADE,
        related_name='playback_state'
    )
    
    # Current track
    current_track = models.ForeignKey(
        'music.MusicFile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Queue
    queue = ArrayField(
        models.UUIDField(),
        default=list,
        blank=True
    )
    queue_position = models.IntegerField(default=0)
    
    # State
    is_playing = models.BooleanField(default=False)
    position = models.IntegerField(default=0)  # Current position in seconds
    volume = models.IntegerField(default=70)
    
    # Playlist info
    current_playlists = ArrayField(
        models.UUIDField(),
        default=list,
        blank=True
    )
    shuffle = models.BooleanField(default=False)
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'playback_states'
```

### Common Models (`common/models.py`)

```python
import uuid
from django.db import models

class TimestampedModel(models.Model):
    """Abstract base model with timestamps"""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup/` | Register new user | No |
| POST | `/auth/login/` | Login user | No |
| POST | `/auth/logout/` | Logout user | Yes |
| POST | `/auth/refresh/` | Refresh access token | No |
| GET | `/auth/me/` | Get current user | Yes |
| PATCH | `/auth/me/` | Update profile | Yes |
| POST | `/auth/change-password/` | Change password | Yes |
| POST | `/auth/password-reset/` | Request password reset | No |
| POST | `/auth/password-reset/confirm/` | Confirm password reset | No |

### Music Library (`/api/music/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/music/folders/` | List all folders | Yes |
| POST | `/music/folders/` | Create folder | Yes |
| GET | `/music/folders/{id}/` | Get folder detail | Yes |
| PATCH | `/music/folders/{id}/` | Update folder | Yes |
| DELETE | `/music/folders/{id}/` | Delete folder | Yes |
| POST | `/music/folders/{id}/reorder/` | Reorder tracks | Yes |
| GET | `/music/files/` | List music files | Yes |
| POST | `/music/upload/` | Upload music file | Yes |
| GET | `/music/files/{id}/` | Get music detail | Yes |
| PATCH | `/music/files/{id}/` | Update metadata | Yes |
| DELETE | `/music/files/{id}/` | Delete music file | Yes |
| POST | `/music/files/{id}/cover/` | Upload cover art | Yes |
| GET | `/music/search/` | Search music | Yes |

### Announcements (`/api/announcements/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/announcements/` | List announcements | Yes |
| POST | `/announcements/tts/` | Create TTS announcement | Yes |
| POST | `/announcements/upload/` | Upload announcement | Yes |
| GET | `/announcements/{id}/` | Get announcement | Yes |
| PATCH | `/announcements/{id}/` | Update announcement | Yes |
| DELETE | `/announcements/{id}/` | Delete announcement | Yes |
| POST | `/announcements/{id}/play-instant/` | Play instantly | Yes |

### Scheduler (`/api/schedules/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/schedules/` | List schedules | Yes |
| POST | `/schedules/` | Create schedule | Yes |
| GET | `/schedules/{id}/` | Get schedule | Yes |
| PATCH | `/schedules/{id}/` | Update schedule | Yes |
| DELETE | `/schedules/{id}/` | Delete schedule | Yes |
| POST | `/schedules/{id}/toggle/` | Toggle active state | Yes |

### Zones & Devices (`/api/zones/`, `/api/devices/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/zones/` | List zones | Yes |
| POST | `/zones/` | Create zone | Yes |
| GET | `/zones/{id}/` | Get zone | Yes |
| PATCH | `/zones/{id}/` | Update zone | Yes |
| DELETE | `/zones/{id}/` | Delete zone | Yes |
| GET | `/devices/` | List devices | Yes |
| POST | `/devices/register/` | Register device | Yes |
| GET | `/devices/{id}/` | Get device | Yes |
| PATCH | `/devices/{id}/` | Update device | Yes |
| DELETE | `/devices/{id}/` | Delete device | Yes |
| POST | `/devices/{id}/volume/` | Set volume | Yes |

### Playback Control (`/api/playback/`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/playback/state/` | Get playback state | Yes |
| POST | `/playback/play/` | Start playback | Yes |
| POST | `/playback/pause/` | Pause playback | Yes |
| POST | `/playback/resume/` | Resume playback | Yes |
| POST | `/playback/next/` | Next track | Yes |
| POST | `/playback/previous/` | Previous track | Yes |
| POST | `/playback/volume/` | Set volume | Yes |
| POST | `/playback/seek/` | Seek to position | Yes |

### Admin (`/api/admin/`)

| Method | Endpoint | Description | Auth Required | Permission |
|--------|----------|-------------|---------------|------------|
| GET | `/admin/clients/` | List clients | Yes | Admin |
| POST | `/admin/clients/` | Create client | Yes | Admin |
| PATCH | `/admin/clients/{id}/` | Update client | Yes | Admin |
| DELETE | `/admin/clients/{id}/` | Delete client | Yes | Admin |
| GET | `/admin/users/` | List users | Yes | Admin |
| POST | `/admin/users/` | Create user | Yes | Admin |
| PATCH | `/admin/users/{id}/` | Update user | Yes | Admin |
| DELETE | `/admin/users/{id}/` | Delete user | Yes | Admin |
| GET | `/admin/stats/` | System statistics | Yes | Admin |

---

## 🔐 Authentication & Permissions

### JWT Authentication

Use `djangorestframework-simplejwt` for JWT tokens:

```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

### Custom Permissions

```python
# common/permissions.py

from rest_framework import permissions

class IsClientUser(permissions.BasePermission):
    """Allow only client users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'client'

class IsStaffOrAdmin(permissions.BasePermission):
    """Allow staff and admin users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['staff', 'admin']

class IsAdmin(permissions.BasePermission):
    """Allow only admin users"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow owners to edit, others to read"""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.client == request.user.client

class IsSameClient(permissions.BasePermission):
    """Restrict to same client"""
    def has_object_permission(self, request, view, obj):
        return obj.client == request.user.client
```

---

## 📦 File Storage & Media

### AWS S3 Configuration

```python
# settings/production.py

AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
AWS_DEFAULT_ACL = 'private'
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour

# Static and media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'

MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
```

### Audio Metadata Extraction

```python
# apps/music/tasks.py

from celery import shared_task
from mutagen import File as MutagenFile
from PIL import Image
import io

@shared_task
def extract_metadata(music_file_id):
    """Extract metadata from uploaded music file"""
    from apps.music.models import MusicFile
    
    music = MusicFile.objects.get(id=music_file_id)
    
    try:
        audio = MutagenFile(music.file.path)
        
        # Extract metadata
        if audio:
            music.duration = int(audio.info.length)
            music.title = music.title or audio.get('title', [''])[0] or music.filename
            music.artist = audio.get('artist', [''])[0]
            music.album = audio.get('album', [''])[0]
            music.genre = audio.get('genre', [''])[0]
            
            # Extract cover art
            if hasattr(audio, 'pictures') and audio.pictures:
                picture = audio.pictures[0]
                image = Image.open(io.BytesIO(picture.data))
                # Save image...
            
        music.save()
    except Exception as e:
        print(f"Metadata extraction error: {e}")
```

### TTS Generation

```python
# apps/announcements/tasks.py

from celery import shared_task
from google.cloud import texttospeech
from django.core.files.base import ContentFile

@shared_task
def generate_tts(announcement_id):
    """Generate TTS audio from text"""
    from apps.announcements.models import Announcement
    
    announcement = Announcement.objects.get(id=announcement_id)
    
    client = texttospeech.TextToSpeechClient()
    
    synthesis_input = texttospeech.SynthesisInput(text=announcement.tts_text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name=announcement.tts_voice or "en-US-Neural2-C"
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    
    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )
    
    # Save audio file
    filename = f"{announcement.id}.mp3"
    announcement.file.save(filename, ContentFile(response.audio_content))
    announcement.save()
```

---

## ⚡ Real-time Features (WebSocket)

### Channel Layers Configuration

```python
# settings.py

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [(env('REDIS_HOST', default='localhost'), 6379)],
        },
    },
}
```

### WebSocket Consumers

```python
# apps/playback/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class PlaybackConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.zone_id = self.scope['url_route']['kwargs']['zone_id']
        self.room_group_name = f'playback_{self.zone_id}'
        
        # Join zone group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current state
        state = await self.get_playback_state()
        await self.send(text_data=json.dumps(state))
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Handle commands from client
        
    async def playback_update(self, event):
        """Send playback updates to WebSocket"""
        await self.send(text_data=json.dumps(event['data']))
    
    @database_sync_to_async
    def get_playback_state(self):
        from apps.playback.models import PlaybackState
        state = PlaybackState.objects.get(zone_id=self.zone_id)
        return {
            'type': 'playback_state',
            'is_playing': state.is_playing,
            'current_track': str(state.current_track_id) if state.current_track else None,
            'position': state.position,
            'volume': state.volume,
        }
```

### Routing

```python
# config/asgi.py

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from apps.playback import routing as playback_routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            playback_routing.websocket_urlpatterns
        )
    ),
})
```

```python
# apps/playback/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/playback/(?P<zone_id>[0-9a-f-]+)/$', consumers.PlaybackConsumer.as_asgi()),
]
```

---

## ⏰ Scheduled Tasks (Celery)

### Celery Configuration

```python
# config/celery.py

from celery import Celery
from celery.schedules import crontab

app = Celery('sync2gear')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-schedules': {
        'task': 'apps.scheduler.tasks.check_schedules',
        'schedule': 60.0,  # Every minute
    },
    'cleanup-expired-sessions': {
        'task': 'apps.authentication.tasks.cleanup_sessions',
        'schedule': crontab(hour=3, minute=0),  # 3 AM daily
    },
}
```

### Schedule Engine

```python
# apps/scheduler/tasks.py

from celery import shared_task
from django.utils import timezone
from datetime import datetime, time
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@shared_task
def check_schedules():
    """Check and execute due schedules"""
    from apps.scheduler.models import Schedule
    from apps.playback.engine import PlaybackEngine
    
    now = timezone.now()
    current_time = now.time()
    current_weekday = now.weekday()
    
    active_schedules = Schedule.objects.filter(is_active=True)
    
    for schedule in active_schedules:
        # Check if schedule should run
        if current_weekday not in schedule.days_of_week:
            continue
            
        if schedule.mode == 'timeline':
            if schedule.start_time <= current_time <= schedule.end_time:
                execute_schedule(schedule)
        
        elif schedule.mode == 'interval':
            # Check interval logic
            should_play = check_interval_schedule(schedule)
            if should_play:
                execute_schedule(schedule)

def execute_schedule(schedule):
    """Execute a schedule"""
    from apps.playback.engine import PlaybackEngine
    
    for zone in schedule.zones.all():
        if schedule.type == 'music':
            # Start playlist
            PlaybackEngine.start_playlist(
                zone_id=zone.id,
                playlist_id=schedule.folder_id
            )
        elif schedule.type == 'announcement':
            # Play announcement
            PlaybackEngine.play_announcement(
                zone_id=zone.id,
                announcement_id=schedule.announcement_id
            )
```

---

## 🚀 Deployment

### Docker Configuration

```dockerfile
# Dockerfile

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "config.wsgi:application"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: sync2gear
      POSTGRES_USER: sync2gear
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    volumes:
      - .:/app
      - static_volume:/app/static
      - media_volume:/app/media
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db
      - redis

  websocket:
    build: .
    command: daphne -b 0.0.0.0 -p 8001 config.asgi:application
    volumes:
      - .:/app
    ports:
      - "8001:8001"
    env_file:
      - .env
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A config worker -l info
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A config beat -l info
    volumes:
      - .:/app
    env_file:
      - .env
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

### Requirements

```txt
# requirements.txt

Django==5.0.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
django-environ==0.11.2
django-storages==1.14.2
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0

# Database
psycopg2-binary==2.9.9

# Celery
celery==5.3.4
redis==5.0.1

# AWS
boto3==1.34.18

# Audio processing
mutagen==1.47.0
Pillow==10.2.0

# Google Cloud TTS
google-cloud-texttospeech==2.16.0

# Production server
gunicorn==21.2.0
```

### Environment Variables

```bash
# .env.example

# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=api.sync2gear.com,localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sync2gear

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=sync2gear-media
AWS_S3_REGION_NAME=us-east-1

# Google Cloud (TTS)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# CORS
CORS_ALLOWED_ORIGINS=https://app.sync2gear.com,http://localhost:5173

# JWT
JWT_SECRET_KEY=your-jwt-secret

# Email (for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@sync2gear.com
EMAIL_HOST_PASSWORD=your-email-password
```

---

## 🤖 Cursor AI Implementation Guide

### Step 1: Project Setup

**Prompt for Cursor AI:**

```
Create a new Django project called "sync2gear_backend" with the following structure:

1. Initialize Django project with settings split (base, development, production)
2. Create apps: authentication, music, announcements, scheduler, zones, playback, admin_panel, common
3. Install all dependencies from requirements.txt
4. Configure PostgreSQL database
5. Configure Redis for caching and channels
6. Set up django-cors-headers for frontend communication
7. Configure AWS S3 for media storage
8. Set up Celery with Redis backend
9. Configure Django Channels for WebSocket support

Use environment variables for all sensitive configuration.
Create .env.example file with all required variables.
```

### Step 2: Database Models

**Prompt for Cursor AI:**

```
Implement all database models exactly as specified in the DJANGO_BACKEND_ARCHITECTURE.md file:

1. Create Client model in authentication app
2. Create custom User model extending AbstractBaseUser in authentication app
3. Create Folder and MusicFile models in music app
4. Create Announcement model in announcements app
5. Create Schedule model with PostgreSQL ArrayField in scheduler app
6. Create Zone and Device models in zones app
7. Create PlaybackState model in playback app
8. Create TimestampedModel base class in common app

All models should use UUID primary keys.
Include proper relationships, indexes, and constraints.
Add __str__ methods for admin interface.
Create migrations after implementing models.
```

### Step 3: Serializers

**Prompt for Cursor AI:**

```
Create DRF serializers for all models:

1. User and Client serializers (authentication app)
2. Folder and MusicFile serializers (music app)
3. Announcement serializer (announcements app)
4. Schedule serializer with nested zone data (scheduler app)
5. Zone and Device serializers (zones app)
6. PlaybackState serializer (playback app)

Include:
- Nested serializers where appropriate
- Read-only fields for computed values
- Custom validation methods
- SerializerMethodField for complex data
```

### Step 4: Permissions

**Prompt for Cursor AI:**

```
Implement custom permission classes in common/permissions.py:

1. IsClientUser - allows only client role users
2. IsStaffOrAdmin - allows staff and admin roles
3. IsAdmin - allows only admin role
4. IsOwnerOrReadOnly - owners can edit, others read-only
5. IsSameClient - restrict access to same client data

These permissions should check user.role and user.client.
```

### Step 5: Authentication Views

**Prompt for Cursor AI:**

```
Create authentication views in authentication/views.py:

1. SignUpView - register new users and create client
2. LoginView - JWT token generation
3. LogoutView - invalidate refresh token
4. RefreshTokenView - get new access token
5. CurrentUserView - get/update current user profile
6. ChangePasswordView - change user password
7. PasswordResetRequestView - request password reset email
8. PasswordResetConfirmView - confirm password reset with token

Use djangorestframework-simplejwt for JWT.
Return user data along with tokens on login/signup.
Implement proper validation and error handling.
```

### Step 6: Music Library Views

**Prompt for Cursor AI:**

```
Create music library views in music/views.py:

1. FolderViewSet - CRUD operations for folders
2. MusicFileViewSet - CRUD operations for music files
3. MusicUploadView - handle file upload with metadata extraction
4. BatchUploadView - handle multiple file uploads
5. CoverArtUploadView - upload cover art for music files
6. ReorderTracksView - reorder tracks within folder
7. MusicSearchView - search music by title, artist, album

Features:
- Filter music files by folder
- Extract metadata using mutagen (async with Celery)
- Handle large file uploads with progress
- Generate thumbnails for cover art
- Implement proper file validation
```

### Step 7: Announcements Views

**Prompt for Cursor AI:**

```
Create announcements views in announcements/views.py:

1. AnnouncementViewSet - CRUD for announcements
2. TTSGenerateView - generate TTS from text using Google Cloud TTS
3. AnnouncementUploadView - upload audio files
4. InstantPlayView - trigger instant announcement playback

Features:
- Validate audio file formats (mp3, wav, m4a)
- Generate TTS asynchronously with Celery
- Calculate audio duration
- Support recording upload (webm format)
```

### Step 8: Scheduler Views & Engine

**Prompt for Cursor AI:**

```
Create scheduler views and engine:

Views (scheduler/views.py):
1. ScheduleViewSet - CRUD for schedules
2. ToggleScheduleView - activate/deactivate schedule

Engine (scheduler/engine.py):
1. ScheduleChecker - check if schedule should execute
2. IntervalCalculator - calculate interval-based execution
3. TimelineChecker - check timeline-based execution

Tasks (scheduler/tasks.py):
1. check_schedules - Celery Beat task running every minute
2. execute_schedule - execute a schedule (play music/announcement)

Handle:
- Day of week filtering
- Priority system
- Multi-zone targeting
- Both interval and timeline modes
```

### Step 9: Zones & Devices Views

**Prompt for Cursor AI:**

```
Create zones and devices views:

1. ZoneViewSet - CRUD for zones
2. DeviceViewSet - CRUD for devices
3. DeviceRegisterView - register new device with hardware ID
4. DeviceVolumeView - set device volume
5. DeviceHeartbeatView - update device last_seen and is_online status

Features:
- Auto-update device online status
- Validate hardware IDs are unique
- Support device discovery
```

### Step 10: Playback Control

**Prompt for Cursor AI:**

```
Create playback control system:

Views (playback/views.py):
1. PlaybackStateView - get current state for zone
2. PlayView - start playback with playlists
3. PauseView - pause playback
4. ResumeView - resume playback
5. NextTrackView - skip to next
6. PreviousTrackView - previous track
7. VolumeView - set volume
8. SeekView - seek to position

Engine (playback/engine.py):
1. PlaybackEngine class with methods:
   - start_playlist() - initialize playback queue
   - build_queue() - build track queue from playlists
   - shuffle_queue() - shuffle tracks
   - next_track() - advance to next track
   - handle_announcement() - interrupt for announcement
   - update_state() - persist state to database
   - broadcast_state() - send WebSocket update

WebSocket Consumer (playback/consumers.py):
1. PlaybackConsumer - real-time playback updates
2. Broadcast state changes to connected clients
3. Handle commands from clients

Features:
- Continuous playback (never stops)
- Multi-playlist support
- Shuffle mode
- Announcement interruption with resume
- Real-time synchronization
```

### Step 11: Admin Panel Views

**Prompt for Cursor AI:**

```
Create admin panel views (admin only):

1. ClientViewSet - manage all clients
2. UserManagementViewSet - manage all users
3. SystemStatsView - system statistics
4. ClientStorageView - track storage usage per client
5. DeviceStatusView - all devices status across clients

Features:
- Client subscription management
- User role management
- Storage quota enforcement
- System-wide analytics
```

### Step 12: WebSocket Setup

**Prompt for Cursor AI:**

```
Configure Django Channels for WebSocket:

1. Set up ASGI application in config/asgi.py
2. Configure channel layers with Redis in settings
3. Create WebSocket routing in playback/routing.py
4. Implement PlaybackConsumer with:
   - Connection authentication using JWT
   - Group messaging per zone
   - Playback state broadcasting
   - Command handling from clients

URL pattern: ws/playback/{zone_id}/
```

### Step 13: Celery Tasks

**Prompt for Cursor AI:**

```
Implement all Celery tasks:

music/tasks.py:
- extract_metadata() - extract audio metadata with mutagen
- generate_waveform() - generate waveform visualization

announcements/tasks.py:
- generate_tts() - Google Cloud TTS generation
- process_recording() - process recorded audio

scheduler/tasks.py:
- check_schedules() - run every minute via Celery Beat
- execute_schedule() - execute individual schedule

authentication/tasks.py:
- cleanup_expired_sessions() - daily cleanup
- send_password_reset_email() - send reset emails

Configure Celery Beat schedule in config/celery.py
```

### Step 14: File Upload Handling

**Prompt for Cursor AI:**

```
Implement robust file upload handling:

1. Create custom file validators in common/validators.py
   - validate_audio_file()
   - validate_image_file()
   - validate_file_size()

2. Configure AWS S3 storage in settings/production.py
   - Set up boto3 credentials
   - Configure bucket and regions
   - Set file permissions and ACLs

3. Create upload views with:
   - Progress tracking
   - File validation
   - Automatic metadata extraction
   - Error handling and rollback

4. Implement chunked upload for large files
5. Generate pre-signed URLs for secure downloads
```

### Step 15: Testing

**Prompt for Cursor AI:**

```
Create comprehensive tests for all apps:

1. Model tests - test all model methods and relationships
2. Serializer tests - test validation and data transformation
3. View tests - test all API endpoints
4. Permission tests - test access control
5. WebSocket tests - test real-time features
6. Task tests - test Celery tasks

Use pytest-django and factory_boy for test data.
Aim for >80% code coverage.
Create fixtures for common test scenarios.
```

### Step 16: API Documentation

**Prompt for Cursor AI:**

```
Add API documentation using drf-spectacular:

1. Install drf-spectacular
2. Configure schema generation in settings
3. Add OpenAPI schema decorators to all views
4. Add example requests/responses
5. Document all query parameters
6. Set up Swagger UI at /api/docs/
7. Set up ReDoc at /api/redoc/

Include authentication requirements in docs.
```

### Step 17: Deployment Configuration

**Prompt for Cursor AI:**

```
Create production deployment configuration:

1. Set up Dockerfile for web and websocket servers
2. Create docker-compose.yml with:
   - PostgreSQL container
   - Redis container
   - Web server (gunicorn)
   - WebSocket server (daphne)
   - Celery worker
   - Celery beat
   - Nginx reverse proxy

3. Create nginx.conf for:
   - HTTP to HTTPS redirect
   - Static file serving
   - WebSocket proxy
   - API proxy
   - CORS headers

4. Create deployment scripts:
   - migrate.sh - run migrations
   - deploy.sh - full deployment
   - backup.sh - database backup

5. Set up GitHub Actions CI/CD
```

### Step 18: Monitoring & Logging

**Prompt for Cursor AI:**

```
Implement monitoring and logging:

1. Configure Django logging in settings:
   - File logging for errors
   - Separate log files per app
   - Structured logging with JSON

2. Set up Sentry for error tracking
3. Add django-health-check for health endpoints
4. Create custom management commands:
   - check_system_health
   - generate_stats_report
   - cleanup_old_files

5. Add request logging middleware
6. Track API usage metrics
```

### Complete Implementation Prompt

**Final comprehensive prompt for Cursor AI:**

```
Build the complete sync2gear Django backend following the DJANGO_BACKEND_ARCHITECTURE.md specification:

CRITICAL REQUIREMENTS:
1. All models must use UUID primary keys
2. Implement multi-tenancy with client-based data isolation
3. Use JWT for authentication with refresh token rotation
4. Implement role-based permissions (client, staff, admin)
5. Store all media files on AWS S3
6. Use Celery for all async tasks (metadata extraction, TTS, scheduling)
7. Implement real-time playback updates with WebSocket
8. Support continuous playback that never stops
9. Handle announcement interruption with music resume
10. Implement interval and timeline scheduling modes
11. All API responses must include proper pagination
12. Add comprehensive error handling with meaningful messages
13. Validate all user inputs with proper error messages
14. Use database transactions for critical operations
15. Implement proper database indexing for performance
16. Add API rate limiting to prevent abuse
17. Support CORS for frontend communication
18. Generate API documentation with Swagger
19. Include health check endpoints
20. Add comprehensive logging

STRUCTURE:
- Split settings into base/development/production
- Use environment variables for all configuration
- Follow Django/DRF best practices
- Write clean, documented code
- Include docstrings for all classes and methods

TESTING:
- Create fixtures for test data
- Test all endpoints
- Test permissions and access control
- Test WebSocket connections
- Aim for >80% coverage

DEPLOYMENT:
- Dockerize all services
- Create docker-compose for local development
- Provide production deployment guide
- Include database migration strategy

START with project initialization and work through each app systematically.
After implementing each app, run migrations and test endpoints before proceeding.
```

---

## 📝 Additional Notes

### Client Data Isolation

All queries must be filtered by client:

```python
# Always filter by client in views
queryset = MusicFile.objects.filter(client=request.user.client)

# Or in permissions
def has_object_permission(self, request, view, obj):
    return obj.client == request.user.client
```

### Continuous Playback Logic

```python
# playback/engine.py

def next_track(self, zone_id):
    state = PlaybackState.objects.get(zone_id=zone_id)
    
    # Move to next in queue
    state.queue_position += 1
    
    # If end of queue, rebuild and loop
    if state.queue_position >= len(state.queue):
        state.queue_position = 0
        # Optionally rebuild queue with different shuffle
        if state.shuffle:
            state.queue = self.shuffle_queue(state.current_playlists)
    
    # Update current track
    track_id = state.queue[state.queue_position]
    state.current_track_id = track_id
    state.position = 0
    state.save()
    
    # Broadcast update
    self.broadcast_state(zone_id)
```

### Announcement Interruption

```python
def play_announcement(self, zone_id, announcement_id):
    state = PlaybackState.objects.get(zone_id=zone_id)
    
    # Save current state
    saved_state = {
        'track': state.current_track_id,
        'position': state.position,
        'was_playing': state.is_playing
    }
    
    # Play announcement
    state.current_track = None  # Signal it's an announcement
    state.announcement_id = announcement_id
    state.is_playing = True
    state.save()
    
    # After announcement completes (handled by device):
    # Resume previous track
    self.resume_after_announcement(zone_id, saved_state)
```

---

## 🎓 Learning Resources

- **Django Documentation:** https://docs.djangoproject.com/
- **DRF Documentation:** https://www.django-rest-framework.org/
- **Channels Documentation:** https://channels.readthedocs.io/
- **Celery Documentation:** https://docs.celeryproject.org/

---

**End of Architecture Document**

This document provides a complete blueprint for implementing the sync2gear Django backend. Use it with Cursor AI to generate production-ready code with minimal human intervention.
