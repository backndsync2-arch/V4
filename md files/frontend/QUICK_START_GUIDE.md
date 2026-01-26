# 🚀 SYNC2GEAR - QUICK START GUIDE

## 📱 **FIRST TIME SETUP (Super Admin)**

### **Step 1: Configure AI Providers**
1. Sign in as Super Admin
2. Go to **Admin** → **AI Configuration** tab
3. Click **"Add AI Provider"**
4. Add OpenAI:
   - Name: "OpenAI GPT-4 Production"
   - Provider: OpenAI (GPT-4, DALL-E)
   - API Key: `sk-proj-xxxxx...`
   - Daily Limit: 1000 requests
   - Monthly Budget: $500
   - Click **"Add Provider"**
5. Add ElevenLabs:
   - Name: "ElevenLabs TTS"
   - Provider: ElevenLabs (TTS)
   - API Key: `el_xxxxx...`
   - Daily Limit: 500 requests
   - Monthly Budget: $200
   - Click **"Add Provider"**

### **Step 2: Create First Client**
1. Go to **Admin** → **Clients** tab
2. Click **"Add Client"**
3. Fill in details:
   - Business Name: "Downtown Coffee Shop"
   - Contact Email: "manager@downtowncoffee.com"
   - Telephone: "+44 20 1234 5678"
   - Trial Days: 14
   - Subscription Price: £49.99/month
4. Enable premium features if needed
5. Click **"Create Client"**

---

## 🏢 **CLIENT SETUP (Business Owner)**

### **Step 1: Upload Music**
1. Go to **Music Library**
2. Click **"Upload Music"**
3. Drag and drop MP3/WAV files (or click to browse)
4. Wait for upload to complete
5. Repeat for all tracks

### **Step 2: Create Announcements**

#### **Text-to-Speech:**
1. Go to **Announcements**
2. Click **"Create Announcement"**
3. Select **"Text-to-Speech"** tab
4. Enter title: "Welcome Message"
5. Enter text: "Welcome to Downtown Coffee! We're glad you're here."
6. Select voice from dropdown
7. Click **"Generate"**

#### **Upload Audio:**
1. Click **"Create Announcement"**
2. Select **"Upload Audio"** tab
3. Enter title: "Sale Promotion"
4. Upload MP3/WAV file
5. Click **"Upload"**

### **Step 3: Create Zones**
1. Go to **Zones & Devices**
2. Click **"Create Zone"**
3. Enter zone name: "Ground Floor"
4. Enter description: "Main customer area"
5. Click **"Create Zone"**
6. Repeat for other zones (First Floor, Outdoor, etc.)

### **Step 4: Register Devices**
1. Go to **Zones & Devices**
2. Click **"Add Device"**
3. Enter device name: "Ground Floor Speaker 1"
4. Enter device ID: (from hardware)
5. Select zone: "Ground Floor"
6. Click **"Add Device"**
7. Repeat for all speakers

### **Step 5: Create Channel Playlist**
1. Go to **Channel Playlists**
2. Click **"Create Playlist"**
3. Enter name: "Morning Rush Mix"
4. Enter description: "Upbeat music with welcome messages"
5. **Select Music:**
   - Check 15-20 music tracks
6. **Select Announcements:**
   - Check 3-5 announcements
7. **Configure Settings:**
   - Music Interval: 5 minutes
   - Announcement Interval: 15 minutes
   - Toggle "Shuffle Music" ON
   - Toggle "Shuffle Announcements" OFF
8. **Set Quiet Hours:**
   - Start: 22:00
   - End: 07:00
9. **Assign to Zones:**
   - Check "Ground Floor"
10. Click **"Create Playlist"**

### **Step 6: Assign Playlist to Zone**
1. Go to **Zones & Devices**
2. Find "Ground Floor" zone
3. Click **"Zone Settings"**
4. Select playlist: "Morning Rush Mix"
5. Set default volume: 75%
6. Confirm quiet hours: 22:00 - 07:00
7. Click **"Save Settings"**

---

## 🎵 **DAILY USE**

### **Live Playback (Manual Control)**

1. Go to **Dashboard**
2. **Select Music:**
   - Check the music tracks you want to play
   - Selected count shows: "X tracks selected"
3. **Select Announcements:**
   - Check announcements to queue
   - Selected count shows: "X announcements selected"
4. **Choose Zone:**
   - Select from dropdown: "Ground Floor"
5. **Configure Playback:**
   - Announcement Interval: 10 minutes (slider)
   - Fade Duration: 3 seconds (slider)
   - Background Music Volume: 30% (slider)
6. Click big green **"START"** button
7. **Monitor Playback:**
   - **Now Playing** card shows current music track
   - **Next Announcement** card shows countdown timer
   - Click **"Play Now"** to manually trigger announcement
8. Click red **"STOP"** button when done

### **Automated Scheduling**

1. Go to **Scheduler**
2. Click **"Create Schedule"**
3. Enter name: "Lunch Promotions"
4. **Interval-Based:**
   - Select "Interval-Based" tab
   - Play every: 30 minutes
   - Select announcements (lunch specials)
   - Select devices: Ground Floor speakers
   - Toggle "Avoid Repeat" ON
   - Enable Quiet Hours: 22:00 - 08:00
5. Click **"Create Schedule"**
6. Schedule runs automatically!

### **Instant Announcement**

1. Go to **Zones & Devices**
2. Find device or zone
3. Click **"Control"** on a device
4. Select announcement from dropdown
5. Click **"Play"**
6. Announcement plays immediately on that device

---

## 📊 **MONITORING**

### **Dashboard Stats**
- **Music Tracks:** Total count
- **Announcements:** Total count
- **Active Schedules:** Running schedules
- **Online Devices:** X/Y devices online

### **Device Status**
- **Green icon** = Online
- **Gray icon** = Offline
- **Last Seen** timestamp shows recent activity

### **Recent Play Events**
- Shows latest announcement plays
- Status: Completed ✅ / Failed ❌ / Pending ⏳

### **Active Schedules**
- Lists all enabled schedules
- Shows interval and device count

---

## 🛠️ **COMMON TASKS**

### **Change Zone Volume**
1. Zones → Select zone → Zone Settings
2. Adjust "Default Volume" slider
3. Click "Save Settings"
4. All devices in zone update

### **Edit Channel Playlist**
1. Channel Playlists → Find playlist
2. Click **"Edit"** button
3. Modify music, announcements, intervals, zones
4. Click **"Update Playlist"**

### **Enable/Disable Schedule**
1. Scheduler → Find schedule
2. Toggle switch (Active/Disabled)
3. Changes take effect immediately

### **Test Device**
1. Zones → Find device
2. Click **"Control"**
3. Click **"Play Test Tone"**
4. Speaker beeps to confirm it's working

### **Sync Device Schedule**
1. Zones → Find device
2. Click **"Control"**
3. Click **"Sync Schedule"**
4. Device downloads latest schedules

---

## 🔧 **TROUBLESHOOTING**

### **Device Offline:**
- Check power cable
- Check network connection
- Restart device
- Check last seen timestamp

### **Announcement Not Playing:**
- Check device is online
- Check announcement is enabled
- Check zone settings
- Check quiet hours

### **Music Not Uploading:**
- Check file format (MP3/WAV)
- Check file size (max 50MB)
- Check internet connection
- Try smaller file

### **Schedule Not Running:**
- Check schedule is enabled (toggle ON)
- Check quiet hours aren't active
- Check devices are online
- Check selected days (Mon-Sun)

---

## 👥 **USER ROLES**

### **Super Admin (sync2gear staff)**
- Can do EVERYTHING
- Manage all clients
- Configure AI providers
- View system-wide audit logs
- Impersonate clients

### **Client Admin (Business Owner)**
- Manage their own business
- Upload music and announcements
- Create playlists and schedules
- Manage zones and devices
- Add team members
- Cannot access other clients

### **Floor User (Staff)**
- View single floor only
- Play instant announcements
- Cannot create or edit content
- Cannot change settings
- Cannot add devices

---

## 💡 **PRO TIPS**

1. **Use Channel Playlists:** Pre-configure music + announcements for different times of day (Morning Mix, Lunch Rush, Evening Chill)

2. **Set Quiet Hours:** Prevent announcements during closed hours (22:00 - 07:00)

3. **Shuffle Music:** Keep content fresh by shuffling music while keeping announcements in order

4. **Multiple Announcements:** Select 5-10 announcements to avoid repetition

5. **Zone-Specific Content:** Create different playlists for different areas (Upbeat for retail floor, Calm for office)

6. **Schedule Promotions:** Use scheduler for time-specific promotions (lunch specials at 12:00, 12:30, 13:00)

7. **Test Before Launch:** Use "Play Test Tone" to verify speakers work before going live

8. **Monitor Device Status:** Check dashboard daily to ensure all devices are online

9. **Enable Avoid Repeat:** Prevent same announcement playing twice in a row

10. **Use Tags/Categories:** Organize announcements by type (Safety, Promotion, Event, Welcome)

---

## 📞 **NEED HELP?**

### **Frontend Issues:**
- Check browser console for errors
- Clear browser cache
- Try different browser
- Check network connection

### **Backend/API Issues:**
- Refer to Django backend logs
- Check database connection
- Verify API endpoints
- Check authentication tokens

### **Device Issues:**
- Check device manufacturer documentation
- Verify WebSocket connection
- Check device firmware version
- Contact hardware support

---

## 🎯 **BEST PRACTICES**

1. **Organize Content:**
   - Name files clearly ("Welcome Message - January 2025")
   - Use categories/tags
   - Delete old content regularly

2. **Optimize Audio:**
   - Use consistent volume levels
   - Keep announcements under 30 seconds
   - Test audio quality before uploading

3. **Plan Schedules:**
   - Map out content for week/month
   - Avoid over-scheduling (too many announcements)
   - Update seasonal content

4. **Monitor Performance:**
   - Check device status daily
   - Review play event logs
   - Track which announcements are most effective

5. **Train Team:**
   - Show staff how to play instant announcements
   - Explain quiet hours
   - Set permissions appropriately

---

## ✅ **QUICK REFERENCE**

| Task | Steps |
|------|-------|
| Upload Music | Music Library → Upload Music → Select Files → Upload |
| Create TTS | Announcements → Create → Text-to-Speech → Enter Text → Generate |
| Create Playlist | Channel Playlists → Create → Select Content → Configure → Save |
| Start Playback | Dashboard → Select Music/Announcements → START |
| Create Schedule | Scheduler → Create → Select Type → Configure → Save |
| Add Device | Zones → Add Device → Enter Details → Save |
| Play Instant | Zones → Control Device → Select Announcement → Play |
| Edit Zone | Zones → Zone Settings → Modify → Save |

---

**That's it! You're now ready to use sync2gear! 🎉**

For detailed feature documentation, see:
- `/COMPLETE_PROJECT_SUMMARY.md`
- `/FRONTEND_FEATURE_TEST_CHECKLIST.md`
