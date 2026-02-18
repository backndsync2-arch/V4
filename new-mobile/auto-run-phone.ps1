# Auto-run script - Waits for device authorization then runs app automatically
$env:PATH += ";C:\Users\Bhavin\flutter\bin"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host "`n📱 AUTO-RUN ON PHONE" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Restart ADB to trigger authorization
Write-Host "`nRestarting ADB connection..." -ForegroundColor Yellow
adb kill-server 2>$null
Start-Sleep -Seconds 1
adb start-server 2>$null
Start-Sleep -Seconds 2

Write-Host "`n🔴 ACTION REQUIRED ON YOUR PHONE:" -ForegroundColor Red -BackgroundColor Yellow
Write-Host "1. Look at your phone screen RIGHT NOW" -ForegroundColor Yellow
Write-Host "2. You should see 'Allow USB debugging?' popup" -ForegroundColor Yellow  
Write-Host "3. CHECK ✓ 'Always allow from this computer'" -ForegroundColor Yellow
Write-Host "4. Tap 'ALLOW' or 'OK'" -ForegroundColor Yellow
Write-Host "`n⏳ Monitoring for authorization (will auto-start when authorized)..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to cancel`n" -ForegroundColor Gray

$checkCount = 0
$maxChecks = 300  # 10 minutes (2 seconds per check)

while ($checkCount -lt $maxChecks) {
    Start-Sleep -Seconds 2
    $checkCount++
    
    # Check device status
    $devices = flutter devices 2>&1
    $adbCheck = adb devices 2>&1
    
    # Check if device is authorized
    if (($devices -match "RZGYA0RG7SA" -and $devices -notmatch "not authorized") -or 
        ($adbCheck -match "RZGYA0RG7SA" -and $adbCheck -match "device$" -and $adbCheck -notmatch "unauthorized")) {
        
        Write-Host "`n✅✅✅ DEVICE AUTHORIZED! ✅✅✅" -ForegroundColor Green
        Write-Host "🚀 Starting app on your phone NOW..." -ForegroundColor Green
        Write-Host "`n" -NoNewline
        
        # Run on the specific device
        flutter run --release -d RZGYA0RG7SA
        exit
    }
    
    # Progress indicator every 10 seconds
    if ($checkCount % 5 -eq 0) {
        $seconds = $checkCount * 2
        Write-Host "Waiting... $seconds seconds - Still checking phone..." -ForegroundColor Gray
    }
}

Write-Host "`n❌ Timeout after 10 minutes" -ForegroundColor Red
Write-Host "Device was not authorized. Please:" -ForegroundColor Yellow
Write-Host "1. Check your phone and authorize USB debugging" -ForegroundColor White
Write-Host "2. Run this script again: .\auto-run-phone.ps1" -ForegroundColor Cyan

