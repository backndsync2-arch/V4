# Quick Navigation Test Script
# Run this to verify all systems are working

Write-Host "=== SYNC2GEAR NAVIGATION TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Frontend Server
Write-Host "1. Testing Frontend Server (port 5174)..." -ForegroundColor Yellow
try {
    $frontend = Test-NetConnection -ComputerName localhost -Port 5174 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($frontend) {
        Write-Host "   ✅ Frontend server is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Frontend server is NOT running" -ForegroundColor Red
        Write-Host "   Start with: npm run dev" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Frontend server is NOT running" -ForegroundColor Red
}

# Test 2: Check Backend Server
Write-Host "2. Testing Backend Server (port 8000)..." -ForegroundColor Yellow
try {
    $backend = Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($backend) {
        Write-Host "   ✅ Backend server is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend server is NOT running" -ForegroundColor Red
        Write-Host "   Start with: cd sync2gear_backend; python manage.py runserver" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Backend server is NOT running" -ForegroundColor Red
}

# Test 3: Test API Endpoint
Write-Host "3. Testing API Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API is responding" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  API returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ API is NOT responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check Build
Write-Host "4. Checking if build is successful..." -ForegroundColor Yellow
Set-Location "C:\Users\dolab\Downloads\V2 Sync2gear"
$buildOutput = npm run build 2>&1 | Out-String
if ($buildOutput -match "error|Error|failed|Failed") {
    Write-Host "   ❌ Build has errors" -ForegroundColor Red
    Write-Host "   Check build output above" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Build successful" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:5174 in your browser" -ForegroundColor White
Write-Host "2. Open Developer Console (F12)" -ForegroundColor White
Write-Host "3. Click on 'Music Library' in the sidebar" -ForegroundColor White
Write-Host "4. Check console for navigation logs" -ForegroundColor White
Write-Host "5. Verify the page loads (not blank)" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors, check:" -ForegroundColor Yellow
Write-Host "- Browser console (F12 → Console tab)" -ForegroundColor White
Write-Host "- Network tab for failed API requests" -ForegroundColor White
Write-Host "- test_navigation.html for detailed diagnostics" -ForegroundColor White
