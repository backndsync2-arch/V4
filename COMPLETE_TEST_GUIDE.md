# Complete Testing Guide - Dummy Data & Application Flow

## 🎯 Overview

This guide will help you:
1. Populate the admin account with dummy data
2. Test all pages in the application
3. Verify files are saved and can be played
4. Test the complete user flow from root

---

## 📋 Step 1: Populate Dummy Data

### Option A: Simple Script (Recommended - No Audio Files)

```powershell
# Make sure backend is running first
cd sync2gear_backend
python manage.py runserver

# In another terminal, run:
python simple_populate_data.py
```

**This creates:**
- ✅ Music folders (Jazz Collection, Background Music, Holiday Tunes)
- ✅ TTS Announcements (3 announcements - no file upload needed)
- ✅ Zones (Main Floor, Kitchen)
- ✅ Devices (Main Speaker 1, Kitchen Speaker)

### Option B: Full Script (With Audio Files)

```powershell
# Requires pydub library for audio generation
pip install pydub
python populate_dummy_data.py
```

**This creates everything from Option A plus:**
- ✅ Actual music files (dummy MP3 files)
- ✅ More folders and files

---

## 🧪 Step 2: Test Application Flow

### Automatic Test (Browser Console)

1. **Open the application:** `http://localhost:5173`
2. **Open browser console** (F12)
3. **Paste and run** the contents of `auto_test_application.js`
4. **Review results** - All tests should pass

### Manual Test Flow

#### A. Root Access Test
1. **Open:** `http://localhost:5173`
2. **Expected:** Should auto-login as admin and show Dashboard
3. **Verify:** No landing page, no login form

#### B. Page Navigation Test
Navigate through each page and verify:

1. **Dashboard** ✅
   - Should load without errors
   - Should show overview/stats

2. **Music Library** ✅
   - Should show folders created by populate script
   - Should show music files (if created)
   - **Test:** Click on a folder to view files

3. **Announcements** ✅
   - Should show TTS announcements created
   - **Test:** Verify announcements are listed

4. **Channel Playlists** ✅
   - Should load without errors

5. **Scheduler** ✅
   - Should load without errors

6. **Zones & Devices** ✅
   - Should show zones created (Main Floor, Kitchen)
   - Should show devices created
   - **Test:** Verify zones and devices are displayed

7. **Team Members (Users)** ✅
   - Should show user list
   - **Test:** Verify you can see users

8. **Admin** ✅
   - Should show admin dashboard
   - **Test:** Verify admin controls are visible

9. **Profile** ✅
   - Should show your admin profile
   - **Test:** Verify user info is displayed

#### C. File Operations Test

**Test File Saving:**
1. Go to **Music Library**
2. Click **"Create Folder"** or use existing folder
3. Click **"Upload Music"** or drag & drop a file
4. **Verify:** File appears in the list after upload
5. **Verify:** File metadata is displayed (title, artist, etc.)

**Test File Playback:**
1. Go to **Music Library**
2. Find a music file in the list
3. Click **Play** button
4. **Verify:** Audio player appears/plays
5. **Verify:** Playback controls work (play, pause, volume)
6. **Verify:** File URL is accessible

**Test Announcement Playback:**
1. Go to **Announcements**
2. Find a TTS announcement
3. Click **Play** or **Play Instant**
4. **Verify:** Audio plays
5. **Verify:** Can select zones to play in

---

## 🔍 Step 3: Verify Data Persistence

### Check Files Are Saved

1. **Upload a file** in Music Library
2. **Refresh the page** (F5)
3. **Verify:** File still appears in the list
4. **Verify:** File metadata is preserved

### Check Database

```powershell
# In Django shell
cd sync2gear_backend
python manage.py shell

# Check folders
from apps.music.models import Folder
Folder.objects.count()

# Check music files
from apps.music.models import MusicFile
MusicFile.objects.count()

# Check announcements
from apps.announcements.models import Announcement
Announcement.objects.count()

# Check zones
from apps.zones.models import Zone
Zone.objects.count()
```

---

## 🎬 Step 4: Complete User Flow Test

### Simulate Real User Journey

1. **Open app** → Auto-login as admin ✅
2. **Navigate to Music Library** → See folders ✅
3. **Create new folder** → "Test Folder" ✅
4. **Upload music file** → File appears ✅
5. **Click play** → Audio plays ✅
6. **Navigate to Zones** → See zones ✅
7. **Select zone** → Play music in zone ✅
8. **Navigate to Announcements** → See announcements ✅
9. **Play announcement** → Audio plays ✅
10. **Navigate to Scheduler** → Create schedule ✅
11. **Navigate to Dashboard** → See overview ✅

---

## 📊 Test Results Checklist

Use this checklist to track your testing:

```
✅ Auto-login works
✅ Dashboard loads
✅ Music Library loads
  ✅ Folders visible
  ✅ Files visible (if created)
  ✅ Can upload new file
  ✅ File saves correctly
  ✅ File playback works
✅ Announcements load
  ✅ TTS announcements visible
  ✅ Can play announcements
✅ Zones load
  ✅ Zones visible
  ✅ Devices visible
✅ Scheduler loads
✅ Channel Playlists load
✅ Users page loads
✅ Admin page loads
✅ Profile page loads
✅ All navigation works
✅ No console errors
✅ Files persist after refresh
```

---

## 🐛 Troubleshooting

### Files Not Appearing?
- Check backend is running
- Check browser console for errors
- Verify API calls in Network tab
- Check file upload permissions

### Playback Not Working?
- Check file URLs are accessible
- Verify audio format is supported
- Check browser console for playback errors
- Test with different audio files

### Data Not Persisting?
- Check database connection
- Verify API calls return 200/201
- Check backend logs for errors
- Verify file storage permissions

---

## 🚀 Quick Start Commands

```powershell
# 1. Start backend
cd sync2gear_backend
python manage.py runserver

# 2. Start frontend (new terminal)
npm run dev

# 3. Populate data (new terminal)
python simple_populate_data.py

# 4. Open application
# Browser: http://localhost:5173

# 5. Run auto-test
# Open browser console, paste auto_test_application.js
```

---

## 📝 Expected Results

After running the populate script and testing:

- **Folders:** 3+ folders in Music Library
- **Announcements:** 3+ TTS announcements
- **Zones:** 2+ zones (Main Floor, Kitchen)
- **Devices:** 2+ devices
- **All Pages:** Load without errors
- **File Playback:** Works for uploaded files
- **Data Persistence:** Files remain after refresh

---

**Last Updated:** Complete testing guide  
**Status:** Ready for comprehensive testing
