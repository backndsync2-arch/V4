# Backend Integration Guide for sync2gear

## Overview

This guide provides everything needed to integrate the sync2gear frontend with a Django (or any) backend. The frontend is **100% ready for backend integration** with a clean service layer that automatically switches between mock data (development) and real API calls (production).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Components                  │
│              (React components in /src/app)             │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│                   Custom React Hooks                    │
│            (/src/lib/hooks/useData.ts)                  │
│  • useMusicFiles(), useFloors(), useSchedules()...     │
│  • Automatic loading states & error handling           │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                        │
│                (/src/lib/services.ts)                   │
│  • Auto-switches between mock & real backend           │
│  • musicService, announcementsService, etc.            │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ↓                        ↓
┌──────────────┐        ┌──────────────────┐
│  Mock Data   │        │   API Layer      │
│ (mockData.ts)│        │   (api.ts)       │
│              │        │ Real Backend API │
└──────────────┘        └──────────────────┘
```

## Quick Start for Backend Developers

### Step 1: Environment Configuration

Create a `.env` file in the project root:

```env
# Development (uses mock data)
VITE_USE_MOCK_DATA=true

# Production (uses real backend)
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws
```

### Step 2: Backend Setup Requirements

The backend must provide these endpoints (already defined in `/src/lib/api.ts`):

#### Authentication Endpoints
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/me/` - Get current user
- `PATCH /api/auth/me/` - Update profile
- `POST /api/auth/change-password/` - Change password
- `POST /api/auth/refresh/` - Refresh access token

#### Music Library Endpoints
- `GET /api/music/folders/` - List all music folders
- `POST /api/music/folders/` - Create folder
- `PATCH /api/music/folders/{id}/` - Update folder
- `DELETE /api/music/folders/{id}/` - Delete folder
- `GET /api/music/files/` - List music files (optional ?folder=id)
- `POST /api/music/upload/` - Upload music file (multipart/form-data)
- `PATCH /api/music/files/{id}/` - Update music file metadata
- `DELETE /api/music/files/{id}/` - Delete music file
- `GET /api/music/search/?q={query}` - Search music

#### Announcements Endpoints
- `GET /api/announcements/` - List all announcements
- `POST /api/announcements/tts/` - Create TTS announcement
- `POST /api/announcements/upload/` - Upload announcement audio
- `PATCH /api/announcements/{id}/` - Update announcement
- `DELETE /api/announcements/{id}/` - Delete announcement
- `POST /api/announcements/{id}/play-instant/` - Play instant announcement

#### Scheduler Endpoints
- `GET /api/schedules/` - List all schedules
- `POST /api/schedules/` - Create schedule
- `PATCH /api/schedules/{id}/` - Update schedule
- `DELETE /api/schedules/{id}/` - Delete schedule
- `POST /api/schedules/{id}/toggle/` - Toggle schedule active state

#### Zones & Devices Endpoints
- `GET /api/zones/` - List all zones/floors
- `POST /api/zones/` - Create zone
- `PATCH /api/zones/{id}/` - Update zone
- `DELETE /api/zones/{id}/` - Delete zone
- `GET /api/devices/` - List all devices (optional ?zone=id)
- `POST /api/devices/register/` - Register new device
- `PATCH /api/devices/{id}/` - Update device
- `DELETE /api/devices/{id}/` - Delete device

#### Playback Control Endpoints
- `GET /api/playback/state/?zone={id}` - Get playback state
- `POST /api/playback/play/` - Start playback
- `POST /api/playback/pause/` - Pause playback
- `POST /api/playback/resume/` - Resume playback
- `POST /api/playback/next/` - Skip to next
- `POST /api/playback/previous/` - Skip to previous
- `POST /api/playback/volume/` - Set volume
- `POST /api/playback/seek/` - Seek position

#### Admin Endpoints
- `GET /api/admin/clients/` - List all clients
- `POST /api/admin/clients/` - Create client
- `PATCH /api/admin/clients/{id}/` - Update client
- `DELETE /api/admin/clients/{id}/` - Delete client
- `GET /api/admin/users/` - List all users
- `POST /api/admin/users/` - Create user
- `PATCH /api/admin/users/{id}/` - Update user
- `DELETE /api/admin/users/{id}/` - Delete user
- `GET /api/admin/stats/` - Get system statistics

#### WebSocket Endpoints
- `WS /ws/playback/{zone_id}/?token={access_token}` - Real-time playback updates
- `WS /ws/events/?token={access_token}` - Real-time event notifications

### Step 3: Data Models (TypeScript Types)

All data models are defined in `/src/lib/types.ts`. Here are the key types:

```typescript
// User Roles
type UserRole = 'admin' | 'client' | 'floor_user';

// User
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clientId?: string;
  floorId?: string; // For floor_user role
  createdAt: Date;
  lastSeen: Date;
}

// Client (Business Customer)
interface Client {
  id: string;
  name: string;
  businessName: string;
  email: string;
  telephone: string;
  description: string;
  status: 'active' | 'suspended' | 'trial';
  trialDays: number;
  trialEndsAt?: Date;
  subscriptionPrice: number;
  subscriptionStatus: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  premiumFeatures: {
    multiFloor: boolean;
    aiCredits: number;
    maxFloors: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Floor (Zone)
interface Floor {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  deviceIds: string[];
  isPremium: boolean; // First floor free, additional are premium
  createdAt: Date;
  createdBy: string;
}

// Device
interface Device {
  id: string;
  name: string;
  clientId: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  zone?: string;
}

// Folder
interface Folder {
  id: string;
  name: string;
  clientId: string;
  parentId?: string;
  type: 'music' | 'announcements';
  createdAt: Date;
  createdBy: string;
}

// Music File
interface MusicFile {
  id: string;
  name: string;
  folderId: string;
  clientId: string;
  url: string;
  size: number;
  duration: number;
  type: string;
  createdAt: Date;
  createdBy: string;
}

// Announcement Script
interface AnnouncementScript {
  id: string;
  title: string;
  text: string;
  clientId: string;
  folderId?: string;
  enabled: boolean;
  category?: string;
  createdAt: Date;
  createdBy: string;
}

// Announcement Audio
interface AnnouncementAudio {
  id: string;
  title: string;
  scriptId?: string;
  clientId: string;
  folderId?: string;
  url: string;
  duration: number;
  type: 'tts' | 'uploaded' | 'recorded';
  enabled: boolean;
  category?: string;
  createdAt: Date;
  createdBy: string;
}

// Schedule (Interval-based)
interface IntervalSchedule {
  type: 'interval';
  intervalMinutes: number;
  announcementIds: string[];
  avoidRepeat: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
}

// Schedule (Timeline-based)
interface TimelineSchedule {
  type: 'timeline';
  cycleDurationMinutes: number;
  announcements: {
    announcementId: string;
    timestampSeconds: number;
  }[];
}

// Schedule
interface Schedule {
  id: string;
  name: string;
  clientId: string;
  deviceIds: string[];
  enabled: boolean;
  schedule: IntervalSchedule | TimelineSchedule;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

// Channel Playlist
interface ChannelPlaylist {
  id: string;
  name: string;
  description: string;
  clientId: string;
  floorIds: string[];
  items: ChannelPlaylistItem[];
  defaultMusicInterval: number;
  defaultAnnouncementInterval: number;
  shuffleMusic: boolean;
  shuffleAnnouncements: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  enabled: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

interface ChannelPlaylistItem {
  id: string;
  type: 'music' | 'announcement';
  contentId: string;
  intervalMinutes?: number;
  fixedTimes?: string[];
}
```

## Frontend Usage Examples

### Using Services Directly

```typescript
import { musicService, announcementsService } from '@/lib/services';

// Upload music file
const file = event.target.files[0];
const result = await musicService.uploadMusicFile(
  file,
  { folder_id: 'folder123', title: 'My Song' },
  (progress) => console.log(`Upload: ${progress}%`)
);

// Create TTS announcement
const announcement = await announcementsService.createTTSAnnouncement({
  title: 'Special Offer',
  text: 'Get 20% off today only!',
  folder_id: 'folder456'
});

// Play instant announcement
await announcementsService.playInstant('announcement123', ['floor1', 'floor2']);
```

### Using React Hooks

```typescript
import { useMusicFiles, useMusicUpload, useFloors } from '@/lib/hooks/useData';

function MusicLibrary() {
  // Fetch data with automatic loading states
  const { data: musicFiles, loading, error, refetch } = useMusicFiles('folder123');
  const { data: floors } = useFloors();
  
  // Upload with progress tracking
  const { upload, progress, loading: uploading } = useMusicUpload();
  
  const handleUpload = async (file: File) => {
    await upload(file, { folder_id: 'folder123' });
    refetch(); // Refresh the list
  };
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {musicFiles?.map(file => (
        <MusicItem key={file.id} file={file} />
      ))}
      {uploading && <ProgressBar value={progress} />}
    </div>
  );
}
```

### Using Mutations

```typescript
import { useMutation } from '@/lib/hooks/useData';
import { musicService } from '@/lib/services';

function CreateFolder() {
  const { mutate, loading, error } = useMutation(
    musicService.createFolder,
    {
      onSuccess: (folder) => {
        console.log('Folder created:', folder);
        toast.success('Folder created successfully!');
      },
      onError: (error) => {
        toast.error(`Failed to create folder: ${error.message}`);
      }
    }
  );
  
  const handleSubmit = () => {
    mutate({ name: 'New Folder', description: 'My music' });
  };
  
  return (
    <button onClick={handleSubmit} disabled={loading}>
      {loading ? 'Creating...' : 'Create Folder'}
    </button>
  );
}
```

## Authentication Flow

The frontend handles authentication automatically:

1. User signs in → `authService.signIn(email, password)`
2. Backend returns: `{ user: User, access: string, refresh: string }`
3. Tokens stored in localStorage
4. All API calls include: `Authorization: Bearer {access_token}`
5. On 401 error → Auto-refresh token → Retry request
6. On refresh failure → Redirect to login

## WebSocket Integration

```typescript
import { wsClient } from '@/lib/api';

// Connect to playback updates for a zone
wsClient.connect('floor123');

// Listen for events
wsClient.on('playback_update', (data) => {
  console.log('Playback state changed:', data);
});

wsClient.on('announcement_playing', (data) => {
  console.log('Announcement started:', data);
});

// Send commands
wsClient.send({
  type: 'volume_change',
  zone_id: 'floor123',
  volume: 0.75
});

// Disconnect
wsClient.disconnect();
```

## File Upload Format

All file uploads use `multipart/form-data`:

```typescript
// Frontend sends:
FormData {
  file: File,
  folder_id: string,
  title?: string,
  artist?: string,
  album?: string
}

// Backend returns:
MusicFile {
  id: string,
  name: string,
  url: string, // S3/CDN URL
  duration: number,
  size: number,
  type: string,
  ...
}
```

## Error Handling

The service layer handles errors consistently:

```typescript
try {
  const result = await musicService.uploadMusicFile(...);
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - auto-handled by API layer
  } else if (error.status === 413) {
    // File too large
    toast.error('File is too large. Maximum size is 100MB.');
  } else if (error.status === 429) {
    // Rate limited
    toast.error('Too many requests. Please try again later.');
  } else {
    // Generic error
    toast.error(error.message || 'Something went wrong');
  }
}
```

## Testing the Integration

### Step 1: Test with Mock Data (Default)
```bash
# .env
VITE_USE_MOCK_DATA=true

npm run dev
# App works fully with mock data
```

### Step 2: Point to Backend
```bash
# .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

npm run dev
# App now calls real backend
```

### Step 3: Test Each Endpoint

The service layer will automatically switch. Test each feature:
- ✅ Sign up / Sign in
- ✅ Upload music files
- ✅ Create folders
- ✅ Create TTS announcements
- ✅ Upload announcements
- ✅ Create schedules
- ✅ Manage zones/floors
- ✅ Register devices
- ✅ Playback controls
- ✅ WebSocket real-time updates

## API Response Formats

### Success Response
```json
{
  "id": "music123",
  "name": "song.mp3",
  "url": "https://cdn.sync2gear.com/files/music123.mp3",
  "duration": 245,
  "size": 4500000,
  "type": "audio/mpeg",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}
```

### Error Response
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

## Django Models Mapping

Here's how the TypeScript types map to Django models:

```python
# users/models.py
class User(AbstractUser):
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    client = models.ForeignKey('Client', null=True, on_delete=models.CASCADE)
    floor = models.ForeignKey('Floor', null=True, on_delete=models.SET_NULL)
    last_seen = models.DateTimeField(auto_now=True)

# clients/models.py
class Client(models.Model):
    name = models.CharField(max_length=200)
    business_name = models.CharField(max_length=200)
    email = models.EmailField()
    telephone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    subscription_price = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_customer_id = models.CharField(max_length=100, null=True)
    premium_features = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# zones/models.py
class Floor(models.Model):
    name = models.CharField(max_length=200)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    is_premium = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

class Device(models.Model):
    name = models.CharField(max_length=200)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    floor = models.ForeignKey('Floor', null=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    last_seen = models.DateTimeField(auto_now=True)

# music/models.py
class Folder(models.Model):
    name = models.CharField(max_length=200)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    parent = models.ForeignKey('self', null=True, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

class MusicFile(models.Model):
    name = models.CharField(max_length=200)
    folder = models.ForeignKey('Folder', on_delete=models.CASCADE)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    file = models.FileField(upload_to='music/')
    size = models.BigIntegerField()
    duration = models.IntegerField()  # seconds
    type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

# announcements/models.py
class AnnouncementScript(models.Model):
    title = models.CharField(max_length=200)
    text = models.TextField()
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    folder = models.ForeignKey('Folder', null=True, on_delete=models.SET_NULL)
    enabled = models.BooleanField(default=True)
    category = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

class AnnouncementAudio(models.Model):
    title = models.CharField(max_length=200)
    script = models.ForeignKey('AnnouncementScript', null=True, on_delete=models.SET_NULL)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    folder = models.ForeignKey('Folder', null=True, on_delete=models.SET_NULL)
    file = models.FileField(upload_to='announcements/')
    duration = models.IntegerField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)

# scheduler/models.py
class Schedule(models.Model):
    name = models.CharField(max_length=200)
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    devices = models.ManyToManyField('Device')
    enabled = models.BooleanField(default=True)
    schedule = models.JSONField()  # IntervalSchedule or TimelineSchedule
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)

# playlists/models.py
class ChannelPlaylist(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    client = models.ForeignKey('Client', on_delete=models.CASCADE)
    floors = models.ManyToManyField('Floor')
    items = models.JSONField(default=list)
    default_music_interval = models.IntegerField(default=30)
    default_announcement_interval = models.IntegerField(default=15)
    shuffle_music = models.BooleanField(default=True)
    shuffle_announcements = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## Security & Permissions

The backend must implement these permission checks:

1. **Admin users** - Full access to all clients and admin endpoints
2. **Client users** - Access only to their own client's data
3. **Floor users** - Access only to their assigned floor's data

```python
# Example Django permission check
class MusicFileViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return MusicFile.objects.all()
        elif user.role == 'client':
            return MusicFile.objects.filter(client=user.client)
        elif user.role == 'floor_user':
            return MusicFile.objects.filter(
                client=user.client,
                folder__floor=user.floor
            )
```

## Next Steps for Backend Team

1. ✅ Review this guide and `/src/lib/types.ts`
2. ✅ Set up Django project with models matching the types
3. ✅ Implement authentication endpoints (JWT recommended)
4. ✅ Implement file upload endpoints (S3/CloudFront recommended)
5. ✅ Implement WebSocket server for real-time updates
6. ✅ Test each endpoint with the frontend
7. ✅ Deploy backend and update `VITE_API_BASE_URL`

## Support

All frontend code is ready. The service layer (`/src/lib/services.ts`) handles:
- ✅ Automatic mock/real backend switching
- ✅ Token management & refresh
- ✅ Error handling
- ✅ File upload progress
- ✅ TypeScript type safety

The React hooks (`/src/lib/hooks/useData.ts`) provide:
- ✅ Automatic loading states
- ✅ Error states
- ✅ Data refetching
- ✅ Upload progress tracking
- ✅ Mutation callbacks

**The frontend is 100% backend-ready. Just set up the Django API endpoints matching the spec in `/src/lib/api.ts` and it will work seamlessly.**
