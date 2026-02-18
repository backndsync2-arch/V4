# Quick APK Build & Deploy to Physical Device
Write-Host "`n📱 Quick APK Build for Your Phone" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# Set Flutter path
$flutterPath = "C:\Users\Bhavin\flutter\bin\flutter.bat"
if (!(Test-Path $flutterPath)) {
    Write-Host "❌ Flutter not found at $flutterPath" -ForegroundColor Red
    Write-Host "   Please install Flutter or update the path" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔨 Building APK..." -ForegroundColor Yellow

# Build APK (skip clean to save time)
& $flutterPath build apk --release --no-tree-shake-icons

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ APK built successfully!" -ForegroundColor Green
    
    # Copy APK to current directory with clear name
    $sourceApk = "build\app\outputs\flutter-apk\app-release.apk"
    $destApk = "sync2gear-s3-fixed.apk"
    
    if (Test-Path $sourceApk) {
        Copy-Item $sourceApk $destApk -Force
        Write-Host "📲 APK ready: $destApk" -ForegroundColor Green
        
        Write-Host "`n🎯 TO INSTALL ON YOUR PHONE:" -ForegroundColor Cyan
        Write-Host "1. Enable USB Debugging on your phone" -ForegroundColor White
        Write-Host "2. Connect phone via USB" -ForegroundColor White
        Write-Host "3. Run: adb install $destApk" -ForegroundColor White
        Write-Host "   OR" -ForegroundColor Yellow
        Write-Host "   Drag and drop the APK file to your phone" -ForegroundColor White
        
        Write-Host "`n✅ WHAT'S FIXED:" -ForegroundColor Green
        Write-Host "   • S3 upload instead of local storage" -ForegroundColor Gray
        Write-Host "   • Multi-device compatibility" -ForegroundColor Gray
        Write-Host "   • Upload failures resolved" -ForegroundColor Gray
        Write-Host "   • Production-ready architecture" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ APK file not found after build" -ForegroundColor Red
    }
} else {
    Write-Host "❌ APK build failed" -ForegroundColor Red
    Write-Host "   Check Flutter installation and dependencies" -ForegroundColor Yellow
}