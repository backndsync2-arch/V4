# Backend API Specification for sync2gear

**Quick Reference for Backend Developers**

This document provides the complete API specification that the frontend expects. All endpoints are already implemented in `/src/lib/api.ts` and will work once the backend provides these URLs.

---

## Base URLs

- **Development**: `http://localhost:8000/api`
- **Production**: `https://api.sync2gear.com/api`
- **WebSocket**: `ws://localhost:8000/ws` (dev) or `wss://api.sync2gear.com/ws` (prod)

---

## Authentication

All endpoints (except `/auth/*`) require authentication via JWT Bearer token:

```
Authorization: Bearer {access_token}
```

### Token Refresh Flow

1. Client stores `access` and `refresh` tokens from login
2. On 401 response, client automatically calls `/auth/refresh/` with refresh token
3. Client receives new access token and retries original request
4. If refresh fails, client redirects to login

---

## 1. Authentication Endpoints

### POST `/auth/signup/`
Create new user account

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "companyName": "Acme Corp"
}
```

**Response:** (201 Created)
```json
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "client",
    "clientId": "client123",
    "createdAt": "2025-01-24T12:00:00Z",
    "lastSeen": "2025-01-24T12:00:00Z"
  },
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/auth/login/`
User login

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** (200 OK)
```json
{
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "client",
    "clientId": "client123",
    "createdAt": "2025-01-24T12:00:00Z",
    "lastSeen": "2025-01-24T12:00:00Z"
  },
  "access": "eyJhbGciOiJIUzI1NiIs...",
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### POST `/auth/logout/`
User logout (invalidate tokens)

**Request:** Empty body

**Response:** (204 No Content)

---

### GET `/auth/me/`
Get current authenticated user

**Response:** (200 OK)
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "client",
  "clientId": "client123",
  "createdAt": "2025-01-24T12:00:00Z",
  "lastSeen": "2025-01-24T12:00:00Z"
}
```

---

### PATCH `/auth/me/`
Update current user profile

**Request:**
```json
{
  "name": "John Smith",
  "email": "newemailexample.com"
}
```

**Response:** (200 OK)
```json
{
  "id": "user123",
  "email": "newemail@example.com",
  "name": "John Smith",
  "role": "client",
  "clientId": "client123",
  "createdAt": "2025-01-24T12:00:00Z",
  "lastSeen": "2025-01-24T12:00:00Z"
}
```

---

### POST `/auth/change-password/`
Change user password

**Request:**
```json
{
  "old_password": "currentpassword",
  "new_password": "newpassword123"
}
```

**Response:** (204 No Content)

---

### POST `/auth/refresh/`
Refresh access token

**Request:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** (200 OK)
```json
{
  "access": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 2. Music Library Endpoints

### GET `/music/folders/`
List all music folders for current client

**Query Parameters:**
- `parent` (optional): Filter by parent folder ID

**Response:** (200 OK)
```json
[
  {
    "id": "folder123",
    "name": "Jazz Collection",
    "clientId": "client123",
    "parentId": null,
    "type": "music",
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123"
  }
]
```

---

### POST `/music/folders/`
Create new music folder

**Request:**
```json
{
  "name": "My Playlist",
  "description": "Favorite jazz tracks"
}
```

**Response:** (201 Created)
```json
{
  "id": "folder456",
  "name": "My Playlist",
  "clientId": "client123",
  "parentId": null,
  "type": "music",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

---

### PATCH `/music/folders/{id}/`
Update music folder

**Request:**
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

**Response:** (200 OK)
```json
{
  "id": "folder456",
  "name": "Updated Name",
  "clientId": "client123",
  "parentId": null,
  "type": "music",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

---

### DELETE `/music/folders/{id}/`
Delete music folder

**Response:** (204 No Content)

---

### GET `/music/files/`
List all music files

**Query Parameters:**
- `folder` (optional): Filter by folder ID

**Response:** (200 OK)
```json
[
  {
    "id": "music123",
    "name": "autumn-leaves.mp3",
    "folderId": "folder123",
    "clientId": "client123",
    "url": "https://cdn.sync2gear.com/music/music123.mp3",
    "size": 4500000,
    "duration": 245,
    "type": "audio/mpeg",
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123"
  }
]
```

---

### POST `/music/upload/`
Upload music file

**Request:** (multipart/form-data)
```
file: [Binary file data]
folder_id: "folder123" (optional)
title: "Autumn Leaves" (optional)
artist: "Miles Davis" (optional)
album: "Kind of Blue" (optional)
```

**Response:** (201 Created)
```json
{
  "id": "music456",
  "name": "autumn-leaves.mp3",
  "folderId": "folder123",
  "clientId": "client123",
  "url": "https://cdn.sync2gear.com/music/music456.mp3",
  "size": 4500000,
  "duration": 245,
  "type": "audio/mpeg",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

**Notes:**
- Maximum file size: 100MB
- Supported formats: mp3, wav, m4a, flac
- Backend should extract duration from audio file
- Store files in S3/CDN and return public URL

---

### PATCH `/music/files/{id}/`
Update music file metadata

**Request:**
```json
{
  "name": "new-name.mp3",
  "folderId": "folder456"
}
```

**Response:** (200 OK)
```json
{
  "id": "music456",
  "name": "new-name.mp3",
  "folderId": "folder456",
  "clientId": "client123",
  "url": "https://cdn.sync2gear.com/music/music456.mp3",
  "size": 4500000,
  "duration": 245,
  "type": "audio/mpeg",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

---

### DELETE `/music/files/{id}/`
Delete music file

**Response:** (204 No Content)

**Notes:**
- Should also delete file from S3/storage

---

### GET `/music/search/?q={query}`
Search music files

**Query Parameters:**
- `q`: Search query (searches name, artist, album, etc.)

**Response:** (200 OK)
```json
[
  {
    "id": "music123",
    "name": "autumn-leaves.mp3",
    "folderId": "folder123",
    "clientId": "client123",
    "url": "https://cdn.sync2gear.com/music/music123.mp3",
    "size": 4500000,
    "duration": 245,
    "type": "audio/mpeg",
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123"
  }
]
```

---

## 3. Announcements Endpoints

### GET `/announcements/`
List all announcements

**Response:** (200 OK)
```json
[
  {
    "id": "announce123",
    "title": "Special Offer",
    "scriptId": "script123",
    "clientId": "client123",
    "folderId": "folder456",
    "url": "https://cdn.sync2gear.com/announcements/announce123.mp3",
    "duration": 15,
    "type": "tts",
    "enabled": true,
    "category": "promotion",
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123"
  }
]
```

---

### POST `/announcements/tts/`
Create TTS announcement

**Request:**
```json
{
  "title": "Special Offer",
  "text": "Get 20% off all items today only!",
  "voice": "en-US-Neural2-F",
  "folder_id": "folder456"
}
```

**Response:** (201 Created)
```json
{
  "id": "announce789",
  "title": "Special Offer",
  "scriptId": "script789",
  "clientId": "client123",
  "folderId": "folder456",
  "url": "https://cdn.sync2gear.com/announcements/announce789.mp3",
  "duration": 12,
  "type": "tts",
  "enabled": true,
  "category": "promotion",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

**Notes:**
- Use Google Cloud Text-to-Speech or Amazon Polly
- Store generated audio in S3/CDN
- Extract duration from generated audio
- Deduct AI credits from client's account

---

### POST `/announcements/upload/`
Upload announcement audio

**Request:** (multipart/form-data)
```
file: [Binary audio file]
title: "Custom Announcement"
folder_id: "folder456" (optional)
```

**Response:** (201 Created)
```json
{
  "id": "announce999",
  "title": "Custom Announcement",
  "clientId": "client123",
  "folderId": "folder456",
  "url": "https://cdn.sync2gear.com/announcements/announce999.mp3",
  "duration": 18,
  "type": "uploaded",
  "enabled": true,
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

---

### PATCH `/announcements/{id}/`
Update announcement

**Request:**
```json
{
  "title": "Updated Title",
  "enabled": false
}
```

**Response:** (200 OK)
```json
{
  "id": "announce123",
  "title": "Updated Title",
  "scriptId": "script123",
  "clientId": "client123",
  "folderId": "folder456",
  "url": "https://cdn.sync2gear.com/announcements/announce123.mp3",
  "duration": 15,
  "type": "tts",
  "enabled": false,
  "category": "promotion",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

---

### DELETE `/announcements/{id}/`
Delete announcement

**Response:** (204 No Content)

---

### POST `/announcements/{id}/play-instant/`
Play announcement instantly on specified zones

**Request:**
```json
{
  "zone_ids": ["floor123", "floor456"]
}
```

**Response:** (200 OK)
```json
{
  "message": "Announcement queued for playback",
  "play_events": ["event123", "event456"]
}
```

**Notes:**
- Creates PlayEvent records for each zone
- Sends WebSocket message to devices in those zones
- Devices should interrupt current playback and play announcement

---

## 4. Scheduler Endpoints

### GET `/schedules/`
List all schedules

**Response:** (200 OK)
```json
[
  {
    "id": "schedule123",
    "name": "Hourly Promos",
    "clientId": "client123",
    "deviceIds": ["device123", "device456"],
    "enabled": true,
    "schedule": {
      "type": "interval",
      "intervalMinutes": 60,
      "announcementIds": ["announce123", "announce456"],
      "avoidRepeat": true,
      "quietHoursStart": "22:00",
      "quietHoursEnd": "07:00"
    },
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123",
    "updatedAt": "2025-01-24T12:00:00Z"
  }
]
```

---

### POST `/schedules/`
Create new schedule

**Request:**
```json
{
  "name": "Morning Announcements",
  "deviceIds": ["device123"],
  "enabled": true,
  "schedule": {
    "type": "timeline",
    "cycleDurationMinutes": 120,
    "announcements": [
      {
        "announcementId": "announce123",
        "timestampSeconds": 0
      },
      {
        "announcementId": "announce456",
        "timestampSeconds": 3600
      }
    ]
  }
}
```

**Response:** (201 Created)
```json
{
  "id": "schedule789",
  "name": "Morning Announcements",
  "clientId": "client123",
  "deviceIds": ["device123"],
  "enabled": true,
  "schedule": {
    "type": "timeline",
    "cycleDurationMinutes": 120,
    "announcements": [
      {
        "announcementId": "announce123",
        "timestampSeconds": 0
      },
      {
        "announcementId": "announce456",
        "timestampSeconds": 3600
      }
    ]
  },
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123",
  "updatedAt": "2025-01-24T12:00:00Z"
}
```

---

### PATCH `/schedules/{id}/`
Update schedule

**Request:**
```json
{
  "enabled": false,
  "name": "Updated Name"
}
```

**Response:** (200 OK)
```json
{
  "id": "schedule789",
  "name": "Updated Name",
  "clientId": "client123",
  "deviceIds": ["device123"],
  "enabled": false,
  "schedule": {...},
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123",
  "updatedAt": "2025-01-24T13:00:00Z"
}
```

---

### DELETE `/schedules/{id}/`
Delete schedule

**Response:** (204 No Content)

---

### POST `/schedules/{id}/toggle/`
Toggle schedule active state

**Request:**
```json
{
  "active": true
}
```

**Response:** (200 OK)
```json
{
  "id": "schedule789",
  "name": "Morning Announcements",
  "clientId": "client123",
  "deviceIds": ["device123"],
  "enabled": true,
  "schedule": {...},
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123",
  "updatedAt": "2025-01-24T13:30:00Z"
}
```

---

## 5. Zones & Devices Endpoints

### GET `/zones/`
List all zones/floors

**Response:** (200 OK)
```json
[
  {
    "id": "floor123",
    "name": "Ground Floor",
    "clientId": "client123",
    "description": "Main customer area",
    "deviceIds": ["device123", "device456"],
    "isPremium": false,
    "createdAt": "2025-01-24T12:00:00Z",
    "createdBy": "user123"
  }
]
```

---

### POST `/zones/`
Create new zone/floor

**Request:**
```json
{
  "name": "First Floor",
  "description": "Upstairs seating area"
}
```

**Response:** (201 Created)
```json
{
  "id": "floor789",
  "name": "First Floor",
  "clientId": "client123",
  "description": "Upstairs seating area",
  "deviceIds": [],
  "isPremium": true,
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

**Notes:**
- First floor is free, additional floors require premium subscription
- Check client's `premiumFeatures.maxFloors` before allowing creation

---

### PATCH `/zones/{id}/`
Update zone/floor

**Request:**
```json
{
  "name": "Updated Name",
  "description": "New description"
}
```

**Response:** (200 OK)

---

### DELETE `/zones/{id}/`
Delete zone/floor

**Response:** (204 No Content)

**Notes:**
- Should reassign or remove devices in this zone first

---

### GET `/devices/`
List all devices

**Query Parameters:**
- `zone` (optional): Filter by zone/floor ID

**Response:** (200 OK)
```json
[
  {
    "id": "device123",
    "name": "Main Speaker",
    "clientId": "client123",
    "status": "online",
    "lastSeen": "2025-01-24T12:00:00Z",
    "zone": "floor123"
  }
]
```

---

### POST `/devices/register/`
Register new device

**Request:**
```json
{
  "name": "Kitchen Speaker",
  "zone_id": "floor123",
  "device_type": "raspberry_pi"
}
```

**Response:** (201 Created)
```json
{
  "id": "device789",
  "name": "Kitchen Speaker",
  "clientId": "client123",
  "status": "online",
  "lastSeen": "2025-01-24T12:00:00Z",
  "zone": "floor123"
}
```

---

### PATCH `/devices/{id}/`
Update device

**Request:**
```json
{
  "name": "Updated Name",
  "zone": "floor456"
}
```

**Response:** (200 OK)

---

### DELETE `/devices/{id}/`
Delete device

**Response:** (204 No Content)

---

## 6. Playback Control Endpoints

### GET `/playback/state/?zone={zone_id}`
Get current playback state for zone

**Response:** (200 OK)
```json
{
  "zoneId": "floor123",
  "isPlaying": true,
  "currentTrack": {
    "id": "music123",
    "title": "Autumn Leaves",
    "artist": "Miles Davis",
    "duration": 245,
    "position": 120
  },
  "volume": 0.75,
  "queue": ["music123", "music456", "music789"],
  "shuffle": true
}
```

---

### POST `/playback/play/`
Start playback

**Request:**
```json
{
  "zone_id": "floor123",
  "playlist_ids": ["playlist123"],
  "shuffle": true
}
```

**Response:** (200 OK)

**Notes:**
- Sends WebSocket message to devices in zone to start playback

---

### POST `/playback/pause/`
Pause playback

**Request:**
```json
{
  "zone_id": "floor123"
}
```

**Response:** (200 OK)

---

### POST `/playback/resume/`
Resume playback

**Request:**
```json
{
  "zone_id": "floor123"
}
```

**Response:** (200 OK)

---

### POST `/playback/next/`
Skip to next track

**Request:**
```json
{
  "zone_id": "floor123"
}
```

**Response:** (200 OK)

---

### POST `/playback/previous/`
Skip to previous track

**Request:**
```json
{
  "zone_id": "floor123"
}
```

**Response:** (200 OK)

---

### POST `/playback/volume/`
Set volume

**Request:**
```json
{
  "zone_id": "floor123",
  "volume": 0.65
}
```

**Response:** (200 OK)

**Notes:**
- Volume range: 0.0 to 1.0

---

### POST `/playback/seek/`
Seek to position

**Request:**
```json
{
  "zone_id": "floor123",
  "position": 120
}
```

**Response:** (200 OK)

**Notes:**
- Position in seconds

---

## 7. Admin Endpoints

### GET `/admin/clients/`
List all clients (admin only)

**Response:** (200 OK)
```json
[
  {
    "id": "client123",
    "name": "Acme Corp",
    "businessName": "Acme Corporation Ltd",
    "email": "admin@acme.com",
    "telephone": "+44 20 1234 5678",
    "description": "Coffee shop chain",
    "status": "active",
    "trialDays": 0,
    "subscriptionPrice": 49.99,
    "subscriptionStatus": "active",
    "stripeCustomerId": "cus_123",
    "stripeSubscriptionId": "sub_123",
    "premiumFeatures": {
      "multiFloor": true,
      "aiCredits": 500,
      "maxFloors": 10
    },
    "createdAt": "2025-01-24T12:00:00Z",
    "updatedAt": "2025-01-24T12:00:00Z"
  }
]
```

---

### POST `/admin/clients/`
Create client (admin only)

**Request:**
```json
{
  "name": "New Client",
  "email": "client@example.com",
  "subscription_tier": "premium"
}
```

**Response:** (201 Created)

---

### PATCH `/admin/clients/{id}/`
Update client (admin only)

**Request:**
```json
{
  "status": "suspended",
  "premiumFeatures": {
    "aiCredits": 1000
  }
}
```

**Response:** (200 OK)

---

### DELETE `/admin/clients/{id}/`
Delete client (admin only)

**Response:** (204 No Content)

---

### GET `/admin/users/`
List all users (admin only)

**Response:** (200 OK)

---

### POST `/admin/users/`
Create user (admin only)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "floor_user",
  "client_id": "client123"
}
```

**Response:** (201 Created)

---

### PATCH `/admin/users/{id}/`
Update user (admin only)

**Response:** (200 OK)

---

### DELETE `/admin/users/{id}/`
Delete user (admin only)

**Response:** (204 No Content)

---

### GET `/admin/stats/`
Get system statistics (admin only)

**Response:** (200 OK)
```json
{
  "total_clients": 150,
  "active_devices": 523,
  "total_music_files": 12450,
  "total_announcements": 3200,
  "storage_used": 245000000000
}
```

---

## 8. WebSocket Endpoints

### WS `/ws/playback/{zone_id}/?token={access_token}`
Real-time playback updates for a specific zone

**Client subscribes to:**
- `playback_update` - Playback state changes
- `track_change` - Track changed
- `volume_change` - Volume changed
- `announcement_playing` - Announcement started

**Example message:**
```json
{
  "type": "playback_update",
  "zone_id": "floor123",
  "data": {
    "isPlaying": true,
    "currentTrack": {
      "id": "music123",
      "title": "Autumn Leaves",
      "position": 45
    }
  }
}
```

---

### WS `/ws/events/?token={access_token}`
Global event stream for the client

**Client subscribes to:**
- `device_status` - Device online/offline
- `instant_announcement` - New instant announcement
- `schedule_triggered` - Schedule activated
- `upload_complete` - File upload finished

**Example message:**
```json
{
  "type": "device_status",
  "data": {
    "device_id": "device123",
    "status": "offline",
    "last_seen": "2025-01-24T12:00:00Z"
  }
}
```

---

## Error Responses

All errors follow this format:

**400 Bad Request:**
```json
{
  "message": "Invalid request",
  "code": "INVALID_REQUEST",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

**401 Unauthorized:**
```json
{
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "message": "Permission denied",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "message": "Resource not found",
  "code": "NOT_FOUND"
}
```

**413 Payload Too Large:**
```json
{
  "message": "File too large",
  "code": "FILE_TOO_LARGE",
  "details": {
    "maxSize": 104857600,
    "receivedSize": 150000000
  }
}
```

**429 Too Many Requests:**
```json
{
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retry_after": 60
  }
}
```

**500 Internal Server Error:**
```json
{
  "message": "Internal server error",
  "code": "INTERNAL_ERROR"
}
```

---

## Rate Limiting

Implement rate limiting on all endpoints:
- **Authentication**: 5 requests/minute per IP
- **File uploads**: 10 requests/minute per user
- **TTS generation**: 20 requests/hour per client (costs AI credits)
- **Playback controls**: 30 requests/minute per zone
- **Other endpoints**: 100 requests/minute per user

---

## File Storage

- Use AWS S3 or similar object storage
- Store files with client-specific prefixes: `{client_id}/music/` or `{client_id}/announcements/`
- Use CloudFront or similar CDN for serving files
- Generate signed URLs for secure access (optional)
- Clean up orphaned files when deleted

---

## Security Checklist

- ✅ JWT authentication on all endpoints (except `/auth/*`)
- ✅ Token refresh mechanism
- ✅ Role-based access control (admin, client, floor_user)
- ✅ Client data isolation (users can only access their client's data)
- ✅ File size limits (100MB for music, 50MB for announcements)
- ✅ File type validation (only allow audio files)
- ✅ Rate limiting
- ✅ CORS configuration for frontend domain
- ✅ HTTPS in production
- ✅ WebSocket authentication via token

---

## Testing

Use these credentials in development:

**Admin:**
- Email: `admin@sync2gear.com`
- Password: `admin123`

**Client:**
- Email: `client@example.com`
- Password: `demo`

**Frontend test with mock data:**
```bash
VITE_USE_MOCK_DATA=true npm run dev
```

**Frontend test with real backend:**
```bash
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

---

## Implementation Priority

1. **Phase 1 (Core):**
   - Authentication endpoints
   - Music library (folders, upload, list)
   - Basic playback control

2. **Phase 2 (Features):**
   - Announcements (TTS, upload)
   - Zones/Floors management
   - Device management

3. **Phase 3 (Advanced):**
   - Scheduler
   - WebSocket real-time updates
   - Admin endpoints
   - Channel playlists

4. **Phase 4 (Polish):**
   - File storage optimization
   - Caching
   - Analytics
   - Performance optimization

---

**The frontend is ready to use these endpoints immediately once implemented!**

See `/BACKEND_INTEGRATION_GUIDE.md` for detailed integration instructions.
