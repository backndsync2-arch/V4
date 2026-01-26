# sync2gear - Backend Integration Complete ✅

**Status:** Frontend is 100% ready for backend integration

---

## 🚀 Quick Start

### For Frontend Developers

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start development (uses mock data by default)
npm run dev

# ✅ App runs fully without backend!
```

### For Backend Developers

```bash
# 1. Read the integration guides
# - Start here: /INTEGRATION_QUICK_START.md
# - API spec: /BACKEND_API_SPEC.md
# - Full guide: /BACKEND_INTEGRATION_GUIDE.md

# 2. Review TypeScript types
# - See: /src/lib/types.ts

# 3. Implement Django API matching the spec

# 4. Test with frontend
# Update .env: VITE_USE_MOCK_DATA=false
npm run dev
```

---

## 📚 Documentation

All documentation is complete and ready:

### 📖 Essential Guides

| File | Description | Audience |
|------|-------------|----------|
| [`/INTEGRATION_QUICK_START.md`](./INTEGRATION_QUICK_START.md) | Start here - Quick setup for both teams | **Everyone** |
| [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md) | Complete API endpoints specification | **Backend** |
| [`/BACKEND_INTEGRATION_GUIDE.md`](./BACKEND_INTEGRATION_GUIDE.md) | Detailed integration instructions | **Backend** |
| [`/BACKEND_READY_SUMMARY.md`](./BACKEND_READY_SUMMARY.md) | What was done and current status | **Everyone** |

### 💻 Code Reference

| File | Description |
|------|-------------|
| [`/src/lib/types.ts`](./src/lib/types.ts) | **All TypeScript data models** - Backend must match these |
| [`/src/lib/services.ts`](./src/lib/services.ts) | Service layer with auto mock/real switching |
| [`/src/lib/hooks/useData.ts`](./src/lib/hooks/useData.ts) | React hooks for data fetching |
| [`/src/lib/api.ts`](./src/lib/api.ts) | API layer - All endpoints defined |
| [`/src/lib/mockData.ts`](./src/lib/mockData.ts) | Mock data for development |
| [`/.env.example`](./.env.example) | Environment configuration template |

---

## 🏗️ Architecture

### Data Flow

```
┌───────────────────────────────────────┐
│      React Components                 │
│  (No changes needed)                  │
└──────────────┬────────────────────────┘
               │
               ↓
┌───────────────────────────────────────┐
│      Custom React Hooks               │
│  • useMusicFiles()                    │
│  • useFloors()                        │
│  • useSchedules()                     │
│  • Auto loading/error states          │
└──────────────┬────────────────────────┘
               │
               ↓
┌───────────────────────────────────────┐
│      Service Layer                    │
│  ┌─────────────────────────────────┐ │
│  │ if (USE_MOCK_DATA)              │ │
│  │   return mockData               │ │
│  │ else                            │ │
│  │   return api.call()             │ │
│  └─────────────────────────────────┘ │
└──────────────┬────────────────────────┘
               │
      ┌────────┴────────┐
      ↓                 ↓
┌──────────┐    ┌──────────────┐
│Mock Data │    │  API Layer   │
└──────────┘    └──────┬───────┘
                       │
                       ↓
               ┌──────────────┐
               │   Backend    │
               │  Django API  │
               └──────────────┘
```

### Key Components

1. **Service Layer** (`/src/lib/services.ts`)
   - Automatic mock/real backend switching
   - All data operations (CRUD)
   - File upload with progress
   - Error handling

2. **React Hooks** (`/src/lib/hooks/useData.ts`)
   - `useMusicFiles()`, `useFloors()`, etc.
   - Automatic loading states
   - Error handling
   - Data refetching

3. **API Layer** (`/src/lib/api.ts`)
   - HTTP client with auth
   - Token management
   - Automatic token refresh
   - WebSocket client

4. **TypeScript Types** (`/src/lib/types.ts`)
   - All data models
   - Backend must match these exactly
   - Type-safe throughout

---

## 🔧 Environment Configuration

### Development Mode (No Backend)

```bash
# .env
VITE_USE_MOCK_DATA=true

# Features:
# ✅ All functionality works
# ✅ No backend needed
# ✅ Instant responses
# ✅ Perfect for UI development
```

### Production Mode (Real Backend)

```bash
# .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# Features:
# ✅ Calls real backend API
# ✅ No code changes needed!
# ✅ Automatic token refresh
# ✅ WebSocket real-time updates
```

---

## 💡 Usage Examples

### Using Services Directly

```typescript
import { musicService, announcementsService } from '@/lib/services';

// Upload music file
async function uploadMusic(file: File) {
  const result = await musicService.uploadMusicFile(
    file,
    { folder_id: 'folder123', title: 'My Song' },
    (progress) => console.log(`Upload: ${progress}%`)
  );
  console.log('Uploaded:', result);
}

// Create TTS announcement
async function createAnnouncement() {
  const announcement = await announcementsService.createTTSAnnouncement({
    title: 'Special Offer',
    text: 'Get 20% off today only!',
    voice: 'en-US-Neural2-F'
  });
  console.log('Created:', announcement);
}

// Play instant announcement
async function playNow(announcementId: string, zones: string[]) {
  await announcementsService.playInstant(announcementId, zones);
  console.log('Playing on zones:', zones);
}
```

### Using React Hooks

```typescript
import { useMusicFiles, useMusicUpload, useFloors } from '@/lib/hooks/useData';

function MusicLibrary() {
  // Fetch music files with auto-loading states
  const { data: musicFiles, loading, error, refetch } = useMusicFiles('folder123');
  
  // Upload with progress tracking
  const { upload, progress, loading: uploading } = useMusicUpload();
  
  // Fetch floors
  const { data: floors } = useFloors();
  
  const handleUpload = async (file: File) => {
    await upload(file, { folder_id: 'folder123' });
    refetch(); // Refresh the list
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;
  
  return (
    <div>
      <h1>Music Library</h1>
      
      {/* Upload Section */}
      <input 
        type="file" 
        onChange={e => handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <ProgressBar value={progress} />}
      
      {/* Music List */}
      <div>
        {musicFiles?.map(file => (
          <MusicItem key={file.id} file={file} />
        ))}
      </div>
      
      {/* Floors Selector */}
      <select>
        {floors?.map(floor => (
          <option key={floor.id} value={floor.id}>{floor.name}</option>
        ))}
      </select>
    </div>
  );
}
```

### Using Mutations

```typescript
import { useMutation } from '@/lib/hooks/useData';
import { musicService } from '@/lib/services';
import { toast } from 'sonner';

function CreateFolderButton() {
  const { mutate, loading, error } = useMutation(
    musicService.createFolder,
    {
      onSuccess: (folder) => {
        toast.success(`Folder "${folder.name}" created!`);
      },
      onError: (error) => {
        toast.error(`Failed to create folder: ${error.message}`);
      }
    }
  );
  
  const handleClick = () => {
    mutate({ name: 'New Playlist', description: 'My favorites' });
  };
  
  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Creating...' : 'Create Folder'}
    </button>
  );
}
```

---

## 🔐 Authentication Flow

The frontend handles authentication automatically:

1. User signs in → `authService.signIn(email, password)`
2. Backend returns: `{ user: User, access: string, refresh: string }`
3. Tokens stored in localStorage
4. All API calls include: `Authorization: Bearer {access_token}`
5. On 401 error → Auto-refresh token → Retry request
6. On refresh failure → Redirect to login

**No manual token management needed in components!**

---

## 📡 WebSocket Integration

```typescript
import { wsClient } from '@/lib/api';

// Connect to real-time updates
wsClient.connect('floor123');

// Listen for playback updates
wsClient.on('playback_update', (data) => {
  console.log('Playback state:', data);
  updateUI(data);
});

// Listen for announcement events
wsClient.on('announcement_playing', (data) => {
  console.log('Announcement:', data);
  showNotification(data);
});

// Send commands
wsClient.send({
  type: 'volume_change',
  zone_id: 'floor123',
  volume: 0.75
});

// Disconnect when done
wsClient.disconnect();
```

---

## 📦 What's Included

### ✅ Service Layer
- [x] `musicService` - Music library operations
- [x] `announcementsService` - Announcement operations
- [x] `schedulerService` - Schedule management
- [x] `zonesService` - Zone/floor/device management
- [x] `channelPlaylistsService` - Playlist operations
- [x] `authService` - Authentication
- [x] `clientService` - Client management
- [x] `adminService` - Admin operations

### ✅ React Hooks
- [x] `useMusicFiles()` - Fetch music files
- [x] `useMusicFolders()` - Fetch music folders
- [x] `useAnnouncementAudio()` - Fetch announcements
- [x] `useSchedules()` - Fetch schedules
- [x] `useFloors()` - Fetch zones/floors
- [x] `useDevices()` - Fetch devices
- [x] `useCurrentUser()` - Get current user
- [x] `useCurrentClient()` - Get current client
- [x] `useMusicUpload()` - Upload with progress
- [x] `useAnnouncementUpload()` - Upload with progress
- [x] `useMutation()` - Generic mutation hook

### ✅ API Layer
- [x] Authentication endpoints
- [x] Music library endpoints
- [x] Announcements endpoints
- [x] Scheduler endpoints
- [x] Zones & devices endpoints
- [x] Playback control endpoints
- [x] Admin endpoints
- [x] WebSocket client
- [x] Automatic token refresh
- [x] Error handling

### ✅ TypeScript Types
- [x] User, Client, Device, Floor
- [x] MusicFile, Folder
- [x] AnnouncementScript, AnnouncementAudio
- [x] Schedule (Interval & Timeline)
- [x] ChannelPlaylist
- [x] PlayEvent, AuditLog

### ✅ Mock Data
- [x] Users (admin, client, floor_user)
- [x] Clients with premium features
- [x] Devices (online/offline)
- [x] Floors/zones
- [x] Music folders and files
- [x] Announcement scripts and audio
- [x] Announcement templates (6 packs)
- [x] Schedules
- [x] Channel playlists

---

## 🧪 Testing

### Test with Mock Data

```bash
# 1. Ensure mock mode is enabled
# .env
VITE_USE_MOCK_DATA=true

# 2. Start dev server
npm run dev

# 3. Test all features
# ✅ All should work without backend
```

### Test with Real Backend

```bash
# 1. Start Django backend
cd backend
python manage.py runserver

# 2. Update frontend .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# 3. Start frontend
npm run dev

# 4. Test each feature
# - Login/Signup
# - Upload music
# - Create announcements
# - Manage schedules
# - Control playback
```

---

## 🎯 Backend Requirements

### Phase 1: Core (Week 1)
- [ ] Authentication (login, signup, refresh)
- [ ] Music library (folders, upload, list)
- [ ] File storage (S3/CDN)

### Phase 2: Features (Week 2)
- [ ] Announcements (TTS, upload)
- [ ] Zones/floors management
- [ ] Device management
- [ ] Instant announcement playback

### Phase 3: Advanced (Week 3)
- [ ] Scheduler (interval & timeline)
- [ ] Playback control
- [ ] WebSocket server
- [ ] Real-time updates

### Phase 4: Admin (Week 4)
- [ ] Client management
- [ ] User management
- [ ] System statistics
- [ ] Analytics

---

## 📊 Data Models

All models are in `/src/lib/types.ts`. Backend must match exactly:

### Example: MusicFile

```typescript
// Frontend expects this structure
interface MusicFile {
  id: string;
  name: string;
  folderId: string;          // ⚠️ camelCase
  clientId: string;          // ⚠️ camelCase
  url: string;
  size: number;
  duration: number;
  type: string;
  createdAt: Date;           // ⚠️ ISO 8601 format
  createdBy: string;         // ⚠️ camelCase
}

// ✅ Good backend response
{
  "id": "music123",
  "name": "song.mp3",
  "folderId": "folder123",
  "clientId": "client123",
  "url": "https://cdn.sync2gear.com/music/music123.mp3",
  "size": 4500000,
  "duration": 245,
  "type": "audio/mpeg",
  "createdAt": "2025-01-24T12:00:00Z",
  "createdBy": "user123"
}

// ❌ Bad backend response (won't work)
{
  "id": "music123",
  "name": "song.mp3",
  "folder_id": "folder123",        // ❌ Wrong: snake_case
  "client_id": "client123",        // ❌ Wrong: snake_case
  "file_url": "...",               // ❌ Wrong: should be "url"
  "created_at": "2025-01-24 12:00" // ❌ Wrong: not ISO format
}
```

---

## 🚨 Common Issues

### Issue: "Network Error"

**Cause:** Backend not running or CORS not configured

**Solution:**
```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative port
]
```

### Issue: 401 Unauthorized

**Cause:** Token expired or invalid

**Solution:** Frontend automatically handles token refresh. Check:
- User is logged in
- `/auth/refresh/` endpoint works
- Tokens are stored in localStorage

### Issue: File upload fails

**Cause:** File size limit or invalid format

**Solution:**
```python
# Django settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB

# Validate file types in view
ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/m4a']
```

---

## 📝 API Response Format

Backend must return camelCase JSON matching TypeScript types:

```python
# Django: Use a serializer to convert snake_case to camelCase
from rest_framework import serializers

class MusicFileSerializer(serializers.ModelSerializer):
    folderId = serializers.CharField(source='folder_id')
    clientId = serializers.CharField(source='client_id')
    createdAt = serializers.DateTimeField(source='created_at')
    createdBy = serializers.CharField(source='created_by')
    
    class Meta:
        model = MusicFile
        fields = ['id', 'name', 'folderId', 'clientId', 'url', 
                  'size', 'duration', 'type', 'createdAt', 'createdBy']
```

---

## 🔄 Switching Between Mock and Real Backend

### Method 1: Environment Variable (Recommended)

```bash
# .env for development
VITE_USE_MOCK_DATA=true

# .env for production
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
```

### Method 2: Dynamic Check

The service layer automatically checks:

```typescript
// In /src/lib/services.ts
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const musicService = {
  getMusicFiles: async (folderId?: string) => {
    if (USE_MOCK_DATA) {
      // Return mock data
      return mockData.mockMusicFiles;
    }
    // Call real API
    return api.musicAPI.getMusicFiles(folderId);
  }
};
```

**No component changes needed - just update .env!**

---

## 📚 Additional Resources

- **Django Backend Guide**: See existing `/DJANGO_BACKEND_COMPLETE_GUIDE.md`
- **Frontend Features**: See `/ANNOUNCEMENTS_FINAL_FEATURES.md`
- **Deployment**: See `/DEPLOYMENT_READINESS_REPORT.md`

---

## ✅ Checklist for Backend Team

- [ ] Review `/INTEGRATION_QUICK_START.md`
- [ ] Review `/BACKEND_API_SPEC.md`
- [ ] Check `/src/lib/types.ts` for data models
- [ ] Implement Phase 1 endpoints (auth + music)
- [ ] Test with frontend (`VITE_USE_MOCK_DATA=false`)
- [ ] Fix any data format mismatches
- [ ] Implement Phase 2 endpoints (announcements + zones)
- [ ] Implement Phase 3 endpoints (scheduler + playback)
- [ ] Set up WebSocket server
- [ ] Implement Phase 4 endpoints (admin)
- [ ] Deploy to production
- [ ] Update frontend `.env` with production URLs

---

## ✅ Checklist for Frontend Team

- [x] Service layer complete
- [x] React hooks complete
- [x] API layer complete
- [x] TypeScript types complete
- [x] Mock data complete
- [x] Documentation complete
- [ ] Test with real backend when ready
- [ ] Report any API mismatches
- [ ] Update production `.env`
- [ ] Deploy frontend

---

## 🎉 Summary

The frontend is **100% ready** for backend integration:

✅ **Service layer** - Auto-switches between mock and real backend  
✅ **React hooks** - Easy data fetching with auto loading/error  
✅ **API layer** - All endpoints defined and ready  
✅ **TypeScript types** - Complete type safety  
✅ **Mock data** - Realistic test data for development  
✅ **Documentation** - Complete guides for both teams  
✅ **Environment config** - Easy mode switching  

**No frontend code changes will be needed when backend is ready - just update `.env`!**

---

**Questions? Check the documentation:**
- `/INTEGRATION_QUICK_START.md` - Quick setup
- `/BACKEND_API_SPEC.md` - API reference
- `/BACKEND_INTEGRATION_GUIDE.md` - Detailed guide
