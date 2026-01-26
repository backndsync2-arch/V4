# 🎯 sync2gear - Quick Reference Card

**Your 5-Minute Guide to Everything**

---

## 📦 What You Have

```
✅ Complete React Frontend (100% functional)
✅ Complete API Service Layer (/src/lib/api.ts)
✅ Django Backend Architecture (DJANGO_BACKEND_ARCHITECTURE.md)
✅ Integration Instructions (FRONTEND_DJANGO_INTEGRATION.md)
✅ Cursor AI Prompts (CURSOR_AI_INSTRUCTIONS.md)
✅ Deployment Guide (README_DEPLOYMENT.md)
```

---

## 🚀 Build Backend in 3 Commands

### Step 1: Copy Master Prompt to Cursor AI

```
Build complete Django backend for sync2gear following DJANGO_BACKEND_ARCHITECTURE.md.

Requirements:
- Django 5.0 + DRF + Channels + Celery
- PostgreSQL + Redis
- JWT auth with refresh tokens
- Role-based permissions (client/staff/admin)
- AWS S3 media storage
- WebSocket real-time updates
- Multi-tenancy (client isolation)
- Continuous playback engine
- Schedule system (interval + timeline)
- File upload with metadata extraction
- TTS generation with Google Cloud
- Complete API documentation

Follow CURSOR_AI_INSTRUCTIONS.md phases 1-13 systematically.
Generate production-ready code with full error handling.
```

### Step 2: Run This After Backend Generated

```bash
cd sync2gear_backend
docker-compose up --build
```

### Step 3: Update Frontend .env

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

---

## 🔌 Connect Frontend to Backend

### Update `/src/lib/auth.tsx`

**Find:**
```typescript
const signIn = async (email: string, password: string) => {
  const mockUser = mockUsers.find(u => u.email === email);
  // ... mock code
```

**Replace:**
```typescript
import { authAPI, setTokens } from '@/lib/api';

const signIn = async (email: string, password: string) => {
  const { user, access, refresh } = await authAPI.signIn(email, password);
  setTokens(access, refresh);
  setUser(user);
  localStorage.setItem('user', JSON.stringify(user));
};
```

### Update Components (Example: MusicLibrary)

**Find:**
```typescript
const [musicFiles, setMusicFiles] = useState(mockMusicFiles);
```

**Replace:**
```typescript
import { musicAPI } from '@/lib/api';

const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);

useEffect(() => {
  loadMusic();
}, []);

const loadMusic = async () => {
  const files = await musicAPI.getMusicFiles();
  setMusicFiles(files);
};
```

---

## 📋 API Endpoints Reference

### Authentication
```typescript
authAPI.signUp({ email, password, name, companyName })
authAPI.signIn(email, password)
authAPI.signOut()
authAPI.getCurrentUser()
authAPI.updateProfile(data)
authAPI.changePassword(oldPass, newPass)
```

### Music Library
```typescript
musicAPI.getFolders()
musicAPI.createFolder({ name, description })
musicAPI.getMusicFiles()
musicAPI.uploadMusicFile(file, { folder_id, title, artist }, onProgress)
musicAPI.updateMusicFile(id, data)
musicAPI.uploadCoverArt(musicId, imageFile)
musicAPI.deleteMusicFile(id)
```

### Announcements
```typescript
announcementsAPI.getAnnouncements()
announcementsAPI.createTTSAnnouncement({ title, text, voice })
announcementsAPI.uploadAnnouncement(file, { title }, onProgress)
announcementsAPI.playInstantAnnouncement(id, zoneIds)
```

### Scheduler
```typescript
schedulerAPI.getSchedules()
schedulerAPI.createSchedule(data)
schedulerAPI.updateSchedule(id, data)
schedulerAPI.toggleSchedule(id, active)
```

### Zones & Devices
```typescript
zonesAPI.getZones()
zonesAPI.createZone({ name, description })
zonesAPI.getDevices()
zonesAPI.registerDevice({ name, zone_id, device_type })
```

### Playback
```typescript
playbackAPI.getPlaybackState(zoneId)
playbackAPI.play(zoneId, playlistIds, shuffle)
playbackAPI.pause(zoneId)
playbackAPI.next(zoneId)
playbackAPI.previous(zoneId)
playbackAPI.setVolume(zoneId, volume)
```

### WebSocket
```typescript
import { wsClient } from '@/lib/api';

wsClient.connect(zoneId);
wsClient.on('playback_state', (data) => {
  console.log('Update:', data);
});
wsClient.send({ type: 'command', action: 'play' });
wsClient.disconnect();
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service
docker-compose logs -f web

# Restart service
docker-compose restart web

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Access Django shell
docker-compose exec web python manage.py shell

# Stop all
docker-compose down

# Rebuild
docker-compose up --build
```

---

## 🧪 Testing Commands

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
# Run tests
docker-compose exec web pytest

# With coverage
docker-compose exec web pytest --cov

# Specific test
docker-compose exec web pytest apps/authentication/tests.py

# Run migrations
docker-compose exec web python manage.py migrate

# Create migration
docker-compose exec web python manage.py makemigrations
```

---

## 🔍 Debugging

### Check Backend Health
```bash
curl http://localhost:8000/api/auth/signup/
```

### Check WebSocket
```javascript
// Browser console
const ws = new WebSocket('ws://localhost:8000/ws/events/');
ws.onmessage = (e) => console.log(e.data);
```

### View Database
```bash
docker-compose exec db psql -U sync2gear -d sync2gear

# Inside psql
\dt                    # List tables
SELECT * FROM users;   # Query users
\q                     # Quit
```

### Check Redis
```bash
docker-compose exec redis redis-cli

# Inside redis-cli
KEYS *                 # List all keys
GET key_name          # Get value
QUIT                  # Exit
```

---

## 🚨 Common Issues & Fixes

### CORS Error
**Error:** `Access-Control-Allow-Origin`

**Fix:**
```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

### Token Expired
**Error:** `401 Unauthorized`

**Fix:** Token refresh is automatic in `/src/lib/api.ts`

### WebSocket Won't Connect
**Error:** `WebSocket connection failed`

**Fix:**
1. Check websocket service running
2. Verify VITE_WS_BASE_URL
3. Check browser console

### Upload Fails
**Error:** `413 Request Entity Too Large`

**Fix:**
```python
# settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
```

```nginx
# nginx.conf
client_max_body_size 50M;
```

---

## 📝 Environment Variables

### Frontend `.env`
```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
VITE_ENABLE_SECURITY=false
```

### Backend `.env`
```bash
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://sync2gear:password@localhost:5432/sync2gear
REDIS_HOST=localhost
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=sync2gear-media
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

---

## 🎯 Daily Workflow

### Morning Startup
```bash
# Terminal 1: Backend
cd sync2gear_backend
docker-compose up

# Terminal 2: Frontend
cd sync2gear_frontend
npm run dev

# Open browser
http://localhost:5173
```

### Make Changes
1. Edit code
2. Frontend: Auto hot-reload
3. Backend: `docker-compose restart web`
4. Test in browser

### End of Day
```bash
# Stop everything
docker-compose down
Ctrl+C  # In frontend terminal
```

---

## 📊 Project Structure

```
sync2gear/
├─ frontend/                    # ← You are here
│  ├─ src/lib/api.ts           # ✅ Complete API layer
│  ├─ src/lib/auth.tsx         # ⚠️ Update this (3 functions)
│  └─ src/app/components/      # ⚠️ Update data loading
│
└─ backend/                     # ← Create with Cursor AI
   ├─ apps/                     # All Django apps
   ├─ config/                   # Settings
   └─ docker-compose.yml        # Docker setup
```

---

## ✅ Deployment Checklist

### Development
- [ ] Backend running on localhost:8000
- [ ] Frontend running on localhost:5173
- [ ] Database connected
- [ ] Redis connected
- [ ] Can sign up/sign in
- [ ] Can upload files

### Staging
- [ ] Backend deployed to server
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Database migrated
- [ ] Environment variables set
- [ ] SSL/HTTPS enabled
- [ ] CORS configured

### Production
- [ ] Backend on production domain
- [ ] Frontend on production domain
- [ ] Managed database
- [ ] S3 bucket configured
- [ ] Redis Cloud setup
- [ ] Monitoring enabled
- [ ] Backups automated
- [ ] Security hardened

---

## 🎓 Documentation Links

| Document | Purpose |
|----------|---------|
| `DJANGO_BACKEND_ARCHITECTURE.md` | Complete backend blueprint |
| `FRONTEND_DJANGO_INTEGRATION.md` | Step-by-step integration |
| `CURSOR_AI_INSTRUCTIONS.md` | Implementation prompts |
| `README_DEPLOYMENT.md` | Deployment guide |
| `QUICK_REFERENCE.md` | This file |

---

## 🔗 Important URLs

### Development
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- API Docs: http://localhost:8000/api/docs
- WebSocket: ws://localhost:8000/ws

### Production
- Frontend: https://app.sync2gear.com
- Backend API: https://api.sync2gear.com/api
- API Docs: https://api.sync2gear.com/api/docs
- WebSocket: wss://api.sync2gear.com/ws

---

## 💡 Pro Tips

1. **Use React Query** for better data fetching (optional)
2. **Enable Sentry** for error tracking
3. **Set up CI/CD** with GitHub Actions
4. **Monitor performance** with Lighthouse
5. **Test on real devices** early
6. **Keep dependencies updated** regularly
7. **Document API changes** in Swagger
8. **Back up database** daily
9. **Use environment-specific .env** files
10. **Test error cases** thoroughly

---

## 🎯 Next Actions

### Right Now
1. Copy master prompt to Cursor AI
2. Let it generate backend
3. Run `docker-compose up`
4. Update frontend auth
5. Test sign in flow

### This Week
1. Connect all components to API
2. Test file uploads
3. Test WebSocket
4. Test scheduling
5. Fix any bugs

### Next Week
1. Deploy to staging
2. User testing
3. Fix issues
4. Performance optimization
5. Security audit

---

## 📞 Need Help?

1. **Check docs** in this folder
2. **Check logs** with `docker-compose logs`
3. **Check browser console** for frontend errors
4. **Check API docs** at /api/docs/
5. **Review code** with Cursor AI

---

**You're ready to go! 🚀**

Everything is prepared. Just follow the steps above and you'll have a fully functional sync2gear system in no time.
