# sync2gear API - Complete Endpoint Reference

**Base URL:** `http://localhost:8000`  
**API Version:** `v1`  
**API Prefix:** `/api/v1/`

---

## 🔗 **ROOT & DOCUMENTATION**

### Root Endpoint (NEW)
```
GET  http://localhost:8000/
```
Returns API information, documentation links, and all available endpoints.

### Health Check
```
GET  http://localhost:8000/api/health/
```
Check system health (database, Redis, S3).

### API Documentation
```
GET  http://localhost:8000/api/schema/          # OpenAPI Schema (JSON/YAML)
GET  http://localhost:8000/api/docs/           # Swagger UI (Interactive)
GET  http://localhost:8000/api/redoc/          # ReDoc (Alternative docs)
```

### Django Admin
```
GET  http://localhost:8000/admin/              # Django Admin Panel
```

---

## 🔐 **AUTHENTICATION** (`/api/v1/auth/`)

### Public Endpoints
```
POST   /api/v1/auth/signup/                     # Register new user
POST   /api/v1/auth/login/                      # Login (get JWT tokens)
POST   /api/v1/auth/password-reset/             # Request password reset
POST   /api/v1/auth/password-reset/confirm/     # Confirm password reset
```

### Protected Endpoints (Require JWT Token)
```
POST   /api/v1/auth/logout/                     # Logout (blacklist token)
POST   /api/v1/auth/refresh/                     # Refresh access token
GET    /api/v1/auth/me/                         # Get current user info
POST   /api/v1/auth/change-password/            # Change password
```

**Headers Required:**
```
Authorization: Bearer <access_token>
```

---

## 🎵 **MUSIC** (`/api/v1/music/`)

### Folders
```
GET     /api/v1/music/folders/                  # List all folders
POST    /api/v1/music/folders/                  # Create folder
GET     /api/v1/music/folders/{id}/             # Get folder details
PATCH   /api/v1/music/folders/{id}/             # Update folder
DELETE  /api/v1/music/folders/{id}/             # Delete folder
```

### Music Files
```
GET     /api/v1/music/files/                    # List all music files
POST    /api/v1/music/files/                    # Upload music file
GET     /api/v1/music/files/{id}/               # Get file details
PATCH   /api/v1/music/files/{id}/               # Update file metadata
DELETE  /api/v1/music/files/{id}/              # Delete file
POST    /api/v1/music/files/batch_upload/      # Upload multiple files (max 20)
POST    /api/v1/music/files/{id}/upload_cover_art/ # Upload cover art
POST    /api/v1/music/files/reorder/            # Reorder tracks in folder
GET     /api/v1/music/search/                   # Search music files
```

**Query Parameters:**
- `?client=<client_id>` - Filter by client
- `?folder=<folder_id>` - Filter by folder
- `?search=<query>` - Search by title/artist

---

## 📢 **ANNOUNCEMENTS** (`/api/v1/announcements/`)

### Announcements
```
GET     /api/v1/announcements/                  # List all announcements
POST    /api/v1/announcements/                  # Create announcement (upload)
GET     /api/v1/announcements/{id}/             # Get announcement details
PATCH   /api/v1/announcements/{id}/             # Update announcement
DELETE  /api/v1/announcements/{id}/             # Delete announcement
POST    /api/v1/announcements/{id}/play_instant/ # Play announcement instantly
```

### Text-to-Speech (TTS)
```
POST    /api/v1/announcements/tts/              # Create TTS announcement
```
**Body:**
```json
{
  "title": "Welcome Message",
  "text": "Hello, welcome to our store!",
  "voice": "alloy",
  "folder_id": "optional-folder-id"
}
```

**Query Parameters:**
- `?client=<client_id>` - Filter by client
- `?enabled=true` - Filter enabled/disabled
- `?is_tts=true` - Filter TTS announcements

---

## 📅 **SCHEDULES** (`/api/v1/schedules/`)

### Schedules
```
GET     /api/v1/schedules/schedules/            # List all schedules
POST    /api/v1/schedules/schedules/            # Create schedule
GET     /api/v1/schedules/schedules/{id}/       # Get schedule details
PATCH   /api/v1/schedules/schedules/{id}/       # Update schedule
DELETE  /api/v1/schedules/schedules/{id}/       # Delete schedule
POST    /api/v1/schedules/schedules/{id}/toggle/ # Toggle schedule enabled/disabled
```

### Channel Playlists
```
GET     /api/v1/schedules/playlists/             # List all playlists
POST    /api/v1/schedules/playlists/             # Create playlist
GET     /api/v1/schedules/playlists/{id}/       # Get playlist details
PATCH   /api/v1/schedules/playlists/{id}/        # Update playlist
DELETE  /api/v1/schedules/playlists/{id}/        # Delete playlist
```

---

## 🏢 **ZONES & DEVICES** (`/api/v1/zones/` and `/api/v1/devices/`)

### Floors
```
GET     /api/v1/zones/floors/                   # List all floors
POST    /api/v1/zones/floors/                   # Create floor
GET     /api/v1/zones/floors/{id}/              # Get floor details
PATCH   /api/v1/zones/floors/{id}/              # Update floor
DELETE  /api/v1/zones/floors/{id}/              # Delete floor
```

### Zones
```
GET     /api/v1/zones/zones/                    # List all zones
POST    /api/v1/zones/zones/                    # Create zone
GET     /api/v1/zones/zones/{id}/               # Get zone details
PATCH   /api/v1/zones/zones/{id}/               # Update zone
DELETE  /api/v1/zones/zones/{id}/               # Delete zone
```

### Devices
```
GET     /api/v1/devices/devices/                # List all devices
POST    /api/v1/devices/devices/                # Create/register device
GET     /api/v1/devices/devices/{id}/           # Get device details
PATCH   /api/v1/devices/devices/{id}/           # Update device
DELETE  /api/v1/devices/devices/{id}/           # Delete device
POST    /api/v1/devices/devices/{id}/heartbeat/ # Update device heartbeat
POST    /api/v1/devices/devices/{id}/volume/    # Set device volume (0-100)
```

---

## ▶️ **PLAYBACK** (`/api/v1/playback/`)

### Playback State
```
GET     /api/v1/playback/state/                 # Get current playback state
POST    /api/v1/playback/state/                 # Update playback state
GET     /api/v1/playback/state/{id}/            # Get specific state
PATCH   /api/v1/playback/state/{id}/            # Update state
```

### Playback Control
```
POST    /api/v1/playback/control/play/           # Start playback
POST    /api/v1/playback/control/pause/         # Pause playback
POST    /api/v1/playback/control/stop/          # Stop playback
POST    /api/v1/playback/control/next/          # Next track
POST    /api/v1/playback/control/previous/      # Previous track
POST    /api/v1/playback/control/volume/        # Set volume
```

### Playback State (Custom Actions)
```
GET     /api/v1/playback/state/by_zone/?zone_id={id} # Get state for specific zone
```

### Play Events
```
GET     /api/v1/playback/events/                # List play events
GET     /api/v1/playback/events/{id}/           # Get event details
```

---

## 👑 **ADMIN PANEL** (`/api/v1/admin/`) - Admin Only

### Clients
```
GET     /api/v1/admin/clients/                  # List all clients
POST    /api/v1/admin/clients/                  # Create client
GET     /api/v1/admin/clients/{id}/             # Get client details
PATCH   /api/v1/admin/clients/{id}/             # Update client
DELETE  /api/v1/admin/clients/{id}/            # Delete client
```

### Users
```
GET     /api/v1/admin/users/                    # List all users
GET     /api/v1/admin/users/?client=<id>        # List users for client
POST    /api/v1/admin/users/                    # Create user
GET     /api/v1/admin/users/{id}/               # Get user details
PATCH   /api/v1/admin/users/{id}/               # Update user
DELETE  /api/v1/admin/users/{id}/              # Delete user
```

### Audit Logs
```
GET     /api/v1/admin/audit-logs/               # List audit logs
GET     /api/v1/admin/audit-logs/{id}/          # Get log details
```

### AI Providers
```
GET     /api/v1/admin/ai-providers/             # List AI providers
POST    /api/v1/admin/ai-providers/             # Create AI provider
GET     /api/v1/admin/ai-providers/{id}/        # Get provider details
PATCH   /api/v1/admin/ai-providers/{id}/        # Update provider
DELETE  /api/v1/admin/ai-providers/{id}/        # Delete provider
POST    /api/v1/admin/ai-providers/{id}/test/   # Test provider connection
```

### System Stats
```
GET     /api/v1/admin/stats/                    # Get system statistics
GET     /api/v1/admin/stats/audit-logs/         # Get audit log statistics
```

---

## 🧪 **TESTING EXAMPLES**

### 1. Test Root Endpoint
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get
```

### 2. Login and Get Token
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/auth/login/" `
  -ContentType "application/json" -Body (@{
    email = "admin@sync2gear.com"
    password = "admin123"
  } | ConvertTo-Json)
$token = $login.access
```

### 3. Get Current User (with token)
```powershell
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/me/" -Headers $headers
```

### 4. List All Clients (Admin)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/clients/" -Headers $headers
```

### 5. List Music Files
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/music/files/" -Headers $headers
```

### 6. Create TTS Announcement
```powershell
$body = @{
  title = "Test Announcement"
  text = "Hello, this is a test"
  voice = "alloy"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/announcements/tts/" `
  -Headers $headers -ContentType "application/json" -Body $body
```

### 7. List AI Providers (Admin)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/ai-providers/" -Headers $headers
```

### 8. Test AI Provider Connection
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/admin/ai-providers/{provider_id}/test/" `
  -Headers $headers
```

### 9. Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/health/"
```

### 10. Get System Stats (Admin)
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/admin/stats/" -Headers $headers
```

---

## 📝 **NOTES**

1. **Authentication:** Most endpoints require JWT token in `Authorization: Bearer <token>` header
2. **Admin Endpoints:** `/api/v1/admin/*` requires admin role
3. **Pagination:** List endpoints support `?page=<n>` and `?page_size=<n>`
4. **Filtering:** Many endpoints support query parameters for filtering
5. **File Uploads:** Use `multipart/form-data` for file uploads (music, announcements)
6. **WebSockets:** Available at `ws://localhost:8000/ws/playback/{zone_id}/` and `ws://localhost:8000/ws/events/`

---

## 🔄 **REST CONVENTIONS**

- `GET` - Retrieve resource(s)
- `POST` - Create resource
- `PATCH` - Update resource (partial)
- `PUT` - Update resource (full)
- `DELETE` - Delete resource

---

**Last Updated:** January 21, 2026
