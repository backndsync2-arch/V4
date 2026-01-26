# ✅ FRONTEND FEATURE TESTING CHECKLIST

## 🎯 **TEST ALL FEATURES BEFORE EXPORT**

---

## 1️⃣ **NAVIGATION & ROUTING**

### Desktop Navigation
- [ ] Click "Dashboard" in sidebar → Shows Dashboard page
- [ ] Click "Music Library" → Shows Music Library page
- [ ] Click "Announcements" → Shows Announcements page
- [ ] Click "Channel Playlists" → Shows Channel Playlists page
- [ ] Click "Scheduler" → Shows Scheduler page
- [ ] Click "Zones & Devices" → Shows Zones page
- [ ] Click "Profile" → Shows Profile page
- [ ] Click "Admin" (if super admin) → Shows Admin page
- [ ] Current page highlighted in sidebar (blue background)

### Mobile Navigation
- [ ] Bottom nav shows 6 tabs: Control, Music, Announce, Playlists, Schedule, Zones
- [ ] Clicking each tab navigates correctly
- [ ] Active tab shows blue icon and top indicator bar
- [ ] Bottom nav stays fixed at bottom

---

## 2️⃣ **DASHBOARD - LIVE PLAYBACK CONTROL**

### Music Selection
- [ ] Can see list of all music files
- [ ] Can check/uncheck multiple music tracks (checkboxes work)
- [ ] Selected count updates: "X tracks selected"
- [ ] Music files show name and duration

### Announcement Selection
- [ ] Can see list of all announcements
- [ ] Can check/uncheck multiple announcements (checkboxes work)
- [ ] Selected count updates: "X announcements selected"
- [ ] Announcements show title, type (TTS/Uploaded), and duration

### Zone Selector
- [ ] Dropdown shows all available zones
- [ ] Can select a zone
- [ ] "All Zones" option available

### Playback Controls
- [ ] Announcement interval slider works (1-30 minutes)
- [ ] Slider shows current value: "X mins"
- [ ] Fade duration slider works (1-10 seconds)
- [ ] Background music volume slider works (0-50%)
- [ ] All sliders update displayed values in real-time

### Start/Stop Functionality
- [ ] Click START button (should be big and green)
- [ ] Button changes to red STOP button
- [ ] Toast notification shows "Playback started on [Zone]"
- [ ] Cannot start without music selected (error toast)
- [ ] Cannot start without announcements selected (error toast)
- [ ] Click STOP button
- [ ] Returns to START button
- [ ] Toast shows "Playback stopped"

### Currently Playing Display (After Starting)
- [ ] "Now Playing" card appears
- [ ] Shows current music track name
- [ ] Shows track X of Y
- [ ] Shows elapsed time (ticking upward)
- [ ] Shows volume percentage
- [ ] Shows "Announcement Playing" badge when appropriate

### Next Announcement Display (After Starting)
- [ ] "Next Announcement" card appears
- [ ] Shows next announcement title
- [ ] Shows announcement type and duration
- [ ] Shows countdown timer (ticking downward)
- [ ] "Play Now" button visible
- [ ] Click "Play Now" → Announcement triggers immediately
- [ ] "Play Now" button disabled while announcement is playing

---

## 3️⃣ **MUSIC LIBRARY**

### View Music
- [ ] Shows all uploaded music files
- [ ] Each file shows: name, duration, file size
- [ ] Online status indicator visible

### Upload Music
- [ ] Click "Upload Music" button → Dialog opens
- [ ] Can drag and drop file
- [ ] Can click to browse files
- [ ] Shows file info after selection
- [ ] Click "Upload" → File uploads
- [ ] Toast notification: "Music uploaded successfully"
- [ ] New file appears in list

### Play/Preview Music
- [ ] Click play icon on a music file
- [ ] Music plays locally (preview)
- [ ] Can pause/stop

### Delete Music
- [ ] Click delete icon
- [ ] Confirmation required
- [ ] File removed from list
- [ ] Toast: "Music deleted"

### Search/Filter
- [ ] Search box filters music by name
- [ ] Results update as you type

---

## 4️⃣ **ANNOUNCEMENTS STUDIO**

### View Announcements
- [ ] Shows all announcements (TTS + Uploaded)
- [ ] Each shows: title, type, duration
- [ ] Enabled/disabled status visible

### Create TTS Announcement
- [ ] Click "Create Announcement" button
- [ ] Select "Text-to-Speech" tab
- [ ] Enter title
- [ ] Enter text
- [ ] Select voice from dropdown
- [ ] Click "Generate" → Announcement created
- [ ] Toast: "Announcement created"
- [ ] New announcement appears in list

### Upload Audio Announcement
- [ ] Click "Create Announcement"
- [ ] Select "Upload Audio" tab
- [ ] Enter title
- [ ] Upload audio file (MP3/WAV)
- [ ] Click "Upload" → Announcement created
- [ ] New announcement appears

### Preview Announcement
- [ ] Click play icon → Announcement plays locally

### Enable/Disable Announcement
- [ ] Toggle switch works
- [ ] Disabled announcements show "Disabled" badge

### Delete Announcement
- [ ] Click delete icon
- [ ] Confirmation required
- [ ] Announcement removed
- [ ] Toast: "Announcement deleted"

---

## 5️⃣ **CHANNEL PLAYLISTS**

### Create Playlist
- [ ] Click "Create Playlist" button → Dialog opens
- [ ] Enter playlist name (required)
- [ ] Enter description (optional)
- [ ] Select music tracks (checkboxes work)
- [ ] Selected count updates
- [ ] Select announcements (checkboxes work)
- [ ] Selected count updates
- [ ] Music interval slider works (1-30 min)
- [ ] Announcement interval slider works (1-60 min)
- [ ] Toggle "Shuffle Music" switch
- [ ] Toggle "Shuffle Announcements" switch
- [ ] Set quiet hours (time inputs work)
- [ ] Select zones to assign playlist to (checkboxes)
- [ ] Click "Create Playlist" → Playlist created
- [ ] Toast: "Channel playlist created successfully"

### View Playlists
- [ ] All playlists display as cards
- [ ] Each card shows:
  - [ ] Playlist name
  - [ ] Description
  - [ ] Music count + interval
  - [ ] Announcement count + interval
  - [ ] Assigned zones (badges)
  - [ ] Quiet hours if set
  - [ ] Enabled/Disabled badge

### Edit Playlist
- [ ] Click "Edit" button on a playlist
- [ ] Dialog opens with pre-filled data
- [ ] Can modify all fields
- [ ] Click "Update Playlist" → Changes saved
- [ ] Toast: "Playlist updated successfully"

### Delete Playlist
- [ ] Click delete icon (trash)
- [ ] Playlist removed from list
- [ ] Toast: "Playlist deleted"

### Enable/Disable Playlist
- [ ] Toggle switch on playlist card
- [ ] Badge updates (Active/Disabled)

---

## 6️⃣ **SCHEDULER**

### Create Schedule (Interval-Based)
- [ ] Click "Create Schedule" button → Dialog opens
- [ ] Enter schedule name
- [ ] Select "Interval-Based" tab
- [ ] Set interval (minutes input works)
- [ ] Select announcements (checkboxes)
- [ ] Select devices/zones (checkboxes)
- [ ] Toggle "Avoid Repeat" switch
- [ ] Toggle "Enable Quiet Hours" switch
- [ ] Set quiet hours times
- [ ] Click "Create Schedule" → Schedule created
- [ ] Toast: "Created schedule: [name]"

### Create Schedule (Timeline-Based)
- [ ] Select "Timeline-Based" tab
- [ ] Set cycle duration (minutes)
- [ ] Click "Add Slot" button
- [ ] Select announcement from dropdown
- [ ] Set timestamp (seconds)
- [ ] Can add multiple slots
- [ ] Can remove slots (trash icon)
- [ ] Click "Create Schedule" → Schedule created

### View Schedules
- [ ] All schedules display in list
- [ ] Each shows:
  - [ ] Name
  - [ ] Schedule type
  - [ ] Time/interval details
  - [ ] Number of devices
  - [ ] Active/Disabled badge

### Enable/Disable Schedule
- [ ] Toggle switch works
- [ ] Toast: "Enabled/Disabled [schedule name]"
- [ ] Badge updates

### Delete Schedule
- [ ] Click delete from dropdown menu
- [ ] Confirmation required
- [ ] Schedule removed
- [ ] Toast: "Deleted [schedule name]"

---

## 7️⃣ **ZONES & DEVICES**

### View Zones
- [ ] Shows zone cards (Ground Floor, First Floor, etc.)
- [ ] Each zone shows:
  - [ ] Zone name
  - [ ] X/Y devices online
  - [ ] "Zone Settings" button

### Create Zone
- [ ] Click "Create Zone" button → Dialog opens
- [ ] Enter zone name (required)
- [ ] Enter description (optional)
- [ ] Click "Create Zone" → Zone created
- [ ] Toast: "Zone created successfully"

### Add Device
- [ ] Click "Add Device" button → Dialog opens
- [ ] Enter device name
- [ ] Enter device ID
- [ ] Select zone from dropdown
- [ ] Click "Add Device" → Device registered
- [ ] Toast: "Device added successfully"

### View Devices
- [ ] Devices listed under their zones
- [ ] Each device shows:
  - [ ] Online/Offline status (green/gray icon)
  - [ ] Device name
  - [ ] Last seen time
  - [ ] "Control" button

### Device Control Dialog
- [ ] Click "Control" button on a device
- [ ] Dialog opens showing:
  - [ ] Device status badge
  - [ ] Volume slider (works)
  - [ ] Play announcement dropdown + button
  - [ ] "Play Test Tone" button
  - [ ] "Sync Schedule" button
  - [ ] Device info (Zone, Last Seen, Device ID)
- [ ] Volume slider updates in real-time
- [ ] Click "Play Test Tone" → Toast notification
- [ ] Click "Sync Schedule" → Toast notification
- [ ] Select announcement + click "Play" → Announcement plays
- [ ] Toast: "Playing [announcement] on [device]"

### Zone Settings Dialog
- [ ] Click "Zone Settings" on a zone
- [ ] Dialog opens showing:
  - [ ] Channel Playlist dropdown (select playlist)
  - [ ] Selected playlist details displayed
  - [ ] Default volume slider
  - [ ] Quiet hours time inputs
  - [ ] Active schedules list
  - [ ] Devices in zone list
- [ ] Can change all settings
- [ ] Click "Save Settings" → Settings saved
- [ ] Toast: "Settings saved for [zone]"

---

## 8️⃣ **ADMIN (Super Admin Only)**

### View Clients
- [ ] Shows all clients in table
- [ ] Each shows: name, status, email, created date
- [ ] Can impersonate client (eye icon)
- [ ] Can suspend/activate client
- [ ] Can view client details

### Add Client
- [ ] Click "Add Client" button → Dialog opens
- [ ] Fill in client details (name, email, phone, etc.)
- [ ] Set trial days
- [ ] Set subscription price
- [ ] Toggle premium features
- [ ] Click "Create Client" → Client created
- [ ] Toast: "Client created successfully"

### View Users
- [ ] Shows all users across all clients
- [ ] Displays: name, email, role, client

### AI Configuration Tab
- [ ] Click "AI Configuration" tab
- [ ] Shows overview stats:
  - [ ] Active Providers count
  - [ ] Total Requests count
  - [ ] Monthly Spend (USD)

### Add AI Provider
- [ ] Click "Add AI Provider" button → Dialog opens
- [ ] Enter provider name
- [ ] Select AI provider type (OpenAI, ElevenLabs, etc.)
- [ ] Enter API key/activation code
- [ ] Set daily request limit
- [ ] Set monthly budget
- [ ] Shows provider features (badges)
- [ ] Click "Add Provider" → Provider created
- [ ] Toast: "AI Provider added successfully"

### View AI Providers
- [ ] All providers display as cards
- [ ] Each shows:
  - [ ] Provider icon and name
  - [ ] Active/Inactive toggle
  - [ ] Masked API key
  - [ ] Show/hide API key button (eye icon)
  - [ ] Copy API key button
  - [ ] Usage stats (Requests, Tokens, Cost)
  - [ ] Limits (Daily, Monthly budget)
  - [ ] Features list (badges)
  - [ ] Edit and Delete buttons

### Edit AI Provider
- [ ] Click "Edit" button
- [ ] Dialog opens with pre-filled data
- [ ] Can modify all fields
- [ ] Click "Update Provider" → Changes saved
- [ ] Toast: "AI Provider updated successfully"

### Toggle AI Provider Active/Inactive
- [ ] Toggle switch on provider card
- [ ] Badge updates (Active/Inactive)
- [ ] Card background changes slightly

### Delete AI Provider
- [ ] Click delete button (trash icon)
- [ ] Provider removed
- [ ] Toast: "AI Provider deleted"

### View Audit Logs
- [ ] Click "Audit Logs" tab
- [ ] Shows chronological list of all actions
- [ ] Displays: user, action, resource, timestamp
- [ ] Can filter by client
- [ ] Can search logs

---

## 9️⃣ **PROFILE PAGE**

### View Profile
- [ ] Shows user information
- [ ] Shows role badge
- [ ] Can edit name, email, phone

### Update Profile
- [ ] Modify fields
- [ ] Click "Save" → Changes saved
- [ ] Toast: "Profile updated"

### Change Password
- [ ] Enter current password
- [ ] Enter new password
- [ ] Confirm new password
- [ ] Click "Change Password" → Password updated
- [ ] Toast: "Password changed successfully"

---

## 🔟 **RESPONSIVE DESIGN (Mobile)**

### Mobile Layout
- [ ] All pages work on mobile (iPhone/Android size)
- [ ] Bottom navigation always visible
- [ ] Content scrolls properly
- [ ] Dialogs/modals fit on screen
- [ ] Tap targets are at least 44px
- [ ] No horizontal scrolling
- [ ] Forms are mobile-friendly

### Dialogs on Mobile
- [ ] Dialogs scroll if content is too tall
- [ ] Can close dialogs with X button
- [ ] Buttons at bottom of dialogs are accessible

---

## 1️⃣1️⃣ **TOAST NOTIFICATIONS**

- [ ] Success toasts appear (green)
- [ ] Error toasts appear (red)
- [ ] Info toasts appear (blue)
- [ ] Toasts auto-dismiss after 3-4 seconds
- [ ] Multiple toasts stack properly
- [ ] Toasts don't block important UI

---

## 1️⃣2️⃣ **LOADING STATES**

- [ ] Loading spinner shows on initial app load
- [ ] Buttons show loading state when processing
- [ ] Disabled buttons can't be clicked during loading

---

## 1️⃣3️⃣ **ERROR HANDLING**

- [ ] Empty states show helpful messages
  - [ ] "No music tracks yet" with CTA button
  - [ ] "No announcements yet"
  - [ ] "No playlists yet"
  - [ ] "No schedules yet"
  - [ ] "No zones yet"

- [ ] Form validation works
  - [ ] Required fields show errors
  - [ ] Invalid emails rejected
  - [ ] Password requirements enforced

---

## 1️⃣4️⃣ **AUTHENTICATION**

### Sign In
- [ ] Enter email and password
- [ ] Click "Sign In" → Redirects to dashboard
- [ ] Invalid credentials show error

### Sign Out
- [ ] Click "Sign out" in sidebar → Logs out
- [ ] Redirects to landing page

### Role-Based Access
- [ ] Super Admin sees all pages including Admin
- [ ] Client sees all pages except Admin
- [ ] Floor User sees limited pages

---

## ✅ **FINAL CHECKS**

- [ ] All buttons clickable and functional
- [ ] All forms submit correctly
- [ ] All dialogs open and close
- [ ] All dropdowns/selects work
- [ ] All sliders update values
- [ ] All checkboxes toggle
- [ ] All switches toggle
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No missing imports
- [ ] All routes work
- [ ] Navigation is smooth
- [ ] Data persists correctly (mock data)

---

## 🎯 **EXPORT READINESS**

Once ALL checkboxes above are checked:

✅ **Frontend is FULLY TESTED and READY FOR EXPORT**

✅ **Backend guide is COMPLETE for Cursor AI**

✅ **AI Configuration for Super Admin is IMPLEMENTED**

---

## 📦 **WHAT TO EXPORT**

1. **Entire `/src` folder** - All frontend code
2. **`/package.json`** - Dependencies
3. **`/vite.config.ts`** - Build configuration
4. **`/tailwind.config.js`** (if exists) - Tailwind setup
5. **`/tsconfig.json`** - TypeScript config
6. **`/DJANGO_BACKEND_COMPLETE_GUIDE.md`** - Backend instructions
7. **`/FRONTEND_FEATURE_TEST_CHECKLIST.md`** - This checklist
8. **`/README.md`** - Project overview

---

## 🚀 **NEXT STEPS AFTER EXPORT**

1. Import code into new project
2. Run `npm install`
3. Test frontend locally: `npm run dev`
4. Follow Django backend guide to create backend
5. Connect frontend to Django REST API
6. Deploy to production

**EVERYTHING IS NOW DOCUMENTED AND READY FOR DEPLOYMENT!** 🎉
