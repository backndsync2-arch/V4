# Quick Start Guide - Sync2Gear Mobile v2

## What's Fixed

✅ **Audio Playback** - No more "lateinitializor _audiohandler" errors
✅ **Music Playback** - Works properly with error handling
✅ **Announcements** - All 4 creation options available and working:
   - Writing (manual text entry)
   - AI (generate with topic/tone)
   - Record (microphone recording)
   - Upload (file upload)

## How to Run

1. Navigate to the mobile-2 folder:
```bash
cd mobile-2
```

2. Get dependencies:
```bash
flutter pub get
```

3. Run on connected device:
```bash
flutter run
```

## Key Features

### Dashboard
- Select zone
- Select music tracks (checkboxes)
- Start/Pause/Resume playback
- View playback status

### Announcements
- Tap the "+" button to see 4 creation options
- Each option works independently
- AI generation supports multiple tones and quantities
- Recording requires microphone permission

### Music
- Browse all music files
- View details

## Login Credentials

Use the same credentials as the web app:
- Admin: `admin@sync2gear.com` / `Admin@Sync2Gear2025!`
- Staff: `staff@sync2gear.com` / `Staff@Sync2Gear2025!`
- Client: `client@example.com` / `Client@Example2025!`

## Architecture

- **lib/api.dart** - All API calls
- **lib/services/audio_service.dart** - Simple audio player (no background handler)
- **lib/screens/** - All UI screens
- Clean separation, no complex state management

## Differences from Old Version

1. **No Background Audio Handler** - Removed to fix initialization errors
2. **Simpler Audio Service** - Direct just_audio usage
3. **Better Error Handling** - All operations have try-catch
4. **Complete Announcement Features** - All 4 options implemented

