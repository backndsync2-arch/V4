# Simple script to run Flutter app on phone
$env:PATH += ";C:\Users\Bhavin\flutter\bin"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host "`n📱 Running App on Phone" -ForegroundColor Green
Write-Host "=" * 40 -ForegroundColor Cyan

# Check device
Write-Host "`nChecking device..." -ForegroundColor Yellow
$devices = flutter devices 2>&1

if ($devices -match "RZGYA0RG7SA" -and $devices -notmatch "not authorized") {
    Write-Host "✅ Device authorized! Starting app..." -ForegroundColor Green
    flutter run --release -d RZGYA0RG7SA
} else {
    Write-Host "`n❌ Device not ready!" -ForegroundColor Red
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "1. Check your phone for 'Allow USB debugging?' popup" -ForegroundColor White
    Write-Host "2. Check 'Always allow from this computer'" -ForegroundColor White
    Write-Host "3. Tap 'ALLOW'" -ForegroundColor White
    Write-Host "`nThen run this script again: .\run-phone-simple.ps1" -ForegroundColor Cyan
}

