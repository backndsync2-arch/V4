# Mobile App Testing Guide

## ✅ Setup Complete!

Flutter is configured and ready to use.

## Quick Test Commands

### Test in Chrome (PWA) - FASTEST
```powershell
.\run-flutter.ps1 run-chrome
```

### Test on Physical Device
1. Authorize device: Check your Android phone for "Allow USB debugging?" popup → Tap "Allow"
2. Run:
```powershell
.\run-flutter.ps1 run-device
```

### Build APK for Manual Installation
```powershell
.\run-flutter.ps1 build-apk
```
APK will be at: `build\app\outputs\flutter-apk\app-release.apk`

## Current Status

- ✅ Flutter installed: `C:\Users\Bhavin\flutter`
- ✅ Dependencies installed
- ✅ Chrome test: Starting automatically
- ✅ APK build: In progress
- ⚠️ Device: Connected but needs authorization (check phone screen)

## Helper Script

Use `.\run-flutter.ps1 <command>` for easy testing:
- `devices` - List available devices
- `run-chrome` - Test in Chrome (PWA)
- `run-windows` - Test on Windows desktop
- `run-device` - Test on connected Android device
- `build-apk` - Build APK file
- `doctor` - Check Flutter setup

## Notes

- Chrome app should open automatically
- APK build takes 2-5 minutes
- For device testing, authorize USB debugging on your phone first

