# 📚 Tutorial System - Complete Guide

## ✅ Tutorials Are Implemented!

The sync2gear application has **comprehensive tutorials** for both **end users (customers)** and **admin users (staff)**. Here's where they are and how to access them.

---

## 🎯 Two Tutorial Systems

### 1. **TutorialOverlay** (Main Tutorial - Recommended)
**Location:** `src/app/components/TutorialOverlay.tsx`

**Features:**
- ✅ Role-based content (different for admin vs customer)
- ✅ Welcome screen with overview
- ✅ Step-by-step interactive guidance
- ✅ Progress tracking
- ✅ Completion screen with next steps
- ✅ Can be restarted from Profile page

**Customer Tutorial Steps (7 steps):**
1. Dashboard - Your Control Centre
2. Music Library
3. Announcements Studio
4. Instant Announcements
5. Scheduler - Automated Announcements
6. Zones & Device Management
7. Preview vs. Live Play

**Admin Tutorial Steps (5 steps):**
1. Admin Dashboard Overview
2. Managing Client Accounts
3. Client Impersonation (Admin View)
4. Audit Logs & Monitoring
5. System Monitoring

---

### 2. **Tutorial** (Basic Tutorial)
**Location:** `src/app/components/Tutorial.tsx`

**Features:**
- ✅ 7 basic steps covering core features
- ✅ Simple dialog-based interface
- ✅ Progress bar
- ✅ Tips and key features

---

## 🔍 How to Access Tutorials

### **Automatic Display:**
- Tutorials automatically show when a user first logs in
- Only shown once per user role (stored in localStorage)
- Key: `sync2gear_tutorial_admin` or `sync2gear_tutorial_customer`

### **Manual Access:**

#### **Option 1: Profile Page**
1. Click on your profile icon/name (top right)
2. Go to **"Tutorial"** tab
3. Click **"Start Tutorial"** button

#### **Option 2: Reset Tutorial (Developer)**
Open browser console and run:
```javascript
localStorage.removeItem('sync2gear_tutorial_admin'); // For admin
// OR
localStorage.removeItem('sync2gear_tutorial_customer'); // For customer
```
Then refresh the page.

#### **Option 3: Programmatic Restart**
The tutorial can be restarted via:
```javascript
window.restartTutorial(); // Available globally
```

---

## 📁 File Locations

### Tutorial Components:
- ✅ `src/app/components/TutorialOverlay.tsx` - Main comprehensive tutorial
- ✅ `src/app/components/Tutorial.tsx` - Basic tutorial
- ✅ `src/app/components/Profile.tsx` - Tutorial restart button (line 311)

### Integration:
- ✅ `src/app/App.tsx` - Both tutorials are rendered (lines 164-165)

---

## 🎨 Tutorial Features

### **Welcome Screen:**
- Overview of what you'll learn
- Feature list
- Tutorial length and time estimate
- "Start Tutorial" or "Skip" options

### **Step-by-Step:**
- Progress bar showing completion
- Icon for each step
- Detailed feature list
- Pro tips (where applicable)
- Previous/Next navigation

### **Completion Screen:**
- Congratulations message
- Recommended next steps
- Help and support information
- "Complete Tutorial" button

---

## 🔧 Customization

### **To Modify Tutorial Content:**

1. **Customer Tutorial:**
   - Edit `customerTutorial` object in `TutorialOverlay.tsx` (line 156)
   - Modify `welcome`, `steps`, and `completion` sections

2. **Admin Tutorial:**
   - Edit `staffTutorial` object in `TutorialOverlay.tsx` (line 48)
   - Modify `welcome`, `steps`, and `completion` sections

### **To Change Tutorial Behavior:**

- **Auto-show on login:** Edit `useEffect` in `TutorialOverlay.tsx` (line 323)
- **Tutorial storage key:** Change `sync2gear_tutorial_${user?.role}` (line 325)
- **Tutorial trigger:** Modify the condition in `App.tsx` (line 164)

---

## 🧪 Testing Tutorials

### **Test Customer Tutorial:**
1. Log in as a customer user
2. Tutorial should auto-show (if not seen before)
3. OR go to Profile > Tutorial tab > Start Tutorial

### **Test Admin Tutorial:**
1. Log in as an admin user
2. Tutorial should auto-show (if not seen before)
3. OR go to Profile > Tutorial tab > Start Tutorial

### **Reset Tutorial for Testing:**
```javascript
// In browser console:
localStorage.removeItem('sync2gear_tutorial_customer');
localStorage.removeItem('sync2gear_tutorial_admin');
// Then refresh page
```

---

## 📊 Tutorial Content Summary

### **Customer Tutorial Covers:**
- ✅ Dashboard overview
- ✅ Music library management
- ✅ Creating announcements (TTS)
- ✅ Instant announcements
- ✅ Scheduling automation
- ✅ Zone and device management
- ✅ Preview vs live play

### **Admin Tutorial Covers:**
- ✅ Admin dashboard
- ✅ Client account management
- ✅ Client impersonation
- ✅ Audit logs
- ✅ System monitoring

---

## ✅ Status

**Tutorials are fully implemented and working!**

- ✅ Role-based content
- ✅ Interactive step-by-step
- ✅ Welcome and completion screens
- ✅ Progress tracking
- ✅ Restart functionality
- ✅ Profile page integration

---

## 🚀 Next Steps

If you want to:
- **Add more tutorial steps:** Edit the `steps` array in `TutorialOverlay.tsx`
- **Change tutorial styling:** Modify the Dialog components
- **Add video tutorials:** Integrate video embeds in tutorial steps
- **Add tooltips:** Create a separate tooltip system for in-app hints

---

**The tutorials are ready to use! They automatically show for new users and can be restarted from the Profile page.** 🎓
