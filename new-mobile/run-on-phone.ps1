# Script to run Flutter app on connected Android phone
$env:PATH += ";C:\Users\Bhavin\flutter\bin"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host "`n📱 RUNNING APP ON YOUR PHONE" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Check current device status
Write-Host "`nChecking device status..." -ForegroundColor Yellow
$devices = flutter devices 2>&1

if ($devices -match "RZGYA0RG7SA" -and $devices -notmatch "not authorized") {
    Write-Host "✅ Device is authorized!" -ForegroundColor Green
    Write-Host "`n🚀 Starting app on your phone..." -ForegroundColor Green
    flutter run --release
} else {
    Write-Host "`n⚠️ Device needs authorization!" -ForegroundColor Yellow
    Write-Host "`n📋 INSTRUCTIONS:" -ForegroundColor Cyan
    Write-Host "1. Look at your Android phone screen" -ForegroundColor White
    Write-Host "2. Find the 'Allow USB debugging?' popup" -ForegroundColor White
    Write-Host "3. CHECK ✓ 'Always allow from this computer'" -ForegroundColor White
    Write-Host "4. Tap 'ALLOW' or 'OK'" -ForegroundColor White
    Write-Host "`n⏳ Waiting for authorization (checking every 2 seconds)..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to cancel`n" -ForegroundColor Gray
    
    $maxWait = 120  # 2 minutes
    $elapsed = 0
    
    while ($elapsed -lt $maxWait) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        
        $check = flutter devices 2>&1
        if ($check -match "RZGYA0RG7SA" -and $check -notmatch "not authorized") {
            Write-Host "`n✅ DEVICE AUTHORIZED! Starting app..." -ForegroundColor Green
            flutter run --release
            exit
        }
        
        if ($elapsed % 10 -eq 0) {
            Write-Host "Still waiting... ($elapsed seconds)" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n❌ Timeout: Device not authorized after 2 minutes" -ForegroundColor Red
    Write-Host "Please authorize on your phone and run this script again" -ForegroundColor Yellow
}

