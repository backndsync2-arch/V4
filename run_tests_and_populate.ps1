# Run Tests and Populate Dummy Data
# This script populates the database with dummy data and runs tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  POPULATE DUMMY DATA & RUN TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login/" -Method POST -Body '{"email":"admin@sync2gear.com","password":"admin123"}' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is not running!" -ForegroundColor Red
    Write-Host "   Please start backend: cd sync2gear_backend && python manage.py runserver" -ForegroundColor Yellow
    exit 1
}

# Check if Python is available
Write-Host ""
Write-Host "2. Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   ✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Python not found!" -ForegroundColor Red
    exit 1
}

# Check if requests library is installed
Write-Host ""
Write-Host "3. Checking dependencies..." -ForegroundColor Yellow
try {
    python -c "import requests; import django" 2>&1 | Out-Null
    Write-Host "   ✅ Required libraries found" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Installing required libraries..." -ForegroundColor Yellow
    pip install requests django
}

# Run populate script
Write-Host ""
Write-Host "4. Populating dummy data..." -ForegroundColor Yellow
Write-Host "   This will create:" -ForegroundColor White
Write-Host "   - Music folders" -ForegroundColor White
Write-Host "   - Music files" -ForegroundColor White
Write-Host "   - Announcements" -ForegroundColor White
Write-Host "   - Zones" -ForegroundColor White
Write-Host "   - Devices" -ForegroundColor White
Write-Host ""

python populate_dummy_data.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Dummy data populated successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  Some errors occurred. Check output above." -ForegroundColor Yellow
}

# Open test page
Write-Host ""
Write-Host "5. Opening test page..." -ForegroundColor Yellow
Start-Process "test_application_flow.html"

Write-Host ""
Write-Host "6. Opening application..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TESTING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Application should auto-login as admin" -ForegroundColor White
Write-Host "2. Navigate through all pages:" -ForegroundColor White
Write-Host "   - Dashboard" -ForegroundColor Gray
Write-Host "   - Music Library (should show folders and files)" -ForegroundColor Gray
Write-Host "   - Announcements (should show TTS announcements)" -ForegroundColor Gray
Write-Host "   - Zones (should show created zones)" -ForegroundColor Gray
Write-Host "   - All other pages" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test file playback:" -ForegroundColor White
Write-Host "   - Go to Music Library" -ForegroundColor Gray
Write-Host "   - Click play on a music file" -ForegroundColor Gray
Write-Host "   - Verify audio plays" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Use test_application_flow.html for automated tests" -ForegroundColor White
Write-Host ""
