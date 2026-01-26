# Integration Quick Start Guide

**Get Backend & Frontend Working Together in Minutes**

---

## For Frontend Developers

### Development Mode (No Backend Needed)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Use mock data (default)
# .env should have:
VITE_USE_MOCK_DATA=true

# 3. Start development server
npm run dev

# ✅ App runs fully with mock data
# ✅ All features work
# ✅ No backend required
```

### Production Mode (With Backend)

```bash
# 1. Update .env to use real backend
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# 2. Start development server
npm run dev

# ✅ App now calls real backend
# ✅ No code changes needed!
```

**The service layer automatically switches between mock and real data.**

---

## For Backend Developers

### Step 1: Review API Specification

Read `/BACKEND_API_SPEC.md` for complete API endpoints list.

**Quick summary:**
- Authentication: `/api/auth/*`
- Music: `/api/music/*`
- Announcements: `/api/announcements/*`
- Scheduler: `/api/schedules/*`
- Zones: `/api/zones/*`, `/api/devices/*`
- Playback: `/api/playback/*`
- Admin: `/api/admin/*`
- WebSocket: `/ws/playback/*`, `/ws/events/*`

### Step 2: Check TypeScript Types

All data models are in `/src/lib/types.ts`:
- `User`, `Client`, `Device`, `Floor`
- `MusicFile`, `Folder`
- `AnnouncementScript`, `AnnouncementAudio`
- `Schedule`, `ChannelPlaylist`

### Step 3: Implement Backend

```python
# Example Django view (matching frontend expectations)
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['POST'])
def upload_music(request):
    file = request.FILES['file']
    folder_id = request.data.get('folder_id')
    
    # Save file to S3
    music_file = MusicFile.objects.create(
        name=file.name,
        file=file,
        folder_id=folder_id,
        client=request.user.client,
        created_by=request.user
    )
    
    # Frontend expects this exact format
    return Response({
        'id': str(music_file.id),
        'name': music_file.name,
        'folderId': folder_id,
        'clientId': str(music_file.client.id),
        'url': music_file.file.url,
        'size': music_file.file.size,
        'duration': music_file.duration,
        'type': music_file.type,
        'createdAt': music_file.created_at.isoformat(),
        'createdBy': str(music_file.created_by.id)
    }, status=201)
```

### Step 4: Test Integration

```bash
# Start Django backend
python manage.py runserver

# Frontend will connect automatically when:
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## Data Flow Example

### Uploading a Music File

**Frontend:**
```typescript
import { useMusicUpload } from '@/lib/hooks/useData';

function UploadButton() {
  const { upload, progress, loading } = useMusicUpload();
  
  const handleUpload = async (file: File) => {
    await upload(file, { folder_id: 'folder123' });
  };
  
  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

**What Happens:**
1. User selects file
2. Frontend calls `useMusicUpload` hook
3. Hook calls `musicService.uploadMusicFile()`
4. Service checks `VITE_USE_MOCK_DATA`:
   - If `true` → Returns mock data immediately
   - If `false` → Calls `api.musicAPI.uploadMusicFile()`
5. API layer makes `POST /api/music/upload/` request
6. Backend processes upload, returns `MusicFile` object
7. Frontend automatically updates UI with new file

**No component changes needed when switching from mock to real backend!**

---

## Key Files Reference

### Frontend Architecture

```
/src/lib/
├── types.ts              # All TypeScript interfaces (REVIEW THIS FIRST)
├── api.ts                # Raw API calls (DO NOT MODIFY)
├── services.ts           # Service layer with auto-switching (READY TO USE)
├── mockData.ts           # Development mock data
└── hooks/
    └── useData.ts        # React hooks for data fetching (USE THESE IN COMPONENTS)

/src/app/components/
└── [All React components use hooks from useData.ts]
```

### How It Works

```
Component → Hook → Service → API or Mock Data
                      ↓
                Environment Variable
                (VITE_USE_MOCK_DATA)
                      ↓
              true → Mock Data
              false → Real API
```

---

## Testing Checklist

### Frontend Team

- [x] App works with `VITE_USE_MOCK_DATA=true`
- [ ] App works with `VITE_USE_MOCK_DATA=false` and backend running
- [ ] All features tested with real backend
- [ ] Error handling works
- [ ] File uploads work with progress
- [ ] WebSocket updates work
- [ ] Token refresh works

### Backend Team

- [ ] All endpoints return data in correct format (matching TypeScript types)
- [ ] Authentication flow works (login, refresh, logout)
- [ ] File uploads work and return URLs
- [ ] CORS configured for frontend domain
- [ ] WebSocket authentication works
- [ ] Rate limiting implemented
- [ ] Client data isolation works (users only see their data)

---

## Common Issues & Solutions

### Issue: Frontend shows "Network Error"

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/api/auth/me/

# Check CORS is configured
# Django: Add frontend URL to CORS_ALLOWED_ORIGINS

# Check .env file
VITE_API_BASE_URL=http://localhost:8000/api  # Correct
VITE_API_BASE_URL=http://localhost:8000      # ❌ Wrong (missing /api)
```

### Issue: 401 Unauthorized

**Solution:**
```bash
# Frontend automatically handles token refresh
# But check:
# 1. User is logged in
# 2. Token is valid
# 3. /auth/refresh/ endpoint works
# 4. /auth/me/ endpoint returns user
```

### Issue: File upload fails

**Solution:**
```python
# Django: Check file size limits
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100MB

# Check S3 configuration if using cloud storage
# Check file type validation
```

### Issue: WebSocket won't connect

**Solution:**
```bash
# Check WebSocket URL
VITE_WS_BASE_URL=ws://localhost:8000/ws  # Dev
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws  # Prod (use wss:// not ws://)

# Django: Check WebSocket server is running
# Check token is passed in URL: ?token={access_token}
```

---

## Environment Variables Explained

### Frontend (.env)

```bash
# Toggle between mock and real backend
VITE_USE_MOCK_DATA=true|false

# Backend URLs (only used when VITE_USE_MOCK_DATA=false)
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

### Backend (.env)

```bash
# Django example
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost/sync2gear

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_STORAGE_BUCKET_NAME=sync2gear-media

# Google Cloud TTS (for announcements)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
```

---

## Next Steps

### Week 1: Core Backend

1. ✅ Set up Django project
2. ✅ Implement authentication (`/api/auth/*`)
3. ✅ Implement music endpoints (`/api/music/*`)
4. ✅ Test with frontend

### Week 2: Features

1. ✅ Implement announcements (`/api/announcements/*`)
2. ✅ Implement zones/devices (`/api/zones/*`, `/api/devices/*`)
3. ✅ Implement playback control (`/api/playback/*`)
4. ✅ Test all features with frontend

### Week 3: Advanced

1. ✅ Implement scheduler (`/api/schedules/*`)
2. ✅ Set up WebSocket server
3. ✅ Implement admin endpoints (`/api/admin/*`)
4. ✅ Performance testing

### Week 4: Production

1. ✅ Deploy backend to production
2. ✅ Set up CDN for file serving
3. ✅ Configure monitoring and logging
4. ✅ Update frontend `.env` to production URLs
5. ✅ Deploy frontend

---

## Support & Documentation

- **Complete API Spec**: `/BACKEND_API_SPEC.md`
- **Integration Guide**: `/BACKEND_INTEGRATION_GUIDE.md`
- **TypeScript Types**: `/src/lib/types.ts`
- **Service Layer**: `/src/lib/services.ts`
- **React Hooks**: `/src/lib/hooks/useData.ts`
- **API Layer**: `/src/lib/api.ts`

---

## Quick Commands

```bash
# Frontend Development (No Backend)
cp .env.example .env
npm install
npm run dev

# Frontend with Backend
# Update .env: VITE_USE_MOCK_DATA=false
npm run dev

# Backend Setup (Django Example)
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Run Both Together
# Terminal 1: Backend
python manage.py runserver

# Terminal 2: Frontend
npm run dev

# ✅ Navigate to http://localhost:5173
```

---

**The frontend is 100% ready for backend integration. Just implement the API endpoints from the spec and everything will work automatically!**
