# Flutter Helper Script for mobile-2
# Adds Flutter to PATH and runs commands

# Ensure we're in the correct directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

$env:PATH += ";C:\Users\Bhavin\flutter\bin"

if ($args.Count -eq 0) {
    Write-Host "Usage: .\run-flutter.ps1 <command>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Cyan
    Write-Host "  .\run-flutter.ps1 pub-get        # Install dependencies"
    Write-Host "  .\run-flutter.ps1 devices         # List devices"
    Write-Host "  .\run-flutter.ps1 run            # Run on connected device"
    Write-Host "  .\run-flutter.ps1 run-chrome      # Run on Chrome (PWA)"
    Write-Host "  .\run-flutter.ps1 run-windows     # Run on Windows"
    Write-Host "  .\run-flutter.ps1 build-apk       # Build APK"
    Write-Host "  .\run-flutter.ps1 doctor          # Check Flutter setup"
    exit
}

$command = $args[0]

switch ($command) {
    "pub-get" {
        Write-Host "Installing dependencies..." -ForegroundColor Green
        flutter pub get
    }
    "devices" {
        flutter devices
    }
    "run" {
        Write-Host "Starting app on connected device..." -ForegroundColor Green
        Write-Host "Make sure your device is authorized!" -ForegroundColor Yellow
        flutter run
    }
    "run-chrome" {
        Write-Host "Starting app on Chrome (PWA mode)..." -ForegroundColor Green
        flutter run -d chrome
    }
    "run-windows" {
        Write-Host "Starting app on Windows..." -ForegroundColor Green
        flutter run -d windows
    }
    "build-apk" {
        Write-Host "Building APK..." -ForegroundColor Green
        flutter build apk
        Write-Host "`nAPK location: build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Cyan
    }
    "doctor" {
        flutter doctor
    }
    default {
        # Pass through to flutter command
        flutter $args
    }
}

