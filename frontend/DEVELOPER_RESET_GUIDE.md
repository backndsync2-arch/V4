# Developer Guide: Application Reset System

## Quick Start

The sync2gear application now has a comprehensive reset system. Here's what you need to know:

---

## 🚀 Quick Commands

```javascript
// Import reset utilities
import { 
  clearAllStorage, 
  resetApp, 
  resetAndReload, 
  exportAppData 
} from '@/lib/resetApp';

// Clear localStorage only
clearAllStorage();

// Full reset (async)
await resetApp();

// Reset and reload page
await resetAndReload();

// Export data backup
exportAppData();
```

---

## 📁 Files Modified/Created

### New Files
- `/src/lib/resetApp.ts` - Reset utility functions
- `/src/app/components/ResetControls.tsx` - Reset UI component
- `/EXPORT_READY.md` - Export status documentation
- `/RESET_SUMMARY.md` - Comprehensive reset summary
- `/DEVELOPER_RESET_GUIDE.md` - This guide

### Modified Files
- `/src/lib/mockData.ts` - All arrays cleared to []
- `/src/lib/auth.tsx` - Migrated to Django backend
- `/src/lib/playback.tsx` - Reset to clean offline state
- `/src/app/components/Profile.tsx` - Added Advanced tab with reset controls
- `/src/app/components/AdminSettings.tsx` - Added reset controls import

---

## 🎯 Use Cases

### For Development

**Adding Demo Data Back:**
```typescript
// In /src/lib/mockData.ts
export const mockUsers: User[] = [
  {
    id: 'dev1',
    email: 'dev@test.com',
    name: 'Dev User',
    role: 'client',
    createdAt: new Date(),
    lastSeen: new Date(),
  },
];
```

**Temporary Bypass:**
```typescript
// In component
const DEV_MODE = import.meta.env.DEV;
if (DEV_MODE) {
  // Use mock data
} else {
  // Use real API
}
```

### For Testing

**Reset Between Tests:**
```typescript
beforeEach(async () => {
  await resetApp();
});
```

**Export State for Debugging:**
```typescript
// After reproducing bug
exportAppData();
// Send the downloaded JSON file for analysis
```

### For Production

**User Data Management:**
```typescript
// Give users control over their data
<ResetControls />
```

**Emergency Reset:**
```typescript
// If app gets into bad state
await resetAndReload();
```

---

## 🔧 API Reference

### clearAllStorage()

**Purpose:** Remove all localStorage keys used by sync2gear

**Usage:**
```typescript
import { clearAllStorage } from '@/lib/resetApp';

clearAllStorage();
```

**What It Clears:**
- `sync2gear_user`
- `sync2gear_impersonating`
- `access_token`
- `refresh_token`
- `sync2gear_onboarding_complete`
- `sync2gear_tutorial_complete`
- `background_audio_enabled`
- `background_audio_initialized`
- All sessionStorage

**Returns:** `void`

**Side Effects:** None (does NOT reload page)

---

### resetApp()

**Purpose:** Comprehensive application reset

**Usage:**
```typescript
import { resetApp } from '@/lib/resetApp';

const success = await resetApp();
if (success) {
  console.log('Reset complete');
}
```

**What It Does:**
1. Calls `clearAllStorage()`
2. Stops all audio elements
3. Clears audio element sources
4. Unregisters service workers
5. Clears browser caches
6. Logs results

**Returns:** `Promise<boolean>`

**Side Effects:** Stops audio, clears caches

**Error Handling:** Catches errors and returns false

---

### resetAndReload()

**Purpose:** Reset app and force page reload

**Usage:**
```typescript
import { resetAndReload } from '@/lib/resetApp';

await resetAndReload();
// Page will reload, code after this won't execute
```

**What It Does:**
1. Calls `resetApp()`
2. Navigates to `/`
3. Reloads the page

**Returns:** `Promise<void>`

**Side Effects:** **PAGE RELOAD** - User loses current context

**Use When:** 
- App is in corrupted state
- User explicitly requests full reset
- Starting fresh session

---

### exportAppData()

**Purpose:** Download current app state as JSON

**Usage:**
```typescript
import { exportAppData } from '@/lib/resetApp';

exportAppData();
```

**What It Exports:**
```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-20T12:00:00.000Z",
  "localStorage": { /* all localStorage data */ },
  "sessionStorage": { /* all sessionStorage data */ }
}
```

**Returns:** `void`

**Side Effects:** Downloads file named `sync2gear-backup-{timestamp}.json`

**Use When:**
- Debugging user issues
- Backing up data before reset
- Migrating between devices
- Compliance/audit requirements

---

## 🎨 UI Component

### ResetControls Component

**Location:** `/src/app/components/ResetControls.tsx`

**Usage:**
```tsx
import { ResetControls } from '@/app/components/ResetControls';

function MySettings() {
  return (
    <div>
      <h1>Settings</h1>
      <ResetControls />
    </div>
  );
}
```

**Features:**
- Export data button
- Clear storage button (with confirmation)
- Full reset button (with confirmation)
- Toast notifications
- Loading states
- Error handling

**Props:** None (standalone component)

**Styling:** 
- Destructive theme (red border)
- Responsive layout
- Mobile-friendly
- Accessible dialogs

---

## 🔐 Security Considerations

### localStorage Keys

**Sensitive Data:**
- `access_token` - Contains JWT token
- `refresh_token` - Contains refresh JWT
- `sync2gear_user` - Contains user object

**Best Practices:**
1. Always clear tokens on sign out
2. Never log token values
3. Use HTTPS in production
4. Implement token rotation
5. Clear tokens on reset

### Reset Permissions

**Current Implementation:**
- All authenticated users can reset their own data
- No admin override needed
- No backend notification on reset

**Recommendations:**
1. Consider logging reset events to audit log
2. Notify backend when user resets
3. Implement "soft delete" for important data
4. Add rate limiting to prevent abuse

---

## 🧪 Testing

### Manual Testing

**Test Reset Functions:**
```typescript
// 1. Clear storage test
localStorage.setItem('test', 'value');
clearAllStorage();
console.log(localStorage.getItem('test')); // null

// 2. Full reset test
await resetApp();
// Check: audio stopped, caches cleared

// 3. Export test
exportAppData();
// Check: file downloads with correct format
```

**Test UI Component:**
1. Navigate to Profile → Advanced
2. Click "Export" - Should download file
3. Click "Clear Storage" - Should show dialog
4. Confirm - Should clear and show toast
5. Click "Reset App" - Should show warning dialog
6. Confirm - Should reset and reload

### Automated Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { clearAllStorage, resetApp, exportAppData } from '@/lib/resetApp';

describe('Reset Functions', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should clear all storage', () => {
    localStorage.setItem('sync2gear_user', 'test');
    clearAllStorage();
    expect(localStorage.getItem('sync2gear_user')).toBeNull();
  });

  it('should reset app successfully', async () => {
    const result = await resetApp();
    expect(result).toBe(true);
  });
});
```

---

## 🐛 Common Issues

### Issue: localStorage not clearing

**Symptoms:**
- Keys still present after clearAllStorage()
- User data persists after reset

**Solutions:**
1. Check browser privacy settings
2. Verify key names match exactly
3. Check for browser extensions blocking storage
4. Try incognito/private mode

**Debug:**
```typescript
console.log('Before:', Object.keys(localStorage));
clearAllStorage();
console.log('After:', Object.keys(localStorage));
```

### Issue: Service worker persists

**Symptoms:**
- Old content serves after reset
- App doesn't reflect changes

**Solutions:**
1. Manually unregister in DevTools
2. Check service worker lifecycle
3. Force reload with Ctrl+Shift+R

**Debug:**
```typescript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Active SW:', registrations.length);
  registrations.forEach(r => r.unregister());
});
```

### Issue: Export downloads empty file

**Symptoms:**
- JSON file is empty or minimal
- Missing expected data

**Solutions:**
1. Check localStorage has data before export
2. Verify JSON.stringify doesn't fail
3. Check browser download permissions

**Debug:**
```typescript
console.log('localStorage:', { ...localStorage });
console.log('sessionStorage:', { ...sessionStorage });
exportAppData();
```

---

## 📝 Best Practices

### When to Use Each Function

**clearAllStorage()**
- User wants to sign out completely
- Clearing sensitive data
- Testing authentication flow
- No need to stop playback

**resetApp()**
- App is in corrupted state
- User reports strange behavior
- Preparing for fresh start
- Keep user on current page

**resetAndReload()**
- Nuclear option - complete fresh start
- User explicitly requests reset
- After major data corruption
- Onboarding flow restart

**exportAppData()**
- Before any destructive action
- User wants to backup data
- Debugging user issues
- Compliance requirements

### Code Organization

**DO:**
```typescript
// Import at top of file
import { resetApp } from '@/lib/resetApp';

// Use in async function
async function handleReset() {
  const confirmed = await showConfirmDialog();
  if (confirmed) {
    await resetApp();
    toast.success('Reset complete');
  }
}
```

**DON'T:**
```typescript
// Don't reset without confirmation
resetAndReload(); // User loses work!

// Don't ignore errors
resetApp(); // No error handling

// Don't export without user action
useEffect(() => {
  exportAppData(); // Auto-downloads!
}, []);
```

---

## 🔄 Future Enhancements

### Potential Improvements

1. **Selective Reset:**
   ```typescript
   resetData({ 
     music: true, 
     announcements: false, 
     schedules: true 
   });
   ```

2. **Scheduled Resets:**
   ```typescript
   scheduleReset({
     frequency: 'weekly',
     day: 'sunday',
     time: '03:00'
   });
   ```

3. **Cloud Backup:**
   ```typescript
   await backupToCloud();
   await restoreFromCloud(backupId);
   ```

4. **Audit Trail:**
   ```typescript
   logResetEvent({
     userId,
     timestamp,
     type: 'full_reset',
     reason: 'user_requested'
   });
   ```

5. **Progressive Reset:**
   ```typescript
   await resetWithProgress((progress) => {
     console.log(`Reset ${progress}% complete`);
   });
   ```

---

## 📞 Need Help?

### Documentation

- **Full Reset Summary:** `/RESET_SUMMARY.md`
- **Export Status:** `/EXPORT_READY.md`
- **API Integration:** `/FRONTEND_DJANGO_INTEGRATION.md`
- **All Docs Index:** `/DOCUMENTATION_INDEX.md`

### Quick Links

- **Source Code:** `/src/lib/resetApp.ts`
- **UI Component:** `/src/app/components/ResetControls.tsx`
- **Mock Data:** `/src/lib/mockData.ts`

### Support

For questions or issues:
1. Check documentation in `/` directory
2. Review source code comments
3. Check git commit history
4. Contact: dev@sync2gear.com

---

**Last Updated:** January 20, 2026  
**Version:** 1.0.0  
**Status:** Production Ready

---

**sync2gear Ltd © 2025 - All Rights Reserved**
