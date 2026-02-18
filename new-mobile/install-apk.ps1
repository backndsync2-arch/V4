# Script to install and run APK on connected Android device
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host "`n📱 INSTALLING APK ON YOUR PHONE" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Check if device is connected
Write-Host "`nChecking device connection..." -ForegroundColor Yellow
$devices = adb devices

if ($devices -match "device$") {
    Write-Host "✅ Android device detected!" -ForegroundColor Green
    
    # Install the APK
    Write-Host "`n📦 Installing sync2gear-release.apk..." -ForegroundColor Yellow
    $installResult = adb install -r sync2gear-release.apk
    
    if ($installResult -match "Success") {
        Write-Host "✅ APK installed successfully!" -ForegroundColor Green
        
        # Launch the app
        Write-Host "`n🚀 Launching app..." -ForegroundColor Yellow
        adb shell monkey -p com.example.sync2gear -c android.intent.category.LAUNCHER 1
        Write-Host "✅ App launched!" -ForegroundColor Green
    } else {
        Write-Host "❌ Installation failed: $installResult" -ForegroundColor Red
    }
} else {
    Write-Host "❌ No Android device found!" -ForegroundColor Red
    Write-Host "`nPlease ensure:" -ForegroundColor Yellow
    Write-Host "1. Your Android phone is connected via USB" -ForegroundColor White
    Write-Host "2. USB debugging is enabled on your phone" -ForegroundColor White
    Write-Host "3. You have authorized this computer for USB debugging" -ForegroundColor White
}