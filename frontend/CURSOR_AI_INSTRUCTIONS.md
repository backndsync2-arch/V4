# 🤖 Cursor AI - Complete Implementation Instructions

**sync2gear Django Backend - Zero Human Input Required**

---

## 📋 Pre-Implementation Checklist

Before starting, ensure you have:

- [ ] Python 3.11+ installed
- [ ] PostgreSQL 15+ installed and running
- [ ] Redis 7+ installed and running
- [ ] AWS S3 bucket created (or use local storage for dev)
- [ ] Google Cloud TTS API credentials (optional for dev)
- [ ] Git repository initialized

---

## 🚀 Phase 1: Project Initialization

### Command 1: Create Project Structure

```bash
# Create project directory
mkdir sync2gear_backend
cd sync2gear_backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create Django project
django-admin startproject config .

# Create apps
python manage.py startapp authentication
python manage.py startapp music
python manage.py startapp announcements
python manage.py startapp scheduler
python manage.py startapp zones
python manage.py startapp playback
python manage.py startapp admin_panel
python manage.py startapp common

# Move apps to apps directory
mkdir apps
mv authentication music announcements scheduler zones playback admin_panel common apps/

# Create settings split
mkdir config/settings
touch config/settings/__init__.py
touch config/settings/base.py
touch config/settings/development.py
touch config/settings/production.py
```

### Command 2: Install Dependencies

Create `requirements.txt`:

```txt
Django==5.0.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
django-environ==0.11.2
django-storages==1.14.2
channels==4.0.0
channels-redis==4.1.0
daphne==4.0.0
psycopg2-binary==2.9.9
celery==5.3.4
redis==5.0.1
boto3==1.34.18
mutagen==1.47.0
Pillow==10.2.0
google-cloud-texttospeech==2.16.0
gunicorn==21.2.0
python-dotenv==1.0.0
drf-spectacular==0.27.1
```

```bash
pip install -r requirements.txt
```

### Command 3: Create Environment File

Create `.env`:

```bash
# Django
SECRET_KEY=django-insecure-CHANGE-THIS-IN-PRODUCTION
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://sync2gear:password@localhost:5432/sync2gear

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AWS S3 (optional for dev)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=
AWS_S3_REGION_NAME=us-east-1

# Google Cloud TTS (optional for dev)
GOOGLE_APPLICATION_CREDENTIALS=

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# JWT
JWT_SECRET_KEY=your-jwt-secret-change-this

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

---

## 🔧 Phase 2: Base Configuration

### Cursor AI Prompt:

```
Configure Django project settings following these requirements:

1. SETTINGS STRUCTURE (config/settings/):

base.py:
- Import environ for environment variables
- Configure INSTALLED_APPS with all apps, DRF, channels, cors
- Configure MIDDLEWARE with cors, authentication
- Configure TEMPLATES
- Configure static and media files
- Configure REST_FRAMEWORK with JWT authentication
- Configure SIMPLE_JWT with 1-hour access, 7-day refresh
- Configure DATABASES using DATABASE_URL
- Configure CHANNEL_LAYERS with Redis
- Configure CELERY with Redis broker
- Configure LOGGING with file and console handlers
- Set AUTH_USER_MODEL = 'authentication.User'

development.py:
- Import from base
- DEBUG = True
- Use local file storage
- Detailed logging

production.py:
- Import from base
- DEBUG = False
- Use AWS S3 storage
- Sentry integration (commented out)
- Security settings (SECURE_SSL_REDIRECT, etc.)

2. URLS CONFIGURATION (config/urls.py):
- /api/auth/ -> authentication.urls
- /api/music/ -> music.urls
- /api/announcements/ -> announcements.urls
- /api/schedules/ -> scheduler.urls
- /api/zones/ -> zones.urls
- /api/devices/ -> zones.urls (device endpoints)
- /api/playback/ -> playback.urls
- /api/admin/ -> admin_panel.urls
- /api/schema/ -> drf-spectacular schema
- /api/docs/ -> Swagger UI
- /api/redoc/ -> ReDoc

3. ASGI CONFIGURATION (config/asgi.py):
- Set up ProtocolTypeRouter with http and websocket
- Configure AuthMiddlewareStack
- Route websocket connections

4. WSGI CONFIGURATION (config/wsgi.py):
- Standard WSGI configuration

5. CELERY CONFIGURATION (config/celery.py):
- Configure Celery app
- Set up beat schedule for scheduler checks
- Auto-discover tasks

Create all files with complete, production-ready code.
Use environment variables for all sensitive data.
Include comprehensive comments.
```

---

## 💾 Phase 3: Database Models

### Cursor AI Prompt:

```
Implement all database models following Django best practices:

1. COMMON APP (apps/common/models.py):

Create TimestampedModel abstract base class:
- created_at: DateTimeField(auto_now_add=True)
- updated_at: DateTimeField(auto_now=True)

2. AUTHENTICATION APP (apps/authentication/models.py):

Create Client model (TimestampedModel):
- id: UUIDField (primary key)
- name: CharField(255)
- email: EmailField
- phone: CharField(50, blank=True)
- subscription_tier: CharField (choices: basic, professional, enterprise)
- subscription_status: CharField (choices: active, suspended, cancelled)
- subscription_start: DateField(null=True)
- subscription_end: DateField(null=True)
- max_devices: IntegerField(default=5)
- max_storage_gb: IntegerField(default=10)
- is_active: BooleanField(default=True)
- Meta: db_table='clients', ordering=['-created_at']

Create User model (AbstractBaseUser, PermissionsMixin, TimestampedModel):
- id: UUIDField (primary key)
- email: EmailField(unique=True)
- name: CharField(255)
- client: ForeignKey(Client, null=True)
- role: CharField (choices: client, staff, admin)
- avatar: ImageField(upload_to='avatars/', null=True)
- phone: CharField(50, blank=True)
- timezone: CharField(50, default='UTC')
- is_active: BooleanField(default=True)
- is_staff: BooleanField(default=False)
- USERNAME_FIELD = 'email'
- REQUIRED_FIELDS = ['name']
- Meta: db_table='users'

3. MUSIC APP (apps/music/models.py):

Create Folder model (TimestampedModel):
- id: UUIDField
- name: CharField(255)
- description: TextField(blank=True)
- type: CharField (choices: music, announcement)
- client: ForeignKey(Client, CASCADE)
- created_by: ForeignKey(User, SET_NULL, null=True)
- cover_image: ImageField(null=True)
- is_system: BooleanField(default=False)
- Meta: db_table='folders'

Create MusicFile model (TimestampedModel):
- id: UUIDField
- file: FileField(upload_to='music/')
- filename: CharField(255)
- file_size: BigIntegerField
- title: CharField(255)
- artist: CharField(255, blank=True)
- album: CharField(255, blank=True)
- genre: CharField(100, blank=True)
- year: IntegerField(null=True)
- duration: IntegerField (seconds)
- cover_art: ImageField(null=True)
- folder: ForeignKey(Folder, SET_NULL, null=True)
- client: ForeignKey(Client, CASCADE)
- uploaded_by: ForeignKey(User, SET_NULL, null=True)
- order: IntegerField(default=0)
- Meta: db_table='music_files', ordering=['folder', 'order', 'title']

4. ANNOUNCEMENTS APP (apps/announcements/models.py):

Create Announcement model (TimestampedModel):
- id: UUIDField
- title: CharField(255)
- file: FileField(upload_to='announcements/')
- duration: IntegerField
- file_size: BigIntegerField
- is_tts: BooleanField(default=False)
- tts_text: TextField(blank=True)
- tts_voice: CharField(50, blank=True)
- is_recording: BooleanField(default=False)
- folder: ForeignKey(Folder, SET_NULL, null=True)
- client: ForeignKey(Client, CASCADE)
- created_by: ForeignKey(User, SET_NULL, null=True)
- Meta: db_table='announcements'

5. SCHEDULER APP (apps/scheduler/models.py):

Create Schedule model (TimestampedModel):
- id: UUIDField
- name: CharField(255)
- type: CharField (choices: music, announcement)
- content_type: CharField (choices: folder, announcement)
- folder: ForeignKey(Folder, CASCADE, null=True)
- announcement: ForeignKey(Announcement, CASCADE, null=True)
- mode: CharField (choices: interval, timeline)
- interval_minutes: IntegerField(null=True)
- interval_type: CharField (choices: tracks, time, null=True)
- start_time: TimeField(null=True)
- end_time: TimeField(null=True)
- days_of_week: ArrayField(IntegerField(), default=list)
- zones: ManyToManyField(Zone)
- priority: IntegerField(default=0)
- is_active: BooleanField(default=True)
- client: ForeignKey(Client, CASCADE)
- created_by: ForeignKey(User, SET_NULL, null=True)
- Meta: db_table='schedules', ordering=['-priority', 'name']

6. ZONES APP (apps/zones/models.py):

Create Zone model (TimestampedModel):
- id: UUIDField
- name: CharField(255)
- description: TextField(blank=True)
- default_volume: IntegerField(default=70)
- client: ForeignKey(Client, CASCADE)
- is_active: BooleanField(default=True)
- Meta: db_table='zones'

Create Device model (TimestampedModel):
- id: UUIDField
- name: CharField(255)
- device_type: CharField(50)
- device_id: CharField(255, unique=True)
- model: CharField(100, blank=True)
- firmware_version: CharField(50, blank=True)
- ip_address: GenericIPAddressField(null=True)
- last_seen: DateTimeField(null=True)
- is_online: BooleanField(default=False)
- volume: IntegerField(default=70)
- zone: ForeignKey(Zone, CASCADE)
- client: ForeignKey(Client, CASCADE)
- Meta: db_table='devices'

7. PLAYBACK APP (apps/playback/models.py):

Create PlaybackState model (TimestampedModel):
- id: UUIDField
- zone: OneToOneField(Zone, CASCADE)
- current_track: ForeignKey(MusicFile, SET_NULL, null=True)
- queue: ArrayField(UUIDField(), default=list)
- queue_position: IntegerField(default=0)
- is_playing: BooleanField(default=False)
- position: IntegerField(default=0)
- volume: IntegerField(default=70)
- current_playlists: ArrayField(UUIDField(), default=list)
- shuffle: BooleanField(default=False)
- last_updated: DateTimeField(auto_now=True)
- Meta: db_table='playback_states'

Import uuid at top of each file.
Add __str__ methods to all models.
Include proper Meta classes with db_table and ordering.
Add comprehensive docstrings.
Create migrations after implementing: python manage.py makemigrations
```

---

## 🔐 Phase 4: Permissions & Serializers

### Cursor AI Prompt:

```
Implement permissions and serializers:

1. PERMISSIONS (common/permissions.py):

Create these permission classes:

IsClientUser(BasePermission):
- Check user.is_authenticated and user.role == 'client'

IsStaffOrAdmin(BasePermission):
- Check user.is_authenticated and user.role in ['staff', 'admin']

IsAdmin(BasePermission):
- Check user.is_authenticated and user.role == 'admin'

IsOwnerOrReadOnly(BasePermission):
- Safe methods: allow all
- Write methods: check obj.client == user.client

IsSameClient(BasePermission):
- Check obj.client == user.client

2. SERIALIZERS for each app:

authentication/serializers.py:
- ClientSerializer (all fields)
- UserSerializer (all fields except password)
- UserCreateSerializer (includes password write-only)
- LoginSerializer (email, password)
- SignUpSerializer (email, password, name, companyName)
- PasswordChangeSerializer (old_password, new_password)

music/serializers.py:
- FolderSerializer
- FolderCreateSerializer
- MusicFileSerializer (include cover_art URL)
- MusicFileCreateSerializer
- MusicFileUpdateSerializer

announcements/serializers.py:
- AnnouncementSerializer
- TTSCreateSerializer (title, text, voice, folder_id)
- AnnouncementUploadSerializer

scheduler/serializers.py:
- ScheduleSerializer (include nested zone data)
- ScheduleCreateSerializer
- ScheduleUpdateSerializer

zones/serializers.py:
- ZoneSerializer (include device count)
- DeviceSerializer
- DeviceRegisterSerializer

playback/serializers.py:
- PlaybackStateSerializer (include current_track details)

All serializers should:
- Use ModelSerializer
- Include proper read_only_fields
- Add custom validation where needed
- Use SerializerMethodField for computed fields
- Include comprehensive docstrings
```

---

## 🎯 Phase 5: Views & ViewSets

### Cursor AI Prompt:

```
Implement all API views and viewsets:

1. AUTHENTICATION (apps/authentication/views.py):

SignUpView(APIView):
- POST: Create user and client
- Generate JWT tokens
- Return user data + tokens

LoginView(APIView):
- POST: Authenticate with email/password
- Generate JWT tokens
- Return user data + tokens

LogoutView(APIView):
- POST: Blacklist refresh token
- Permission: IsAuthenticated

RefreshTokenView:
- Use SimpleJWT's TokenRefreshView

CurrentUserView(RetrieveUpdateAPIView):
- GET: Return current user
- PATCH: Update profile
- Permission: IsAuthenticated

ChangePasswordView(APIView):
- POST: Change password
- Validate old password
- Permission: IsAuthenticated

PasswordResetRequestView(APIView):
- POST: Send reset email
- No authentication required

PasswordResetConfirmView(APIView):
- POST: Reset password with token
- No authentication required

2. MUSIC (apps/music/views.py):

FolderViewSet(ModelViewSet):
- queryset filtered by user.client
- Permissions: IsAuthenticated, IsSameClient
- CRUD operations

MusicFileViewSet(ModelViewSet):
- queryset filtered by user.client
- Support filtering by folder
- Permissions: IsAuthenticated, IsSameClient

MusicUploadView(APIView):
- POST: Handle file upload
- Trigger metadata extraction task
- Permission: IsAuthenticated

BatchUploadView(APIView):
- POST: Handle multiple files
- Process each with Celery
- Permission: IsAuthenticated

CoverArtUploadView(APIView):
- POST: Upload cover for music file
- Permission: IsAuthenticated, IsSameClient

ReorderTracksView(APIView):
- POST: Update track order in folder
- Permission: IsAuthenticated, IsSameClient

MusicSearchView(ListAPIView):
- GET: Search by title, artist, album
- Filter by user.client
- Permission: IsAuthenticated

3. ANNOUNCEMENTS (apps/announcements/views.py):

AnnouncementViewSet(ModelViewSet):
- Filter by user.client
- Permissions: IsAuthenticated, IsSameClient

TTSGenerateView(APIView):
- POST: Queue TTS generation task
- Return announcement ID immediately
- Permission: IsAuthenticated

AnnouncementUploadView(APIView):
- POST: Upload audio file
- Validate format (mp3, wav, m4a, webm)
- Permission: IsAuthenticated

InstantPlayView(APIView):
- POST: Trigger instant playback
- Send to specified zones
- Permission: IsAuthenticated

4. SCHEDULER (apps/scheduler/views.py):

ScheduleViewSet(ModelViewSet):
- Filter by user.client
- Permissions: IsAuthenticated, IsSameClient
- Include nested zone data

ToggleScheduleView(APIView):
- POST: Activate/deactivate schedule
- Permission: IsAuthenticated, IsSameClient

5. ZONES (apps/zones/views.py):

ZoneViewSet(ModelViewSet):
- Filter by user.client
- Include device count in response
- Permissions: IsAuthenticated, IsSameClient

DeviceViewSet(ModelViewSet):
- Filter by user.client
- Support filtering by zone
- Permissions: IsAuthenticated, IsSameClient

DeviceRegisterView(APIView):
- POST: Register new device
- Validate unique device_id
- Permission: IsAuthenticated

DeviceVolumeView(APIView):
- POST: Set device volume
- Update device and broadcast via WebSocket
- Permission: IsAuthenticated, IsSameClient

6. PLAYBACK (apps/playback/views.py):

PlaybackStateView(RetrieveAPIView):
- GET: Get state for zone
- Query param: zone
- Permission: IsAuthenticated, IsSameClient

PlayView(APIView):
- POST: Start playback
- Build queue from playlists
- Broadcast state via WebSocket
- Permission: IsAuthenticated

PauseView(APIView):
- POST: Pause playback
- Update state and broadcast
- Permission: IsAuthenticated

ResumeView(APIView):
- POST: Resume playback
- Permission: IsAuthenticated

NextTrackView(APIView):
- POST: Skip to next
- Handle queue looping
- Permission: IsAuthenticated

PreviousTrackView(APIView):
- POST: Previous track
- Permission: IsAuthenticated

VolumeView(APIView):
- POST: Set volume
- Permission: IsAuthenticated

SeekView(APIView):
- POST: Seek to position
- Permission: IsAuthenticated

7. ADMIN PANEL (apps/admin_panel/views.py):

ClientViewSet(ModelViewSet):
- All clients
- Permission: IsAdmin

UserManagementViewSet(ModelViewSet):
- All users
- Permission: IsAdmin

SystemStatsView(APIView):
- GET: System statistics
- Permission: IsAdmin

All views should:
- Include proper error handling
- Return consistent JSON responses
- Use transactions where appropriate
- Include logging
- Add docstrings
```

---

## ⚡ Phase 6: Playback Engine

### Cursor AI Prompt:

```
Implement the playback engine (apps/playback/engine.py):

Create PlaybackEngine class with these methods:

1. start_playlist(zone_id, playlist_ids, shuffle=False):
   - Get or create PlaybackState for zone
   - Build queue from playlists
   - Shuffle if requested
   - Set first track as current
   - Update state
   - Broadcast via WebSocket

2. build_queue(playlist_ids, shuffle):
   - Get all music files from playlists
   - Order by folder.order, track.order
   - Shuffle if requested
   - Return list of track UUIDs

3. shuffle_queue(track_ids):
   - Shuffle list randomly
   - Return shuffled list

4. next_track(zone_id):
   - Get current state
   - Increment queue_position
   - If end of queue: loop back to 0 (continuous playback)
   - Update current_track
   - Reset position to 0
   - Save state
   - Broadcast update

5. previous_track(zone_id):
   - Get current state
   - If position > 3 seconds: restart current track
   - Else: decrement queue_position (wrap to end if at start)
   - Update state
   - Broadcast update

6. pause(zone_id):
   - Set is_playing = False
   - Save state
   - Broadcast update

7. resume(zone_id):
   - Set is_playing = True
   - Save state
   - Broadcast update

8. set_volume(zone_id, volume):
   - Validate volume 0-100
   - Update state
   - Broadcast update

9. seek(zone_id, position):
   - Update position
   - Save state
   - Broadcast update

10. handle_announcement(zone_id, announcement_id):
    - Save current state
    - Play announcement
    - After completion, restore saved state
    - Resume playback

11. broadcast_state(zone_id):
    - Get current state
    - Send via WebSocket to zone group
    - Include current track details

12. update_state(zone_id, **kwargs):
    - Update PlaybackState fields
    - Save to database
    - Broadcast changes

Use @staticmethod where appropriate.
Include comprehensive error handling.
Add logging for all operations.
Use select_for_update() for state modifications.
```

---

## 🌐 Phase 7: WebSocket Consumers

### Cursor AI Prompt:

```
Implement WebSocket consumers:

1. PLAYBACK CONSUMER (apps/playback/consumers.py):

Create PlaybackConsumer(AsyncWebsocketConsumer):

- connect():
  * Get zone_id from URL
  * Authenticate user from token in query params
  * Join room group: f'playback_{zone_id}'
  * Accept connection
  * Send current playback state

- disconnect(close_code):
  * Leave room group

- receive(text_data):
  * Parse JSON data
  * Handle commands: play, pause, next, previous, seek, volume
  * Call appropriate PlaybackEngine methods
  * Errors handled gracefully

- playback_update(event):
  * Receive from channel layer
  * Send to WebSocket client

- Helper methods:
  * get_playback_state() - async database query
  * authenticate_token() - verify JWT

2. ROUTING (apps/playback/routing.py):

websocket_urlpatterns = [
    path('ws/playback/<uuid:zone_id>/', PlaybackConsumer.as_asgi()),
    path('ws/events/', EventsConsumer.as_asgi()),  # Global events
]

3. EVENTS CONSUMER (apps/playback/consumers.py):

Create EventsConsumer for global events:
- Device status changes
- Schedule executions
- System notifications

Use @database_sync_to_async for database queries.
Include comprehensive error handling.
Add logging for connections/disconnections.
Validate all incoming messages.
```

---

## ⏰ Phase 8: Celery Tasks

### Cursor AI Prompt:

```
Implement all Celery tasks:

1. MUSIC TASKS (apps/music/tasks.py):

@shared_task
def extract_metadata(music_file_id):
    - Load MusicFile from database
    - Use mutagen to extract:
      * Duration
      * Title, artist, album, genre, year
      * Cover art (if embedded)
    - Update MusicFile instance
    - Save to database
    - Handle errors gracefully

@shared_task
def generate_waveform(music_file_id):
    - Generate waveform image (optional)
    - Save as separate file

2. ANNOUNCEMENTS TASKS (apps/announcements/tasks.py):

@shared_task
def generate_tts(announcement_id):
    - Load Announcement from database
    - Use Google Cloud TTS:
      * Text from announcement.tts_text
      * Voice from announcement.tts_voice
      * Audio format: MP3
    - Save audio file to announcement.file
    - Calculate duration
    - Update announcement instance
    - Handle API errors

@shared_task
def process_recording(announcement_id):
    - Process uploaded recording
    - Convert if needed
    - Extract duration

3. SCHEDULER TASKS (apps/scheduler/tasks.py):

@shared_task
def check_schedules():
    - Get current time and weekday
    - Find all active schedules
    - For each schedule:
      * Check if should execute now
      * Check day of week
      * Check time window (timeline mode)
      * Check interval (interval mode)
      * Execute if conditions met
    - Log executions

@shared_task
def execute_schedule(schedule_id):
    - Load schedule
    - For each target zone:
      * If music: start playlist
      * If announcement: play announcement
    - Broadcast to WebSocket
    - Log execution

4. AUTHENTICATION TASKS (apps/authentication/tasks.py):

@shared_task
def cleanup_expired_sessions():
    - Delete expired JWT tokens
    - Run daily via Celery Beat

@shared_task
def send_password_reset_email(user_id, token):
    - Load user
    - Send email with reset link
    - Handle email errors

5. CELERY CONFIG (config/celery.py):

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
    'cleanup-sessions': {
        'task': 'apps.authentication.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=3, minute=0),  # 3 AM daily
    },
}

All tasks should:
- Include retry logic with exponential backoff
- Log all operations
- Handle errors gracefully
- Update database atomically
```

---

## 🔗 Phase 9: URL Routing

### Cursor AI Prompt:

```
Create URL routing for all apps:

1. AUTHENTICATION (apps/authentication/urls.py):

from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.SignUpView.as_view()),
    path('login/', views.LoginView.as_view()),
    path('logout/', views.LogoutView.as_view()),
    path('refresh/', views.RefreshTokenView.as_view()),
    path('me/', views.CurrentUserView.as_view()),
    path('change-password/', views.ChangePasswordView.as_view()),
    path('password-reset/', views.PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view()),
]

2. MUSIC (apps/music/urls.py):

from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('folders', views.FolderViewSet)
router.register('files', views.MusicFileViewSet)

urlpatterns = [
    path('upload/', views.MusicUploadView.as_view()),
    path('batch-upload/', views.BatchUploadView.as_view()),
    path('files/<uuid:pk>/cover/', views.CoverArtUploadView.as_view()),
    path('folders/<uuid:pk>/reorder/', views.ReorderTracksView.as_view()),
    path('search/', views.MusicSearchView.as_view()),
] + router.urls

3. ANNOUNCEMENTS (apps/announcements/urls.py):

router = DefaultRouter()
router.register('', views.AnnouncementViewSet)

urlpatterns = [
    path('tts/', views.TTSGenerateView.as_view()),
    path('upload/', views.AnnouncementUploadView.as_view()),
    path('<uuid:pk>/play-instant/', views.InstantPlayView.as_view()),
] + router.urls

4. SCHEDULER (apps/scheduler/urls.py):

router = DefaultRouter()
router.register('', views.ScheduleViewSet)

urlpatterns = [
    path('<uuid:pk>/toggle/', views.ToggleScheduleView.as_view()),
] + router.urls

5. ZONES (apps/zones/urls.py):

router = DefaultRouter()
router.register('zones', views.ZoneViewSet)
router.register('devices', views.DeviceViewSet)

urlpatterns = [
    path('devices/register/', views.DeviceRegisterView.as_view()),
    path('devices/<uuid:pk>/volume/', views.DeviceVolumeView.as_view()),
] + router.urls

6. PLAYBACK (apps/playback/urls.py):

urlpatterns = [
    path('state/', views.PlaybackStateView.as_view()),
    path('play/', views.PlayView.as_view()),
    path('pause/', views.PauseView.as_view()),
    path('resume/', views.ResumeView.as_view()),
    path('next/', views.NextTrackView.as_view()),
    path('previous/', views.PreviousTrackView.as_view()),
    path('volume/', views.VolumeView.as_view()),
    path('seek/', views.SeekView.as_view()),
]

7. ADMIN PANEL (apps/admin_panel/urls.py):

router = DefaultRouter()
router.register('clients', views.ClientViewSet)
router.register('users', views.UserManagementViewSet)

urlpatterns = [
    path('stats/', views.SystemStatsView.as_view()),
] + router.urls

Include app_name for namespacing where appropriate.
```

---

## 🧪 Phase 10: Testing

### Cursor AI Prompt:

```
Create comprehensive tests for all apps:

1. Setup (conftest.py in each app):

import pytest
from rest_framework.test import APIClient
from apps.authentication.models import User, Client

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_client():
    return Client.objects.create(
        name='Test Company',
        email='test@example.com',
        subscription_tier='professional'
    )

@pytest.fixture
def test_user(test_client):
    return User.objects.create_user(
        email='user@test.com',
        password='testpass123',
        name='Test User',
        client=test_client,
        role='client'
    )

@pytest.fixture
def admin_user():
    return User.objects.create_user(
        email='admin@sync2gear.com',
        password='adminpass',
        name='Admin User',
        role='admin'
    )

2. AUTHENTICATION TESTS (apps/authentication/tests.py):

Test signup:
- Valid data creates user and client
- Returns user data and tokens
- Duplicate email rejected

Test login:
- Valid credentials return tokens
- Invalid credentials rejected
- Returns user data

Test token refresh:
- Valid refresh token returns new access
- Invalid token rejected

Test current user:
- Authenticated returns user data
- Unauthenticated rejected
- Can update profile

Test password change:
- Valid old password allows change
- Invalid old password rejected

3. MUSIC TESTS (apps/music/tests.py):

Test folder CRUD:
- Create folder
- List folders (filtered by client)
- Update folder
- Delete folder

Test music upload:
- Upload valid file
- Metadata extraction triggered
- File saved to storage

Test music CRUD:
- Update metadata
- Upload cover art
- Delete file
- Search functionality

4. PLAYBACK TESTS (apps/playback/tests.py):

Test playback state:
- Get current state
- Start playback
- Pause/resume
- Next/previous track
- Queue management

Test WebSocket:
- Connection with auth
- Receive state updates
- Send commands

Use pytest-django.
Use factory_boy for test data.
Test permissions on all endpoints.
Test error cases.
Aim for >80% coverage.
```

---

## 📚 Phase 11: API Documentation

### Cursor AI Prompt:

```
Add API documentation using drf-spectacular:

1. Install and configure:

pip install drf-spectacular

In settings.py:
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'sync2gear API',
    'DESCRIPTION': 'Music and announcements management system',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

2. Add to URLs:

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

3. Add decorators to views:

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    request=LoginSerializer,
    responses={200: UserSerializer},
    description='Authenticate user and return JWT tokens',
    examples=[
        OpenApiExample(
            'Login Example',
            value={'email': 'user@example.com', 'password': 'password123'}
        )
    ]
)
def post(self, request):
    ...

Add comprehensive documentation to all endpoints.
Include request/response examples.
Document query parameters.
Document authentication requirements.
```

---

## 🐳 Phase 12: Docker Configuration

### Cursor AI Prompt:

```
Create Docker configuration for deployment:

1. Dockerfile:

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "config.wsgi:application"]

2. docker-compose.yml:

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

3. .dockerignore:

__pycache__
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.env
.git
.gitignore
README.md
docker-compose.yml
Dockerfile
```

---

## 🚀 Phase 13: Deployment Scripts

### Cursor AI Prompt:

```
Create deployment and management scripts:

1. scripts/migrate.sh:

#!/bin/bash
python manage.py makemigrations
python manage.py migrate
python manage.py collectstatic --noinput

2. scripts/deploy.sh:

#!/bin/bash
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec web python manage.py migrate
docker-compose exec web python manage.py collectstatic --noinput

3. scripts/backup.sh:

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U sync2gear sync2gear > backup_$DATE.sql
echo "Backup created: backup_$DATE.sql"

4. scripts/create_superuser.sh:

#!/bin/bash
docker-compose exec web python manage.py createsuperuser

5. scripts/logs.sh:

#!/bin/bash
docker-compose logs -f $1

Make all scripts executable:
chmod +x scripts/*.sh
```

---

## ✅ Final Checklist

Run these commands to verify everything is working:

```bash
# 1. Create database
createdb sync2gear

# 2. Run migrations
python manage.py makemigrations
python manage.py migrate

# 3. Create superuser
python manage.py createsuperuser

# 4. Run tests
pytest

# 5. Start development server
python manage.py runserver

# 6. Start Celery worker (separate terminal)
celery -A config worker -l info

# 7. Start Celery Beat (separate terminal)
celery -A config beat -l info

# 8. Start Channels/WebSocket (separate terminal)
daphne -b 127.0.0.1 -p 8001 config.asgi:application

# 9. Test API endpoints
curl http://localhost:8000/api/docs/

# 10. Run with Docker
docker-compose up --build
```

---

## 🎯 Success Criteria

Your Django backend is complete when:

- [ ] All models created and migrated
- [ ] All API endpoints working
- [ ] JWT authentication functioning
- [ ] File uploads to S3 working
- [ ] WebSocket connections stable
- [ ] Celery tasks executing
- [ ] Schedule engine running
- [ ] Tests passing (>80% coverage)
- [ ] API documentation generated
- [ ] Docker containers running
- [ ] Frontend can connect and authenticate

---

## 📞 Troubleshooting

Common issues and solutions:

1. **Import errors**: Ensure all apps are in INSTALLED_APPS
2. **Database errors**: Check DATABASE_URL in .env
3. **Redis errors**: Ensure Redis is running
4. **WebSocket errors**: Check channel layers configuration
5. **Celery errors**: Ensure Redis broker is accessible
6. **S3 errors**: Verify AWS credentials
7. **Migration errors**: Delete migrations and recreate

---

**END OF CURSOR AI INSTRUCTIONS**

Follow these instructions in order, and you'll have a production-ready Django backend with zero human input required.
