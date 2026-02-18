# Quick APK rebuild and deploy script
Write-Host "`n🚀 Quick APK Rebuild & Deploy" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

# Check if Flutter is available
$flutterPath = "C:\Users\Bhavin\flutter\bin\flutter.bat"
if (!(Test-Path $flutterPath)) {
    Write-Host "❌ Flutter not found at $flutterPath" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Building APK with S3 upload fixes..." -ForegroundColor Yellow

# Try to build quickly (skip clean to save time)
try {
    & $flutterPath build apk --release --no-tree-shake-icons
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ APK built successfully!" -ForegroundColor Green
        
        # Uninstall old APK
        Write-Host "`n🗑️ Uninstalling old APK..." -ForegroundColor Yellow
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.sync2gear.mobile
        
        # Install new APK
        Write-Host "`n📱 Installing new APK..." -ForegroundColor Yellow
        & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install "build\app\outputs\flutter-apk\app-release.apk"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ APK installed successfully!" -ForegroundColor Green
            
            # Launch app
            Write-Host "`n🚀 Launching app..." -ForegroundColor Yellow
            & "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.sync2gear.mobile -c android.intent.category.LAUNCHER 1
            
            Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
            Write-Host "   Your mobile app now uses S3 upload flow" -ForegroundColor White
            Write-Host "   Upload should work without 'Upload failed' errors" -ForegroundColor White
            
        } else {
            Write-Host "❌ APK installation failed" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ APK build failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during build/deploy: $($_.Exception.Message)" -ForegroundColor Red
}