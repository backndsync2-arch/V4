# sync2gear Django Backend

Complete Django REST API backend for sync2gear music and announcements management system.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)

### Installation

1. **Clone and setup:**
```bash
cd sync2gear_backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp env.example .env
# Edit .env with your settings
```

3. **Run with Docker (recommended):**
```bash
docker-compose up -d
```

4. **Or run locally:**
```bash
# Start PostgreSQL and Redis
# Then:
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## 📁 Project Structure

```
sync2gear_backend/
├── config/              # Django project settings
│   ├── settings/       # Environment-specific settings
│   ├── urls.py         # URL routing
│   ├── asgi.py         # WebSocket configuration
│   └── celery.py       # Celery configuration
├── apps/
│   ├── common/         # Shared utilities
│   ├── authentication/ # User & Client models
│   ├── music/          # Music library
│   ├── announcements/ # Announcements
│   ├── scheduler/      # Scheduling system
│   ├── zones/          # Zones, Floors, Devices
│   ├── playback/       # Playback control
│   └── admin_panel/    # Admin features
└── requirements.txt
```

## 🗄️ Database Models

### Core Models (15 total)
- **Client** - Business clients
- **User** - System users (admin, staff, client, floor_user)
- **Floor** - Physical floors (NEW - improved architecture)
- **Zone** - Playback zones
- **Device** - Playback devices
- **Folder** - Music/announcement folders
- **MusicFile** - Music tracks
- **Announcement** - Announcement audio
- **Schedule** - Scheduled playback
- **ChannelPlaylist** - Unified playlists (NEW)
- **ChannelPlaylistItem** - Playlist items (NEW)
- **PlaybackState** - Current playback state
- **PlayEvent** - Play event tracking (NEW)
- **AuditLog** - System audit logs (NEW)
- **AIProvider** - AI service providers (NEW)

## 🔌 API Endpoints

Base URL: `/api/v1/`

- `/auth/` - Authentication
- `/music/` - Music library
- `/announcements/` - Announcements
- `/schedules/` - Scheduling
- `/zones/` - Zones & Floors
- `/devices/` - Devices
- `/playback/` - Playback control
- `/admin/` - Admin panel
- `/health/` - Health check

## 🔐 Authentication

Uses JWT tokens with refresh token rotation.

```bash
# Login
POST /api/v1/auth/login/
{
  "email": "user@example.com",
  "password": "password"
}

# Response
{
  "user": {...},
  "access": "jwt_token",
  "refresh": "refresh_token"
}
```

## 📚 Documentation

- API Docs: `http://localhost:8000/api/docs/` (Swagger UI)
- ReDoc: `http://localhost:8000/api/redoc/`

## 🧪 Testing

```bash
pytest
pytest --cov
```

## 🐳 Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

## 📝 Improvements Over Original Architecture

1. **Added Floor Model** - Better hierarchy: Client → Floor → Zone → Device
2. **Added ChannelPlaylist** - Unified music + announcements playlists
3. **Added PlayEvent** - Track announcement playback events
4. **Added AuditLog** - Comprehensive audit logging
5. **Added AIProvider** - Multi-provider TTS management
6. **Enhanced Client Model** - Flexible premium features (JSONField)
7. **Better Error Handling** - Standardized error responses
8. **Health Check Endpoint** - System monitoring
9. **Audit Logging Middleware** - Automatic action tracking

## 🚧 Implementation Status

See `IMPLEMENTATION_STATUS.md` for detailed progress.

**Current Status**: ~40% complete
- ✅ All models created
- ✅ Project structure
- ✅ Settings configuration
- 🚧 Serializers (in progress)
- 🚧 Views (pending)
- 🚧 Playback engine (pending)
- 🚧 WebSocket (pending)
- 🚧 Celery tasks (pending)

## 📞 Support

For issues or questions, check:
- `DJANGO_BACKEND_ARCHITECTURE.md` - Original architecture
- `ARCHITECTURE_ASSESSMENT_AND_IMPROVEMENTS.md` - Improvements made
- `IMPLEMENTATION_STATUS.md` - Current progress
