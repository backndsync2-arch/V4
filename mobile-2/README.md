# Sync2Gear Mobile App v2

A completely new Flutter mobile app for Sync2Gear that works properly with music and announcement playback.

## Features

✅ **Working Audio Playback**
- Simple audio player using just_audio (no background handler issues)
- Music playback with proper error handling
- Announcement playback integration

✅ **Dashboard**
- Zone selection
- Music track selection
- Playback controls (Start, Pause, Resume)
- Real-time playback status

✅ **Announcements**
- **4 Creation Options:**
  1. **Writing** - Type announcement text manually
  2. **AI** - Generate announcements using AI with topic, tone, and key points
  3. **Record** - Record audio directly from device microphone
  4. **Upload** - Upload audio files from device storage

✅ **Music Management**
- Browse music files
- View music details

✅ **Authentication**
- Login with email and password
- Token-based authentication
- Auto-logout on token expiry

## Setup

1. Install dependencies:
```bash
flutter pub get
```

2. Run the app:
```bash
flutter run
```

## API Configuration

The app connects to:
- API Base: `https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1`

To change the API endpoint, edit `lib/api.dart` and update the `apiBase` constant.

## Permissions

The app requires:
- Internet (for API calls)
- Microphone (for recording announcements)
- Storage (for uploading audio files)

## Differences from Previous Version

1. **No Background Audio Handler** - Uses simple just_audio without background audio service to avoid initialization errors
2. **Simplified Architecture** - Clean separation of concerns with services and screens
3. **Proper Error Handling** - All API calls and audio operations have proper error handling
4. **All 4 Announcement Options** - Writing, AI, Record, and Upload all working
5. **Working Playback** - Music and announcements play correctly

## Troubleshooting

If you encounter issues:

1. **Audio not playing**: Check internet connection and verify API endpoint is accessible
2. **Recording not working**: Grant microphone permission when prompted
3. **Upload failing**: Check file size and format (supports common audio formats)
4. **Login issues**: Verify API endpoint and credentials

## Building for Production

```bash
flutter build apk --release
```

The APK will be generated in `build/app/outputs/flutter-apk/app-release.apk`

