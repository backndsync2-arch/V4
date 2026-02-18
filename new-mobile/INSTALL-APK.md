# How to Install APK on Your Phone

## Method 1: USB Transfer (Easiest)

1. **Connect your phone to computer via USB**
2. **Enable File Transfer mode on phone** (when USB notification appears, tap it and select "File Transfer" or "MTP")
3. **Copy APK to phone:**
   - Open File Explorer on your computer
   - Navigate to: `C:\Users\Bhavin\OneDrive\Desktop\Music-Shervin\V4\new-mobile\build\app\outputs\flutter-apk\`
   - Copy `app-release.apk` file
   - Paste it to your phone's Downloads folder or any folder you can access

4. **On your phone:**
   - Open File Manager app
   - Navigate to Downloads folder
   - Tap on `app-release.apk`
   - If prompted, allow "Install from Unknown Sources"
   - Tap "Install"
   - Tap "Open" when done

## Method 2: Using ADB (If USB debugging is enabled)

```powershell
# Make sure phone is connected and authorized
adb devices

# Install directly
adb install build\app\outputs\flutter-apk\app-release.apk
```

## Method 3: Cloud Transfer (Google Drive, etc.)

1. Upload `app-release.apk` to Google Drive/Dropbox
2. Open the link on your phone
3. Download the APK
4. Install it (allow "Unknown Sources" if prompted)

## Method 4: Email/WhatsApp to Yourself

1. Email the APK to yourself or send via WhatsApp
2. Open on phone and download
3. Install

## Quick PowerShell Command

```powershell
# Copy APK to phone (if connected via USB)
adb push build\app\outputs\flutter-apk\app-release.apk /sdcard/Download/
```

Then on phone: Open File Manager → Downloads → Install

