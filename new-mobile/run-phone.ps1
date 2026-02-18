# Simple working script to run Flutter app on phone
$env:PATH += ";C:\Users\Bhavin\flutter\bin"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host ""
Write-Host "Running App on Phone" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Cyan

# Restart ADB to trigger authorization dialog
Write-Host ""
Write-Host "Restarting ADB connection..." -ForegroundColor Yellow
adb kill-server 2>$null
Start-Sleep -Seconds 1
adb start-server 2>$null
Start-Sleep -Seconds 2

# Check device
Write-Host ""
Write-Host "Checking device..." -ForegroundColor Yellow
$devices = flutter devices 2>&1
$adbDevices = adb devices 2>&1

Write-Host $devices

# Check authorization status
$isAuthorized = $false
if ($adbDevices -match "RZGYA0RG7SA" -and $adbDevices -match "device$" -and $adbDevices -notmatch "unauthorized") {
    $isAuthorized = $true
} elseif ($devices -match "RZGYA0RG7SA" -and $devices -notmatch "not authorized" -and $devices -notmatch "unauthorized") {
    $isAuthorized = $true
}

if ($isAuthorized) {
    Write-Host ""
    Write-Host "Device authorized! Starting app..." -ForegroundColor Green
    flutter run --release
} else {
    Write-Host ""
    Write-Host "URGENT: Check your phone screen NOW!" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host ""
    Write-Host "You should see 'Allow USB debugging?' popup" -ForegroundColor Yellow
    Write-Host "1. Check 'Always allow from this computer'" -ForegroundColor White
    Write-Host "2. Tap 'ALLOW'" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run: .\run-phone.ps1" -ForegroundColor Cyan
}

