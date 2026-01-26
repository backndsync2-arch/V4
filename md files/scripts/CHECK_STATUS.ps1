# Quick Status Check Script
Write-Host "=== SYSTEM STATUS CHECK ===" -ForegroundColor Cyan
Write-Host ""

# Check Frontend
Write-Host "Frontend (Port 5173):" -ForegroundColor Yellow -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host " ✅ RUNNING" -ForegroundColor Green
} catch {
    Write-Host " ❌ NOT RUNNING" -ForegroundColor Red
}

# Check Backend
Write-Host "Backend (Port 8000):" -ForegroundColor Yellow -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health/" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host " ✅ RUNNING" -ForegroundColor Green
} catch {
    Write-Host " ❌ NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "To start servers, run: START_ALL.bat" -ForegroundColor Cyan
