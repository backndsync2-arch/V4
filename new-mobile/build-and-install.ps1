# Build APK with S3 fixes - ONE COMMAND
Write-Host "`n🔨 Building APK with S3 Upload Fixes..." -ForegroundColor Green

# Check if Flutter is available
$flutterPath = "C:\Users\Bhavin\flutter\bin\flutter.bat"
if (Test-Path $flutterPath) {
    Write-Host "✅ Flutter found" -ForegroundColor Green
    
    # Try to build (this may take a few minutes)
    Write-Host "`n⏳ Building APK... (this takes 2-3 minutes)" -ForegroundColor Yellow
    & $flutterPath build apk --release --no-tree-shake-icons
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ APK built successfully!" -ForegroundColor Green
        
        # Copy to easy-to-find location
        Copy-Item "build\app\outputs\flutter-apk\app-release.apk" "sync2gear-s3-fixed.apk" -Force
        Write-Host "📲 APK ready: sync2gear-s3-fixed.apk" -ForegroundColor Green
        
        Write-Host "`n🎯 TO INSTALL:" -ForegroundColor Cyan
        Write-Host "1. Connect phone via USB" -ForegroundColor White
        Write-Host "2. Enable USB Debugging" -ForegroundColor White
        Write-Host "3. Run: adb install sync2gear-s3-fixed.apk" -ForegroundColor White
        
    } else {
        Write-Host "❌ Build failed" -ForegroundColor Red
        Write-Host "   Try: flutter pub get" -ForegroundColor Yellow
        Write-Host "   Then: flutter build apk --release" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Flutter not found" -ForegroundColor Red
    Write-Host "   Install Flutter or check path" -ForegroundColor Yellow
}