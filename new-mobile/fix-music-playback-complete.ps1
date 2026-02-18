# Comprehensive fix for music playback issues
Write-Host "`n🎵 COMPREHENSIVE MUSIC PLAYBACK FIX" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# 1. Check current music files in backend uploads
Write-Host "`n📁 Checking backend music files..." -ForegroundColor Yellow
$backendMusicDir = "..\new-backend\uploads\music"

if (Test-Path $backendMusicDir) {
    $musicFiles = Get-ChildItem $backendMusicDir -Filter "*.mp3" -ErrorAction SilentlyContinue
    Write-Host "Found $($musicFiles.Count) music files in backend:" -ForegroundColor Green
    $musicFiles | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
} else {
    Write-Host "Backend music directory not found" -ForegroundColor Red
}

# 2. Test API endpoint accessibility
Write-Host "`n🌐 Testing API endpoints..." -ForegroundColor Yellow
$apiBase = "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1"

try {
    $response = Invoke-WebRequest -Uri "$apiBase/music/files/" -Method GET -UseBasicParsing
    Write-Host "✅ API endpoint is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ API endpoint issue: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Check mobile app configuration
Write-Host "`n📱 Checking mobile app configuration..." -ForegroundColor Yellow
$apiFile = "lib\api.dart"
if (Test-Path $apiFile) {
    $apiContent = Get-Content $apiFile -Raw
    if ($apiContent -match "const apiBase = '(.*?)'") {
        Write-Host "✅ Mobile API base: $($matches[1])" -ForegroundColor Green
    } else {
        Write-Host "❌ Could not find API base URL in mobile app" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Mobile API file not found" -ForegroundColor Red
}

# 4. Provide solution
Write-Host "`n🔧 SOLUTION STEPS:" -ForegroundColor Cyan
Write-Host "=" * 30 -ForegroundColor Cyan

Write-Host "`n📤 STEP 1: Re-upload music files through web interface" -ForegroundColor Yellow
Write-Host "   1. Open: https://02nn8drgsd.execute-api.us-east-1.amazonaws.com" -ForegroundColor White
Write-Host "   2. Login with your credentials" -ForegroundColor White
Write-Host "   3. Go to 'Music Library'" -ForegroundColor White
Write-Host "   4. Click 'Upload Music' button" -ForegroundColor White
Write-Host "   5. Select and upload your music files" -ForegroundColor White
Write-Host "   6. Files will be stored in S3 and accessible from mobile" -ForegroundColor White

Write-Host "`n🔄 STEP 2: Alternative - Direct API upload" -ForegroundColor Yellow
Write-Host "   Use the presigned URL upload feature in the web interface" -ForegroundColor White
Write-Host "   This bypasses the 10MB API Gateway limit" -ForegroundColor White

Write-Host "`n✅ STEP 3: Test on mobile" -ForegroundColor Yellow
Write-Host "   1. Restart the mobile app" -ForegroundColor White
Write-Host "   2. Navigate to Music Library" -ForegroundColor White
Write-Host "   3. Try playing the newly uploaded files" -ForegroundColor White

Write-Host "`n💡 WHY THIS HAPPENS:" -ForegroundColor Cyan
Write-Host "   - Local files (uploads/music/) are only accessible on your machine" -ForegroundColor Gray
Write-Host "   - AWS Lambda runs in the cloud and can't access your local files" -ForegroundColor Gray
Write-Host "   - Files uploaded through the API are automatically stored in S3" -ForegroundColor Gray
Write-Host "   - S3 files are accessible from anywhere (mobile, web, etc.)" -ForegroundColor Gray

Write-Host "`n🎯 RESULT: After re-uploading, music will play on your mobile device!" -ForegroundColor Green