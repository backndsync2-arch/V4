# Simple script - Run this after authorizing your phone
$env:PATH += ";C:\Users\Bhavin\flutter\bin"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path "$androidSdk\platform-tools\adb.exe") {
    $env:PATH += ";$androidSdk\platform-tools"
}

Write-Host ""
Write-Host "Starting app on phone..." -ForegroundColor Green

# Restart ADB
adb kill-server 2>$null
Start-Sleep -Seconds 1
adb start-server 2>$null
Start-Sleep -Seconds 2

# Check if authorized
$adbCheck = adb devices 2>&1
if ($adbCheck -match "RZGYA0RG7SA.*device$" -and $adbCheck -notmatch "unauthorized") {
    Write-Host "Device authorized! Starting app..." -ForegroundColor Green
    flutter run --release
} else {
    Write-Host ""
    Write-Host "PHONE ACTION REQUIRED:" -ForegroundColor Red -BackgroundColor Yellow
    Write-Host "1. Check your phone screen" -ForegroundColor Yellow
    Write-Host "2. Tap ALLOW on USB debugging popup" -ForegroundColor Yellow
    Write-Host "3. Check 'Always allow from this computer'" -ForegroundColor Yellow
    Write-Host "4. Run this script again: .\START-APP.ps1" -ForegroundColor Cyan
}

