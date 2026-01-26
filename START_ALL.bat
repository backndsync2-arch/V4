@echo off
echo ==========================================
echo   STARTING SYNC2GEAR SERVERS
echo ==========================================
echo.

cd /d "c:\Users\dolab\Downloads\V2 Sync2gear"

echo Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd /d c:\Users\dolab\Downloads\V2 Sync2gear && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Backend Server (Port 8000)...
start "Backend Server" cmd /k "cd /d c:\Users\dolab\Downloads\V2 Sync2gear\sync2gear_backend && python manage.py runserver"

echo.
echo ==========================================
echo   SERVERS STARTING
echo ==========================================
echo.
echo Wait 10-15 seconds for servers to start...
echo.
echo Frontend: http://localhost:5173/
echo Backend:  http://localhost:8000/
echo.
echo Press any key to close this window...
pause >nul
