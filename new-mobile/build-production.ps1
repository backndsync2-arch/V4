# Production APK build script for Windows
Write-Host "`n🏭 Building Production APK with S3-Only Storage..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

# Set Flutter path
$flutterPath = "C:\Users\Bhavin\flutter\bin\flutter.bat"
if (!(Test-Path $flutterPath)) {
    Write-Host "❌ Flutter not found at $flutterPath" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host "`n🧹 Cleaning previous builds..." -ForegroundColor Yellow
& $flutterPath clean

# Get dependencies
Write-Host "`n📦 Getting dependencies..." -ForegroundColor Yellow
& $flutterPath pub get

# Build production APK
Write-Host "`n🔨 Building production APK..." -ForegroundColor Yellow
& $flutterPath build apk --release --dart-define=PRODUCTION=true

# Check if build was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Production APK built successfully!" -ForegroundColor Green
    Write-Host "📱 APK location: build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🚀 Features in this build:" -ForegroundColor Cyan
    Write-Host "   ✅ S3-only file storage (no local dependencies)" -ForegroundColor White
    Write-Host "   ✅ Multi-device compatible" -ForegroundColor White
    Write-Host "   ✅ Production-ready architecture" -ForegroundColor White
    Write-Host "   ✅ Presigned URL support for secure file access" -ForegroundColor White
    
    # Copy the APK to the current directory with a clear name
    $sourceApk = "build\app\outputs\flutter-apk\app-release.apk"
    $destApk = "sync2gear-production.apk"
    
    if (Test-Path $sourceApk) {
        Copy-Item $sourceApk $destApk -Force
        Write-Host "`n📲 Production APK ready: $destApk" -ForegroundColor Green
    }
} else {
    Write-Host "`n❌ Build failed! Check the error messages above." -ForegroundColor Red
    exit 1
}