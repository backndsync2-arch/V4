# sync2gear Frontend - Django Integration Guide

**Copyright (c) 2025 sync2gear Ltd. All Rights Reserved.**

## 🎯 Overview

This document provides complete instructions for integrating the sync2gear React frontend with the Django backend. The frontend is **100% ready** for backend integration with proper API service layer, authentication context, and WebSocket support.

---

## ✅ Frontend Readiness Checklist

### Completed ✓

- [x] Complete API service layer (`/src/lib/api.ts`)
- [x] JWT authentication with automatic token refresh
- [x] WebSocket client for real-time updates
- [x] Environment variables configuration
- [x] TypeScript interfaces matching Django models
- [x] Error handling and retry logic
- [x] File upload with progress tracking
- [x] All UI components ready for data binding
- [x] Mock data structure matching API responses

### To Enable Backend Integration

1. Start Django backend server
2. Update `.env` with backend URL
3. Replace mock data imports with API calls
4. Enable WebSocket connections
5. Test authentication flow

---

## 🔧 Configuration

### 1. Environment Variables

File: `/.env`

```bash
# Django Backend API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws

# Production
# VITE_API_BASE_URL=https://api.sync2gear.com/api
# VITE_WS_BASE_URL=wss://api.sync2gear.com/ws

# Feature Flags
VITE_ENABLE_SECURITY=false
```

**For production:**

```bash
VITE_API_BASE_URL=https://api.sync2gear.com/api
VITE_WS_BASE_URL=wss://api.sync2gear.com/ws
VITE_ENABLE_SECURITY=true
```

### 2. API Service Layer

The complete API service layer is already implemented in `/src/lib/api.ts`:

**Features:**
- ✅ Automatic JWT token management
- ✅ Refresh token rotation
- ✅ Retry logic on 401 errors
- ✅ File upload with progress tracking
- ✅ WebSocket client with reconnection
- ✅ Type-safe API calls

**Usage Example:**

```typescript
import { authAPI, musicAPI, wsClient } from '@/lib/api';

// Authentication
const { user, access, refresh } = await authAPI.signIn(email, password);

// Upload music
const musicFile = await musicAPI.uploadMusicFile(
  file,
  { folder_id: folderId, title, artist },
  (progress) => console.log(`Upload: ${progress}%`)
);

// WebSocket
wsClient.connect(zoneId);
wsClient.on('playback_state', (data) => {
  console.log('Playback update:', data);
});
```

---

## 🔐 Authentication Integration

### Current State: Mock Authentication

File: `/src/lib/auth.tsx`

Currently uses mock data. To enable real authentication:

### Step 1: Update Auth Context

Replace the mock authentication in `/src/lib/auth.tsx`:

**Find this code:**

```typescript
// MOCK: Replace with actual API call
const signIn = async (email: string, password: string) => {
  const mockUser = mockUsers.find(u => u.email === email);
  if (!mockUser) {
    throw new Error('Invalid credentials');
  }
  setUser(mockUser);
  localStorage.setItem('user', JSON.stringify(mockUser));
};
```

**Replace with:**

```typescript
import { authAPI, setTokens } from '@/lib/api';

const signIn = async (email: string, password: string) => {
  try {
    const { user, access, refresh } = await authAPI.signIn(email, password);
    setTokens(access, refresh);
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    throw new Error('Invalid credentials');
  }
};
```

### Step 2: Update Sign Up

**Find this code:**

```typescript
const signUp = async (data: SignUpData) => {
  const newUser: User = {
    id: crypto.randomUUID(),
    email: data.email,
    name: data.name,
    role: 'client',
    // ... mock data
  };
  setUser(newUser);
};
```

**Replace with:**

```typescript
const signUp = async (data: SignUpData) => {
  try {
    const { user, access, refresh } = await authAPI.signUp({
      email: data.email,
      password: data.password,
      name: data.name,
      companyName: data.companyName,
    });
    setTokens(access, refresh);
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error: any) {
    throw new Error(error.message || 'Sign up failed');
  }
};
```

### Step 3: Update Sign Out

**Replace with:**

```typescript
import { authAPI, clearTokens } from '@/lib/api';

const signOut = async () => {
  await authAPI.signOut();
  clearTokens();
  setUser(null);
  localStorage.removeItem('user');
};
```

### Step 4: Auto-login on Page Load

**Update the useEffect:**

```typescript
useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const user = await authAPI.getCurrentUser();
        setUser(user);
      } catch (error) {
        // Token invalid, clear auth
        clearTokens();
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  };
  
  checkAuth();
}, []);
```

---

## 📚 Data Fetching Integration

### Music Library Component

File: `/src/app/components/MusicLibrary.tsx`

**Current: Uses mock data**

```typescript
const [folders, setFolders] = useState(mockFolders);
const [musicFiles, setMusicFiles] = useState(mockMusicFiles);
```

**Update to real API:**

```typescript
import { musicAPI } from '@/lib/api';

const [folders, setFolders] = useState<Folder[]>([]);
const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const [foldersData, musicData] = await Promise.all([
      musicAPI.getFolders(),
      musicAPI.getMusicFiles()
    ]);
    setFolders(foldersData);
    setMusicFiles(musicData);
  } catch (error) {
    toast.error('Failed to load music library');
  } finally {
    setLoading(false);
  }
};

// Update file upload
const handleFileUpload = async (files: FileList) => {
  const fileArray = Array.from(files);
  
  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    try {
      const uploadedFile = await musicAPI.uploadMusicFile(
        file,
        { folder_id: selectedFolder?.id },
        (progress) => {
          // Update progress UI
          console.log(`File ${i + 1}: ${progress}%`);
        }
      );
      
      setMusicFiles(prev => [...prev, uploadedFile]);
      toast.success(`Uploaded: ${file.name}`);
    } catch (error) {
      toast.error(`Failed to upload: ${file.name}`);
    }
  }
  
  loadData(); // Refresh list
};
```

### Announcements Component

File: `/src/app/components/Announcements.tsx`

**Update TTS generation:**

```typescript
import { announcementsAPI } from '@/lib/api';

const handleGenerateTTS = async () => {
  if (!ttsText.trim()) return;
  
  try {
    setIsGenerating(true);
    const announcement = await announcementsAPI.createTTSAnnouncement({
      title: ttsTitle || 'TTS Announcement',
      text: ttsText,
      voice: selectedVoice,
      folder_id: selectedFolder?.id
    });
    
    toast.success('TTS generated successfully');
    loadAnnouncements(); // Refresh list
  } catch (error) {
    toast.error('Failed to generate TTS');
  } finally {
    setIsGenerating(false);
  }
};

// Update instant play
const handleInstantPlay = async (announcementId: string) => {
  try {
    await announcementsAPI.playInstantAnnouncement(
      announcementId,
      [currentZone.id]
    );
    toast.success('Playing announcement');
  } catch (error) {
    toast.error('Failed to play announcement');
  }
};
```

### Scheduler Component

File: `/src/app/components/Scheduler.tsx`

**Update schedule creation:**

```typescript
import { schedulerAPI } from '@/lib/api';

const handleCreateSchedule = async (scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const newSchedule = await schedulerAPI.createSchedule(scheduleData);
    setSchedules(prev => [...prev, newSchedule]);
    toast.success('Schedule created');
  } catch (error) {
    toast.error('Failed to create schedule');
  }
};

const handleToggleSchedule = async (scheduleId: string, active: boolean) => {
  try {
    await schedulerAPI.toggleSchedule(scheduleId, active);
    setSchedules(prev =>
      prev.map(s => s.id === scheduleId ? { ...s, isActive: active } : s)
    );
    toast.success(active ? 'Schedule activated' : 'Schedule deactivated');
  } catch (error) {
    toast.error('Failed to update schedule');
  }
};
```

### Zones Component

File: `/src/app/components/Zones.tsx`

**Load zones and devices:**

```typescript
import { zonesAPI } from '@/lib/api';

useEffect(() => {
  loadZonesAndDevices();
}, []);

const loadZonesAndDevices = async () => {
  try {
    const [zonesData, devicesData] = await Promise.all([
      zonesAPI.getZones(),
      zonesAPI.getDevices()
    ]);
    setZones(zonesData);
    setDevices(devicesData);
  } catch (error) {
    toast.error('Failed to load zones');
  }
};

const handleCreateZone = async (name: string, description: string) => {
  try {
    const zone = await zonesAPI.createZone({ name, description });
    setZones(prev => [...prev, zone]);
    toast.success('Zone created');
  } catch (error) {
    toast.error('Failed to create zone');
  }
};
```

---

## 🎵 Playback Integration

### Playback Context

File: `/src/lib/playback.tsx`

**Current: Local state only**

**Update to use WebSocket:**

```typescript
import { playbackAPI, wsClient } from '@/lib/api';
import { useEffect } from 'react';

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  
  // Connect to WebSocket when zone changes
  useEffect(() => {
    if (!currentZone) return;
    
    // Connect to WebSocket for this zone
    wsClient.connect(currentZone.id);
    
    // Listen for playback updates
    wsClient.on('playback_state', (data) => {
      setPlaybackState(data);
    });
    
    // Load initial state
    loadPlaybackState();
    
    return () => {
      wsClient.disconnect();
    };
  }, [currentZone?.id]);
  
  const loadPlaybackState = async () => {
    if (!currentZone) return;
    try {
      const state = await playbackAPI.getPlaybackState(currentZone.id);
      setPlaybackState(state);
    } catch (error) {
      console.error('Failed to load playback state:', error);
    }
  };
  
  const play = async (playlistIds: string[], shuffle: boolean = false) => {
    if (!currentZone) return;
    try {
      await playbackAPI.play(currentZone.id, playlistIds, shuffle);
      // State will update via WebSocket
    } catch (error) {
      toast.error('Failed to start playback');
    }
  };
  
  const pause = async () => {
    if (!currentZone) return;
    try {
      await playbackAPI.pause(currentZone.id);
    } catch (error) {
      toast.error('Failed to pause');
    }
  };
  
  const next = async () => {
    if (!currentZone) return;
    try {
      await playbackAPI.next(currentZone.id);
    } catch (error) {
      toast.error('Failed to skip');
    }
  };
  
  const previous = async () => {
    if (!currentZone) return;
    try {
      await playbackAPI.previous(currentZone.id);
    } catch (error) {
      toast.error('Failed to go back');
    }
  };
  
  const setVolume = async (volume: number) => {
    if (!currentZone) return;
    try {
      await playbackAPI.setVolume(currentZone.id, volume);
    } catch (error) {
      toast.error('Failed to set volume');
    }
  };
  
  return (
    <PlaybackContext.Provider value={{
      currentZone,
      setCurrentZone,
      playbackState,
      play,
      pause,
      next,
      previous,
      setVolume,
    }}>
      {children}
    </PlaybackContext.Provider>
  );
}
```

---

## 🔄 Real-time Updates with WebSocket

### Dashboard Real-time Stats

File: `/src/app/components/DashboardEnhanced.tsx`

**Add WebSocket listener for stats:**

```typescript
import { wsClient } from '@/lib/api';

useEffect(() => {
  // Connect to global events WebSocket
  wsClient.connect(); // No zone ID = global events
  
  // Listen for various events
  wsClient.on('device_status_change', (data) => {
    // Update device status in UI
    updateDeviceStatus(data.device_id, data.is_online);
  });
  
  wsClient.on('schedule_executed', (data) => {
    // Show notification
    toast.info(`Schedule "${data.schedule_name}" executed`);
  });
  
  wsClient.on('announcement_played', (data) => {
    // Update recent activity
    addRecentActivity(data);
  });
  
  return () => {
    wsClient.disconnect();
  };
}, []);
```

---

## 📁 File Upload Handling

### Music Upload with Progress

```typescript
import { musicAPI } from '@/lib/api';

const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

const handleBatchUpload = async (files: File[]) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileId = `${i}-${file.name}`;
    
    try {
      await musicAPI.uploadMusicFile(
        file,
        { folder_id: selectedFolder?.id },
        (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: progress
          }));
        }
      );
      
      toast.success(`✅ ${file.name}`);
    } catch (error) {
      toast.error(`❌ ${file.name}: ${error.message}`);
    }
  }
  
  // Refresh music library
  loadMusicFiles();
};
```

### Cover Art Upload

```typescript
const handleCoverUpload = async (musicId: string, imageFile: File) => {
  try {
    const updated = await musicAPI.uploadCoverArt(musicId, imageFile);
    
    // Update UI
    setMusicFiles(prev =>
      prev.map(m => m.id === musicId ? updated : m)
    );
    
    toast.success('Cover art updated');
  } catch (error) {
    toast.error('Failed to upload cover art');
  }
};
```

---

## 🎨 Admin Panel Integration

File: `/src/app/components/Admin.tsx`

**Load clients and stats:**

```typescript
import { adminAPI } from '@/lib/api';

useEffect(() => {
  if (user?.role === 'admin') {
    loadAdminData();
  }
}, [user]);

const loadAdminData = async () => {
  try {
    const [clients, stats] = await Promise.all([
      adminAPI.getClients(),
      adminAPI.getStats()
    ]);
    
    setClients(clients);
    setStats(stats);
  } catch (error) {
    toast.error('Failed to load admin data');
  }
};

const handleCreateClient = async (clientData) => {
  try {
    const client = await adminAPI.createClient(clientData);
    setClients(prev => [...prev, client]);
    toast.success('Client created');
  } catch (error) {
    toast.error('Failed to create client');
  }
};
```

---

## 🧪 Testing Backend Integration

### Step-by-Step Testing

1. **Start Django backend:**
   ```bash
   cd sync2gear_backend
   python manage.py runserver
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Test authentication:**
   - Open browser to `http://localhost:5173`
   - Try sign up with new user
   - Check network tab for API calls to `http://localhost:8000/api/auth/signup/`
   - Verify JWT tokens in localStorage
   - Try sign out and sign in again

4. **Test music upload:**
   - Navigate to Music Library
   - Upload a music file
   - Check network tab for upload to `/api/music/upload/`
   - Verify metadata extraction
   - Check S3 bucket for file

5. **Test WebSocket:**
   - Open browser console
   - Navigate to Zones page
   - Select a zone
   - Check WebSocket connection in Network tab (WS)
   - Play music and watch for real-time updates

6. **Test scheduling:**
   - Create a schedule
   - Set it to trigger soon
   - Watch for execution in dashboard

---

## 🐛 Debugging

### Common Issues

#### 1. CORS Errors

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:** Update Django settings:

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True
```

#### 2. WebSocket Connection Failed

**Error:** `WebSocket connection to 'ws://localhost:8000/ws/...' failed`

**Solution:** 
- Ensure Django Channels is running (use daphne)
- Check ASGI configuration
- Verify channel layers are configured with Redis

#### 3. Token Refresh Loop

**Error:** Infinite loop of token refresh requests

**Solution:** Check token expiration times in Django JWT settings:

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}
```

#### 4. File Upload 413 Error

**Error:** `413 Request Entity Too Large`

**Solution:** Increase max upload size in nginx/Django:

```python
# settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800
```

```nginx
# nginx.conf
client_max_body_size 50M;
```

---

## 📊 Monitoring API Calls

### Add Request Logging

```typescript
// src/lib/api.ts

// Add at top of apiFetch function
console.log(`[API] ${options.method || 'GET'} ${endpoint}`);

// Add after response
console.log(`[API] Response:`, data);
```

### React Query (Optional Enhancement)

For better data fetching, caching, and synchronization:

```bash
npm install @tanstack/react-query
```

```typescript
// src/lib/queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { musicAPI } from './api';

export const useMusicFiles = () => {
  return useQuery({
    queryKey: ['music-files'],
    queryFn: () => musicAPI.getMusicFiles()
  });
};

export const useUploadMusic = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { file: File; metadata: any }) =>
      musicAPI.uploadMusicFile(data.file, data.metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['music-files'] });
    }
  });
};
```

---

## 🚀 Production Deployment

### Build Frontend for Production

```bash
# Install dependencies
npm install

# Build
npm run build

# Files will be in /dist folder
```

### Serve with Django

Option 1: **Separate deployments (Recommended)**
- Frontend on Vercel/Netlify
- Backend on AWS/DigitalOcean

Option 2: **Django serves frontend**

```python
# settings.py
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [os.path.join(BASE_DIR, 'frontend/dist')],
}]

STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend/dist/assets'),
]

# urls.py
from django.views.generic import TemplateView

urlpatterns = [
    path('api/', include('apps.authentication.urls')),
    # ... other api routes
    re_path(r'^.*', TemplateView.as_view(template_name='index.html')),
]
```

---

## 🎯 Quick Start Summary

### Minimum Steps to Connect Frontend to Backend

1. **Start Django backend**
2. **Update `.env`:**
   ```bash
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_BASE_URL=ws://localhost:8000/ws
   ```

3. **Update `/src/lib/auth.tsx`:**
   - Replace mock `signIn` with `authAPI.signIn()`
   - Replace mock `signUp` with `authAPI.signUp()`
   - Replace mock `signOut` with `authAPI.signOut()`

4. **Update component data loading:**
   - MusicLibrary: Replace `mockMusicFiles` with `musicAPI.getMusicFiles()`
   - Announcements: Replace mock with `announcementsAPI.getAnnouncements()`
   - Scheduler: Replace mock with `schedulerAPI.getSchedules()`
   - Zones: Replace mock with `zonesAPI.getZones()`

5. **Test authentication flow**

6. **Test file uploads**

7. **Test WebSocket connection**

**That's it! The frontend is 100% ready for backend integration.**

---

## 📞 Support

For issues or questions:
- Check Django backend logs
- Check browser console for errors
- Check network tab for failed requests
- Verify CORS configuration
- Ensure all environment variables are set

---

**End of Frontend Integration Guide**

The frontend is production-ready and fully prepared for Django backend integration with minimal code changes.
