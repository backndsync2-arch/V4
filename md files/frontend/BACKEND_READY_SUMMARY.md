# sync2gear Backend Integration - Complete & Ready

## ✅ Status: 100% Ready for Backend Integration

The sync2gear frontend is **fully prepared** for backend integration with a professional service layer architecture that automatically switches between mock data (development) and real API calls (production).

---

## What Was Done

### 1. Service Layer Architecture (`/src/lib/services.ts`)

Created a comprehensive service layer that:
- ✅ Automatically switches between mock data and real backend based on environment variable
- ✅ Provides all data operations: music, announcements, schedules, zones, devices, etc.
- ✅ Handles file uploads with progress tracking
- ✅ Simulates realistic API delays in mock mode
- ✅ Includes proper error handling
- ✅ TypeScript type-safe throughout

**Example:**
```typescript
// Works with mock data OR real backend - no code changes needed!
const musicFiles = await musicService.getMusicFiles('folder123');
const result = await musicService.uploadMusicFile(file, data, onProgress);
```

### 2. React Data Hooks (`/src/lib/hooks/useData.ts`)

Created custom React hooks for all data operations:
- ✅ `useMusicFiles()` - Fetch music files with auto-loading states
- ✅ `useFloors()` - Fetch zones/floors
- ✅ `useSchedules()` - Fetch schedules
- ✅ `useAnnouncementAudio()` - Fetch announcements
- ✅ `useMusicUpload()` - Upload with progress tracking
- ✅ `useMutation()` - Generic mutation hook
- ✅ All hooks include: loading, error, and refetch states

**Example:**
```typescript
function MusicLibrary() {
  const { data, loading, error, refetch } = useMusicFiles('folder123');
  const { upload, progress } = useMusicUpload();
  
  // No manual state management needed!
}
```

### 3. Complete API Layer (`/src/lib/api.ts`)

Already exists with all endpoints defined:
- ✅ Authentication (login, signup, refresh, logout)
- ✅ Music library (upload, folders, search)
- ✅ Announcements (TTS, upload, instant play)
- ✅ Scheduler (create, update, toggle)
- ✅ Zones & Devices (manage, register)
- ✅ Playback control (play, pause, volume, seek)
- ✅ Admin (clients, users, stats)
- ✅ WebSocket client for real-time updates
- ✅ Automatic token refresh on 401
- ✅ Error handling with APIError class

### 4. TypeScript Types (`/src/lib/types.ts`)

All data models are fully typed:
- ✅ User, Client, Device, Floor
- ✅ MusicFile, Folder
- ✅ AnnouncementScript, AnnouncementAudio
- ✅ Schedule (IntervalSchedule, TimelineSchedule)
- ✅ ChannelPlaylist, PlayEvent, AuditLog

### 5. Mock Data (`/src/lib/mockData.ts`)

Comprehensive mock data for development:
- ✅ Users (admin, client, floor_user)
- ✅ Clients with premium features
- ✅ Devices (online/offline)
- ✅ Floors/zones
- ✅ Music folders and files
- ✅ Announcement scripts and audio
- ✅ Announcement template packs (Retail, Restaurant, Gym, etc.)
- ✅ Schedules (interval and timeline)
- ✅ Channel playlists

### 6. Environment Configuration

Created environment system:
- ✅ `.env.example` - Template with all variables
- ✅ `VITE_USE_MOCK_DATA` - Toggle mock/real backend
- ✅ `VITE_API_BASE_URL` - Backend API URL
- ✅ `VITE_WS_BASE_URL` - WebSocket URL

### 7. Documentation

Created comprehensive guides:
- ✅ `/BACKEND_INTEGRATION_GUIDE.md` - Complete integration guide
- ✅ `/BACKEND_API_SPEC.md` - Full API specification
- ✅ `/INTEGRATION_QUICK_START.md` - Quick start for both teams
- ✅ `.env.example` - Environment configuration template

---

## How It Works

### Architecture Flow

```
┌──────────────────────────────────────────┐
│     React Components                     │
│  (No changes needed for backend)         │
└──────────────────┬───────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────┐
│     Custom React Hooks                   │
│  (useData.ts - Auto loading/error)       │
└──────────────────┬───────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────┐
│     Service Layer (services.ts)          │
│  ┌─────────────────────────────────┐    │
│  │  if (VITE_USE_MOCK_DATA)        │    │
│  │    return mockData              │    │
│  │  else                            │    │
│  │    return api.call()            │    │
│  └─────────────────────────────────┘    │
└──────────────────┬───────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ↓                   ↓
┌──────────────┐    ┌──────────────┐
│  Mock Data   │    │  API Layer   │
│ (mockData.ts)│    │  (api.ts)    │
└──────────────┘    └──────┬───────┘
                           │
                           ↓
                   ┌──────────────┐
                   │    Backend   │
                   │  Django API  │
                   └──────────────┘
```

### Switching Modes

**Development Mode (Mock Data):**
```bash
# .env
VITE_USE_MOCK_DATA=true

# Result:
# ✅ All features work
# ✅ No backend needed
# ✅ Instant data responses
# ✅ Perfect for frontend development
```

**Production Mode (Real Backend):**
```bash
# .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# Result:
# ✅ All API calls go to real backend
# ✅ No code changes needed!
# ✅ Automatic token refresh
# ✅ WebSocket real-time updates
```

---

## What Backend Team Needs to Do

### 1. Review Documentation

Read these files in order:
1. `/INTEGRATION_QUICK_START.md` - Start here
2. `/BACKEND_API_SPEC.md` - API endpoints specification
3. `/src/lib/types.ts` - Data models
4. `/BACKEND_INTEGRATION_GUIDE.md` - Detailed guide

### 2. Implement Endpoints

Implement these endpoints (priority order):

**Phase 1 - Core (Week 1):**
- [ ] `POST /api/auth/login/` - User login
- [ ] `POST /api/auth/signup/` - User registration
- [ ] `GET /api/auth/me/` - Get current user
- [ ] `POST /api/auth/refresh/` - Refresh token
- [ ] `GET /api/music/folders/` - List music folders
- [ ] `POST /api/music/upload/` - Upload music file
- [ ] `GET /api/music/files/` - List music files

**Phase 2 - Features (Week 2):**
- [ ] `POST /api/announcements/tts/` - Create TTS announcement
- [ ] `POST /api/announcements/upload/` - Upload announcement
- [ ] `GET /api/announcements/` - List announcements
- [ ] `POST /api/announcements/{id}/play-instant/` - Play instant
- [ ] `GET /api/zones/` - List floors/zones
- [ ] `GET /api/devices/` - List devices
- [ ] `POST /api/devices/register/` - Register device

**Phase 3 - Advanced (Week 3):**
- [ ] `GET /api/schedules/` - List schedules
- [ ] `POST /api/schedules/` - Create schedule
- [ ] `POST /api/playback/play/` - Start playback
- [ ] `POST /api/playback/pause/` - Pause playback
- [ ] `WS /ws/playback/{zone_id}/` - Real-time updates

**Phase 4 - Admin (Week 4):**
- [ ] `GET /api/admin/clients/` - List clients
- [ ] `GET /api/admin/users/` - List users
- [ ] `GET /api/admin/stats/` - System stats

### 3. Match Data Formats

Ensure backend responses match TypeScript types exactly:

```python
# ✅ Good - Matches frontend types
{
    "id": "music123",
    "name": "song.mp3",
    "folderId": "folder123",  # camelCase
    "clientId": "client123",  # camelCase
    "url": "https://cdn.sync2gear.com/files/music123.mp3",
    "size": 4500000,
    "duration": 245,
    "type": "audio/mpeg",
    "createdAt": "2025-01-24T12:00:00Z",  # ISO 8601
    "createdBy": "user123"
}

# ❌ Bad - Doesn't match
{
    "id": "music123",
    "name": "song.mp3",
    "folder_id": "folder123",  # ❌ snake_case (should be camelCase)
    "client_id": "client123",  # ❌ snake_case
    "file_url": "...",         # ❌ Should be "url"
    "created_at": "2025-01-24 12:00:00"  # ❌ Not ISO format
}
```

### 4. Test Integration

```bash
# 1. Start backend
python manage.py runserver

# 2. Update frontend .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api

# 3. Start frontend
npm run dev

# 4. Test each feature
# - Login/Signup
# - Upload music
# - Create announcements
# - Manage zones
# - etc.
```

---

## For Frontend Team

### Using Services

```typescript
import { musicService, announcementsService } from '@/lib/services';

// Upload music
const file = event.target.files[0];
const result = await musicService.uploadMusicFile(
  file,
  { folder_id: 'folder123' },
  (progress) => console.log(`${progress}%`)
);

// Create TTS announcement
const announcement = await announcementsService.createTTSAnnouncement({
  title: 'Special Offer',
  text: 'Get 20% off today!',
  folder_id: 'folder456'
});
```

### Using Hooks in Components

```typescript
import { useMusicFiles, useMusicUpload } from '@/lib/hooks/useData';

function MusicLibrary() {
  const { data: files, loading, error, refetch } = useMusicFiles('folder123');
  const { upload, progress, loading: uploading } = useMusicUpload();
  
  const handleUpload = async (file: File) => {
    await upload(file, { folder_id: 'folder123' });
    refetch(); // Refresh the list
  };
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error.message} />;
  
  return (
    <div>
      {files?.map(file => <MusicItem key={file.id} file={file} />)}
      {uploading && <ProgressBar value={progress} />}
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
    </div>
  );
}
```

### No Component Changes Needed

When backend is ready, just update `.env`:
```bash
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
```

**All components continue working without any code changes!**

---

## Key Features

### ✅ Automatic Mock/Real Switching
- Single environment variable controls entire data source
- No conditional logic in components
- Seamless development experience

### ✅ Type Safety
- All data models fully typed in TypeScript
- Backend must match these types exactly
- Compile-time error checking

### ✅ Error Handling
- Service layer catches and handles errors
- Automatic token refresh on 401
- User-friendly error messages

### ✅ File Upload Progress
- Real-time upload progress tracking
- Support for batch uploads
- Cancel/retry capability

### ✅ Real-Time Updates
- WebSocket client ready
- Automatic reconnection
- Event-driven architecture

### ✅ Authentication
- JWT token management
- Automatic token refresh
- Secure token storage

---

## Files Created/Updated

### New Files
1. ✅ `/src/lib/services.ts` - Service layer with auto-switching
2. ✅ `/src/lib/hooks/useData.ts` - React data hooks
3. ✅ `/BACKEND_INTEGRATION_GUIDE.md` - Complete integration guide
4. ✅ `/BACKEND_API_SPEC.md` - API specification
5. ✅ `/INTEGRATION_QUICK_START.md` - Quick start guide
6. ✅ `/.env.example` - Environment template
7. ✅ `/BACKEND_READY_SUMMARY.md` - This file

### Existing Files (Ready)
1. ✅ `/src/lib/api.ts` - API layer (already complete)
2. ✅ `/src/lib/types.ts` - TypeScript types (already complete)
3. ✅ `/src/lib/mockData.ts` - Mock data (already complete)

---

## Testing

### Frontend Testing
```bash
# Test with mock data
VITE_USE_MOCK_DATA=true npm run dev
# ✅ All features should work

# Test with backend
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
# ✅ Should call real API endpoints
```

### Backend Testing
```bash
# Start backend
python manage.py runserver

# Test endpoint manually
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'

# Should return:
{
  "user": { ... },
  "access": "token...",
  "refresh": "token..."
}
```

---

## Environment Variables Summary

```bash
# Development (Mock Data - No Backend Needed)
VITE_USE_MOCK_DATA=true

# Development (With Local Backend)
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# Production
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws
```

---

## Next Steps

### For Backend Team (Cursor AI)
1. ✅ Review `/INTEGRATION_QUICK_START.md`
2. ✅ Read `/BACKEND_API_SPEC.md` for all endpoints
3. ✅ Check `/src/lib/types.ts` for data models
4. ✅ Implement Phase 1 endpoints (auth + music)
5. ✅ Test with frontend
6. ✅ Implement remaining phases
7. ✅ Deploy to production

### For Frontend Team
1. ✅ Continue development with `VITE_USE_MOCK_DATA=true`
2. ✅ Use services from `/src/lib/services.ts`
3. ✅ Use hooks from `/src/lib/hooks/useData.ts`
4. ✅ When backend ready, switch to `VITE_USE_MOCK_DATA=false`
5. ✅ Test all features with real backend
6. ✅ Report any API mismatches to backend team

---

## Support

All documentation is complete and ready:

| Document | Purpose |
|----------|---------|
| `/INTEGRATION_QUICK_START.md` | Fast setup guide for both teams |
| `/BACKEND_API_SPEC.md` | Complete API endpoints reference |
| `/BACKEND_INTEGRATION_GUIDE.md` | Detailed integration instructions |
| `/src/lib/types.ts` | All TypeScript data models |
| `/src/lib/services.ts` | Service layer implementation |
| `/src/lib/hooks/useData.ts` | React hooks for data |
| `/src/lib/api.ts` | API layer (already complete) |
| `/.env.example` | Environment configuration |

---

## Summary

✅ **Service layer complete** - Automatic mock/real switching  
✅ **React hooks complete** - Easy data fetching in components  
✅ **API layer complete** - All endpoints defined  
✅ **Types complete** - Full TypeScript coverage  
✅ **Mock data complete** - Realistic test data  
✅ **Documentation complete** - Guides for all teams  
✅ **Environment config complete** - Easy mode switching  

**The frontend is 100% ready for backend integration. No frontend code changes will be needed when the backend is ready - just update the `.env` file!**

**For Cursor AI / Backend Team: Start with `/INTEGRATION_QUICK_START.md` and `/BACKEND_API_SPEC.md`. Everything you need is documented and ready.**
