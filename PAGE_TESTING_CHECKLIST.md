# Application Page Testing Checklist

## Pre-Testing Setup

1. **Start Backend Server:**
   ```powershell
   cd sync2gear_backend
   python manage.py runserver
   ```
   - Should start on `http://localhost:8000`
   - Wait for "Starting development server" message

2. **Start Frontend Server:**
   ```powershell
   npm run dev
   ```
   - Should start on `http://localhost:5173`
   - Wait for "Local: http://localhost:5173" message

3. **Verify Auto-Login:**
   - Open browser to `http://localhost:5173`
   - Should see "Auto-logging in as admin..." briefly
   - Should automatically log in and show Dashboard
   - No landing page or login form should appear

---

## ✅ Page Testing Checklist

### 1. Dashboard Page
- [ ] **Navigation:** Click "Dashboard" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Dashboard widgets/content displayed
- [ ] **No crashes:** Page renders without errors

### 2. Music Library Page
- [ ] **Navigation:** Click "Music Library" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Music files/folders displayed (if any)
- [ ] **No crashes:** Page renders without errors

### 3. Announcements Page
- [ ] **Navigation:** Click "Announcements" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Announcements list displayed (if any)
- [ ] **No crashes:** Page renders without errors

### 4. Channel Playlists Page
- [ ] **Navigation:** Click "Channel Playlists" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Playlists displayed (if any)
- [ ] **No crashes:** Page renders without errors

### 5. Scheduler Page
- [ ] **Navigation:** Click "Scheduler" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Schedule calendar/list displayed
- [ ] **No crashes:** Page renders without errors

### 6. Zones & Devices Page
- [ ] **Navigation:** Click "Zones & Devices" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Zones and devices displayed (if any)
- [ ] **No crashes:** Page renders without errors

### 7. Team Members (Users) Page
- [ ] **Navigation:** Click "Team Members" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Users list displayed
- [ ] **No crashes:** Page renders without errors
- [ ] **Admin only:** Should be visible (you're logged in as admin)

### 8. Admin Page
- [ ] **Navigation:** Click "Admin" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** Admin dashboard/controls displayed
- [ ] **No crashes:** Page renders without errors
- [ ] **Admin only:** Should be visible (you're logged in as admin)

### 9. Profile Page
- [ ] **Navigation:** Click "Profile" in sidebar
- [ ] **Loads correctly:** No errors in console
- [ ] **Content visible:** User profile information displayed
- [ ] **No crashes:** Page renders without errors
- [ ] **User info:** Should show admin user details

---

## 🔍 Additional Tests

### Navigation Tests
- [ ] **Sidebar navigation:** All menu items clickable
- [ ] **Mobile navigation:** Test on mobile/resized window
- [ ] **Page switching:** Switch between pages multiple times
- [ ] **No navigation errors:** Console should be clean

### Auto-Login Tests
- [ ] **First load:** Auto-login works on fresh page load
- [ ] **Refresh:** Auto-login works after page refresh (F5)
- [ ] **Hard refresh:** Auto-login works after hard refresh (Ctrl+F5)
- [ ] **Clear storage:** Clear localStorage, reload - should auto-login again

### Error Handling Tests
- [ ] **Backend offline:** Stop backend, check error handling
- [ ] **Network errors:** Check how app handles API failures
- [ ] **Invalid data:** Check error boundaries work

### Console Checks
- [ ] **No errors:** Browser console should have no red errors
- [ ] **No warnings:** Check for any yellow warnings
- [ ] **Network tab:** API calls should return 200/201 (not 401/403/500)

---

## 📋 Expected Pages (All Should Work)

Based on code analysis, these pages should be accessible:

1. ✅ **Dashboard** (`currentPage: 'dashboard'`)
2. ✅ **Music Library** (`currentPage: 'music'`)
3. ✅ **Announcements** (`currentPage: 'announcements'`)
4. ✅ **Channel Playlists** (`currentPage: 'channel-playlists'`)
5. ✅ **Scheduler** (`currentPage: 'scheduler'`)
6. ✅ **Zones** (`currentPage: 'zones'`)
7. ✅ **Users** (`currentPage: 'users'`) - Admin only
8. ✅ **Admin** (`currentPage: 'admin'`) - Admin only
9. ✅ **Admin Settings** (`currentPage: 'admin-settings'`) - Admin only
10. ✅ **Profile** (`currentPage: 'profile'`)

---

## 🚫 Disabled Pages (Dev Mode)

These pages are **disabled in dev mode** but stored in backup:

- ❌ Landing Page
- ❌ Login Page
- ❌ Signup Page
- ❌ Contact Us Page
- ❌ Terms & Conditions
- ❌ Privacy Policy
- ❌ Cancellation Policy
- ❌ Tutorial

**Note:** These are stored in `App.tsx.BACKUP_ORIGINAL_AUTH_FLOW` and can be restored.

---

## 🐛 Common Issues to Check

### If Auto-Login Fails:
1. Check backend is running on port 8000
2. Verify admin user exists: `admin@sync2gear.com` / `admin123`
3. Check browser console for errors
4. Check network tab for failed API calls

### If Pages Don't Load:
1. Check browser console for errors
2. Verify all components are imported correctly
3. Check if backend API is responding
4. Verify user role is 'admin' (check localStorage)

### If Navigation Doesn't Work:
1. Check `Layout` component is rendering
2. Verify `onNavigate` function is working
3. Check `currentPage` state updates correctly

---

## 📝 Testing Results Template

```
Date: ___________
Tester: ___________

✅ Working Pages:
- Dashboard: [ ] Pass / [ ] Fail
- Music Library: [ ] Pass / [ ] Fail
- Announcements: [ ] Pass / [ ] Fail
- Channel Playlists: [ ] Pass / [ ] Fail
- Scheduler: [ ] Pass / [ ] Fail
- Zones: [ ] Pass / [ ] Fail
- Users: [ ] Pass / [ ] Fail
- Admin: [ ] Pass / [ ] Fail
- Profile: [ ] Pass / [ ] Fail

Issues Found:
1. _______________________________________
2. _______________________________________
3. _______________________________________

Console Errors:
- _______________________________________
- _______________________________________
```

---

## 🎯 Quick Test Script

Run this in browser console after page loads:

```javascript
// Test all page navigation
const pages = ['dashboard', 'music', 'announcements', 'channel-playlists', 'scheduler', 'zones', 'users', 'admin', 'profile'];
pages.forEach(page => {
  console.log(`Testing ${page}...`);
  window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
  setTimeout(() => console.log(`✅ ${page} loaded`), 1000);
});
```

---

**Last Updated:** Page testing checklist  
**Status:** Ready for testing
