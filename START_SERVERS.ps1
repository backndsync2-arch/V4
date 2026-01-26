# Start Both Frontend and Backend Servers
# Run this script to start everything

Write-Host "=== STARTING SYNC2GEAR SERVERS ===" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "1. Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js NOT FOUND" -ForegroundColor Red
    Write-Host "      Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Python is installed
Write-Host "2. Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Python NOT FOUND (Backend may not start)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "3. Starting Frontend Server (Port 5173)..." -ForegroundColor Yellow
Write-Host "   Command: npm run dev" -ForegroundColor Gray
Write-Host "   URL: http://localhost:5173/" -ForegroundColor Gray
Write-Host ""

# Start frontend in new window
$frontendPath = "c:\Users\dolab\Downloads\V2 Sync2gear"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Starting Frontend Server...' -ForegroundColor Green; npm run dev"

Write-Host "   ✅ Frontend server starting in new window" -ForegroundColor Green
Write-Host ""

Write-Host "4. Starting Backend Server (Port 8000)..." -ForegroundColor Yellow
Write-Host "   Command: python manage.py runserver" -ForegroundColor Gray
Write-Host "   URL: http://localhost:8000/" -ForegroundColor Gray
Write-Host ""

# Start backend in new window
$backendPath = "c:\Users\dolab\Downloads\V2 Sync2gear\sync2gear_backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Starting Backend Server...' -ForegroundColor Green; python manage.py runserver"

Write-Host "   ✅ Backend server starting in new window" -ForegroundColor Green
Write-Host ""

Write-Host "=== SERVERS STARTING ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ Wait 10-15 seconds for servers to start..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:5173/" -ForegroundColor White
Write-Host "🌐 Backend:  http://localhost:8000/" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login Credentials:" -ForegroundColor Yellow
Write-Host "   Admin:  admin@sync2gear.com / admin123" -ForegroundColor White
Write-Host "   Client: client1@example.com / client123" -ForegroundColor White
Write-Host ""
Write-Host "📋 Test User Creation:" -ForegroundColor Yellow
Write-Host "   1. Login as admin" -ForegroundColor White
Write-Host "   2. Go to Users page" -ForegroundColor White
Write-Host "   3. Click 'Add User'" -ForegroundColor White
Write-Host ""
