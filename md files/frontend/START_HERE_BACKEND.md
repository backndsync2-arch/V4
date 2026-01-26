# 🚀 START HERE - Backend Integration

**Welcome! This guide will get you started with sync2gear backend integration.**

---

## 📍 You Are Here

The sync2gear frontend is **100% ready for backend integration**. Everything has been set up with a professional service layer that automatically switches between mock data (development) and real API calls (production).

---

## ⚡ Quick Start (Choose Your Role)

### 👨‍💻 I'm a Frontend Developer

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start development
npm run dev

# ✅ App runs fully with mock data - no backend needed!
```

**What you need to know:**
- Use services from `/src/lib/services.ts`
- Use hooks from `/src/lib/hooks/useData.ts`
- When backend is ready, just update `.env`
- No code changes needed!

**Your documentation:**
- 📖 [`/README_BACKEND_INTEGRATION.md`](./README_BACKEND_INTEGRATION.md) - Usage examples

---

### 🔧 I'm a Backend Developer (or AI like Cursor)

**Follow these steps in order:**

#### Step 1: Read Quick Start (5 minutes)
📖 [`/INTEGRATION_QUICK_START.md`](./INTEGRATION_QUICK_START.md)
- Overview of the system
- How frontend and backend connect
- Quick commands to get started

#### Step 2: Review API Specification (30 minutes)
📖 [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md)
- **All API endpoints you need to implement**
- Request/response formats
- Authentication flow
- Error handling
- Priority order for implementation

#### Step 3: Check TypeScript Types (15 minutes)
📄 [`/src/lib/types.ts`](./src/lib/types.ts)
- **All data models defined**
- Backend responses must match these exactly
- Examples of each type

#### Step 4: Read Full Integration Guide (30 minutes)
📖 [`/BACKEND_INTEGRATION_GUIDE.md`](./BACKEND_INTEGRATION_GUIDE.md)
- Detailed architecture explanation
- Django model mapping
- WebSocket setup
- Testing strategies
- Deployment considerations

#### Step 5: Start Implementing

**Phase 1 - Core (Week 1):**
- [ ] Authentication (`/api/auth/*`)
- [ ] Music library (`/api/music/*`)
- [ ] File upload with S3/CDN

**Phase 2 - Features (Week 2):**
- [ ] Announcements (`/api/announcements/*`)
- [ ] Zones/Floors (`/api/zones/*`)
- [ ] Devices (`/api/devices/*`)

**Phase 3 - Advanced (Week 3):**
- [ ] Scheduler (`/api/schedules/*`)
- [ ] Playback control (`/api/playback/*`)
- [ ] WebSocket server

**Phase 4 - Admin (Week 4):**
- [ ] Admin endpoints (`/api/admin/*`)
- [ ] System statistics
- [ ] Monitoring

---

### 📊 I'm a Project Manager

**Current Status:**
- ✅ Frontend: 100% complete and backend-ready
- ✅ Service layer: Complete with auto-switching
- ✅ API layer: All endpoints defined
- ✅ TypeScript types: Complete
- ✅ Documentation: Complete
- ⏳ Backend: Ready to be implemented

**Timeline Estimate:**
- Week 1: Core authentication & music library
- Week 2: Announcements & zones
- Week 3: Scheduler & playback control
- Week 4: Admin features & polish

**Read this:**
📖 [`/BACKEND_READY_SUMMARY.md`](./BACKEND_READY_SUMMARY.md) - What's done and what's next

---

## 📚 Complete Documentation Index

### 🎯 Essential Reading (Start Here)

| Priority | Document | Time | Audience |
|----------|----------|------|----------|
| 1️⃣ | [`START_HERE_BACKEND.md`](./START_HERE_BACKEND.md) | 5 min | **Everyone** |
| 2️⃣ | [`/INTEGRATION_QUICK_START.md`](./INTEGRATION_QUICK_START.md) | 10 min | **Everyone** |
| 3️⃣ | [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md) | 30 min | **Backend** |
| 4️⃣ | [`/src/lib/types.ts`](./src/lib/types.ts) | 15 min | **Backend** |
| 5️⃣ | [`/BACKEND_INTEGRATION_GUIDE.md`](./BACKEND_INTEGRATION_GUIDE.md) | 45 min | **Backend** |

### 📖 Reference Documentation

| Document | Description | Audience |
|----------|-------------|----------|
| [`/README_BACKEND_INTEGRATION.md`](./README_BACKEND_INTEGRATION.md) | Complete README with examples | **Frontend** |
| [`/BACKEND_READY_SUMMARY.md`](./BACKEND_READY_SUMMARY.md) | Summary of what was done | **Everyone** |
| [`/.env.example`](./.env.example) | Environment configuration | **Everyone** |

### 💻 Code Files

| File | Description |
|------|-------------|
| [`/src/lib/types.ts`](./src/lib/types.ts) | **All TypeScript types** - Backend must match |
| [`/src/lib/services.ts`](./src/lib/services.ts) | Service layer with auto-switching |
| [`/src/lib/hooks/useData.ts`](./src/lib/hooks/useData.ts) | React hooks for data fetching |
| [`/src/lib/api.ts`](./src/lib/api.ts) | API layer - All endpoints defined |
| [`/src/lib/mockData.ts`](./src/lib/mockData.ts) | Mock data for development |

---

## 🎯 What You Need to Do

### Frontend Team ✅

**You're all set!** The frontend is complete and works with mock data.

When backend is ready:
1. Update `.env`: `VITE_USE_MOCK_DATA=false`
2. Add backend URLs
3. Test all features
4. Report any issues to backend team

**No code changes needed!**

---

### Backend Team 🔧

**Implement these API endpoints:**

#### Phase 1: Authentication & Music (Week 1)

```
POST   /api/auth/login/
POST   /api/auth/signup/
GET    /api/auth/me/
POST   /api/auth/refresh/
GET    /api/music/folders/
POST   /api/music/upload/
GET    /api/music/files/
```

#### Phase 2: Announcements & Zones (Week 2)

```
GET    /api/announcements/
POST   /api/announcements/tts/
POST   /api/announcements/upload/
POST   /api/announcements/{id}/play-instant/
GET    /api/zones/
GET    /api/devices/
POST   /api/devices/register/
```

#### Phase 3: Scheduler & Playback (Week 3)

```
GET    /api/schedules/
POST   /api/schedules/
POST   /api/playback/play/
POST   /api/playback/pause/
WS     /ws/playback/{zone_id}/
```

#### Phase 4: Admin (Week 4)

```
GET    /api/admin/clients/
GET    /api/admin/users/
GET    /api/admin/stats/
```

**Each endpoint specification is in [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md)**

---

## 🏗️ Architecture Overview

```
Frontend Components
       ↓
  React Hooks (useData.ts)
       ↓
  Service Layer (services.ts)
       ↓
  ┌─────────────────┐
  │ Environment     │
  │ Variable Check  │
  └────────┬────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
Mock Data    API Layer
              ↓
         Django Backend
              ↓
      Database + S3
```

### Key Benefits

✅ **Auto-switching** - Single env var toggles mock/real backend  
✅ **Type-safe** - Full TypeScript coverage  
✅ **No component changes** - Switch backends without code changes  
✅ **Real-time ready** - WebSocket client included  
✅ **Error handling** - Automatic token refresh & error handling  
✅ **File uploads** - Progress tracking built-in  

---

## 🔧 Environment Configuration

### Development (Mock Data)

```bash
# .env
VITE_USE_MOCK_DATA=true

# Result: App works fully without backend
```

### Development (With Backend)

```bash
# .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# Result: App calls your local backend
```

### Production

```bash
# .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# Result: App calls production backend
```

---

## 🧪 Testing

### Test Frontend (No Backend)

```bash
# 1. Use mock data
VITE_USE_MOCK_DATA=true

# 2. Start dev server
npm run dev

# 3. Test all features
# ✅ Everything should work
```

### Test Integration (With Backend)

```bash
# Terminal 1: Start backend
python manage.py runserver

# Terminal 2: Update frontend .env
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=http://localhost:8000/api

# Start frontend
npm run dev

# 3. Test each feature
# - Login/signup
# - Upload music
# - Create announcements
# - Etc.
```

---

## 💡 How It Works

### Example: Uploading Music

**Frontend Code** (no changes needed):
```typescript
import { useMusicUpload } from '@/lib/hooks/useData';

function UploadButton() {
  const { upload, progress, loading } = useMusicUpload();
  
  return (
    <input 
      type="file" 
      onChange={e => upload(e.target.files[0], { folder_id: 'folder123' })}
    />
  );
}
```

**What Happens:**

1. User selects file
2. `useMusicUpload()` hook called
3. Hook calls `musicService.uploadMusicFile()`
4. Service checks `VITE_USE_MOCK_DATA`:
   - `true` → Returns mock data
   - `false` → Calls `api.musicAPI.uploadMusicFile()`
5. API makes `POST /api/music/upload/`
6. Backend processes and returns result
7. Frontend updates UI automatically

**No code changes when switching backends - just update `.env`!**

---

## 📊 Data Models

All models defined in `/src/lib/types.ts`.

**Example:**

```typescript
interface MusicFile {
  id: string;
  name: string;
  folderId: string;        // ⚠️ camelCase, not snake_case
  clientId: string;        // ⚠️ camelCase
  url: string;
  size: number;
  duration: number;
  type: string;
  createdAt: Date;         // ⚠️ ISO 8601 format
  createdBy: string;
}
```

**Backend must return exactly this format!**

---

## ⚠️ Important Notes

### For Backend Developers

1. **Use camelCase in JSON responses** (not snake_case)
   - ✅ `folderId`, `clientId`, `createdAt`
   - ❌ `folder_id`, `client_id`, `created_at`

2. **Return ISO 8601 dates**
   - ✅ `"2025-01-24T12:00:00Z"`
   - ❌ `"2025-01-24 12:00:00"`

3. **Match TypeScript types exactly**
   - Check `/src/lib/types.ts` for all types
   - Use serializers to convert Django models

4. **Implement token refresh**
   - Frontend expects `/api/auth/refresh/` endpoint
   - Return new access token

5. **Configure CORS**
   - Allow frontend domain
   - Include credentials

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [x] User can login/signup
- [x] User can upload music files
- [x] User can list music files
- [x] User can create folders
- [x] Token refresh works

### Phase 2 Complete When:
- [x] User can create TTS announcements
- [x] User can upload announcement audio
- [x] User can play instant announcements
- [x] User can manage zones/floors
- [x] User can register devices

### Phase 3 Complete When:
- [x] User can create schedules
- [x] User can control playback
- [x] WebSocket updates work
- [x] Real-time features work

### Phase 4 Complete When:
- [x] Admin can manage clients
- [x] Admin can view statistics
- [x] System monitoring works
- [x] Production deployment complete

---

## 🆘 Need Help?

### Common Questions

**Q: Where do I start?**  
A: Read [`/INTEGRATION_QUICK_START.md`](./INTEGRATION_QUICK_START.md) then [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md)

**Q: What data format should backend return?**  
A: Check `/src/lib/types.ts` - backend must match exactly

**Q: How do I test without frontend changes?**  
A: Just update `.env` file - no code changes needed

**Q: Where are all the API endpoints listed?**  
A: See [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md) for complete list

**Q: How do I handle authentication?**  
A: Use JWT tokens - frontend handles refresh automatically

**Q: What about file uploads?**  
A: Use S3/CDN - return public URL in response

---

## 📞 Support

All documentation is complete:

- **Quick Start**: `/INTEGRATION_QUICK_START.md`
- **API Spec**: `/BACKEND_API_SPEC.md`
- **Integration Guide**: `/BACKEND_INTEGRATION_GUIDE.md`
- **Usage Examples**: `/README_BACKEND_INTEGRATION.md`
- **Summary**: `/BACKEND_READY_SUMMARY.md`

---

## ✅ Final Checklist

### Before You Start
- [ ] Read this document
- [ ] Read `/INTEGRATION_QUICK_START.md`
- [ ] Review `/BACKEND_API_SPEC.md`
- [ ] Check `/src/lib/types.ts`

### During Development
- [ ] Implement endpoints in priority order
- [ ] Match TypeScript types exactly
- [ ] Use camelCase in JSON responses
- [ ] Test each endpoint with frontend
- [ ] Fix any data format mismatches

### Before Production
- [ ] All endpoints working
- [ ] Authentication flow complete
- [ ] File uploads to S3/CDN working
- [ ] WebSocket server running
- [ ] CORS configured
- [ ] Rate limiting implemented
- [ ] Monitoring set up

---

## 🎉 Let's Get Started!

The frontend is ready and waiting. Follow the guides, implement the API, and everything will connect seamlessly!

**Next Steps:**
1. ✅ Read [`/INTEGRATION_QUICK_START.md`](./INTEGRATION_QUICK_START.md)
2. ✅ Review [`/BACKEND_API_SPEC.md`](./BACKEND_API_SPEC.md)
3. ✅ Start implementing Phase 1 endpoints
4. ✅ Test with frontend
5. ✅ Continue with remaining phases

**Good luck! 🚀**
