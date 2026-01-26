# Auto-Login Dev Mode Implementation

## Overview

In development mode, the app now automatically logs in as admin and bypasses all landing/login pages. You go straight to the dashboard when you open the app.

## What Was Changed

### 1. **auth.tsx** - Added auto-login functionality
   - In dev mode, if no user is found, automatically tries to login as admin
   - Tries common admin passwords: `admin123`, `password123`, `dev123`
   - Uses credentials: `admin@sync2gear.com` / `admin123`
   - If token validation fails in dev mode, also attempts auto-login

### 2. **App.tsx** - Bypassed all auth pages in dev mode
   - **Original logic stored in:** `App.tsx.BACKUP_ORIGINAL_AUTH_FLOW`
   - In dev mode (`import.meta.env.DEV`):
     - **Landing page** - Disabled
     - **Login page** - Disabled
     - **Signup page** - Disabled
     - **Contact Us page** - Disabled
     - **Terms/Privacy/Cancellation** - Disabled
     - **Tutorial** - Disabled
   - Goes straight to the app dashboard after auto-login
   - Production mode still uses full auth flow

## How It Works

1. **App starts** → Auth provider loads
2. **No user found** → Auto-login attempts in dev mode
3. **Tries admin credentials** → `admin@sync2gear.com` / `admin123`
4. **Success** → User logged in, app shows dashboard
5. **All auth pages skipped** → Direct access to features

## Features

- ✅ **Automatic login** - No manual login required
- ✅ **Admin access** - Logged in as admin by default
- ✅ **Fast testing** - Skip all auth pages
- ✅ **Production safe** - Only works in dev mode
- ✅ **Original code preserved** - Can restore anytime

## Restoring Original Auth Flow

To restore the original authentication flow (landing page, login, etc.):

1. **Copy the backup file:**
   ```bash
   cp src/app/App.tsx.BACKUP_ORIGINAL_AUTH_FLOW src/app/App.tsx
   ```

2. **Or manually restore:**
   - Open `App.tsx.BACKUP_ORIGINAL_AUTH_FLOW`
   - Copy its contents to `App.tsx`
   - Remove the dev mode checks

3. **Remove auto-login from auth.tsx:**
   - Remove the `autoLoginAsAdmin` function
   - Remove the dev mode checks in `loadUser`

## Files Modified

- ✅ `src/lib/auth.tsx` - Added auto-login as admin in dev mode
- ✅ `src/app/App.tsx` - Bypassed all auth pages in dev mode
- ✅ `src/app/App.tsx.BACKUP_ORIGINAL_AUTH_FLOW` - Backup of original logic

## Dev Mode Detection

The app checks `import.meta.env.DEV` to determine if it's in development mode:
- **Dev mode:** Auto-login, bypasses auth pages
- **Production:** Normal authentication flow (when restored)

## Admin Credentials

Default admin credentials used for auto-login:
- **Email:** `admin@sync2gear.com`
- **Password:** `admin123` (tries this first, then `password123`, then `dev123`)

## Notes

- This only works in **development mode** (`npm run dev`)
- Production builds will use normal authentication (when restored)
- All original code is preserved in backup files
- Landing page, login, signup, and tutorial are temporarily disabled but can be restored

## Troubleshooting

**Not auto-logging in?**
- Check backend is running on port 8000
- Verify admin user exists: `admin@sync2gear.com` / `admin123`
- Check browser console for errors
- Try manual login first to verify credentials

**Want to test normal flow?**
- Restore `App.tsx` from backup
- Or set `import.meta.env.DEV = false` (not recommended)

---

**Last Updated:** Auto-login implementation  
**Status:** Active in development mode only
