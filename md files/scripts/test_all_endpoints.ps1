# Complete API Endpoint Test Script
# Tests all major endpoints after authentication

$base = 'http://localhost:8000'
$ErrorActionPreference = 'Continue'

Write-Host "=== sync2gear API - Complete Endpoint Test ===" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. ROOT & DOCUMENTATION
# ============================================================================
Write-Host "1. ROOT & DOCUMENTATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "  Testing: GET /" -ForegroundColor White
    $root = Invoke-RestMethod -Uri "$base/" -Method Get -TimeoutSec 5
    Write-Host "  ✅ Root endpoint: OK" -ForegroundColor Green
    Write-Host "     API Name: $($root.name)" -ForegroundColor Gray
    Write-Host "     Version: $($root.version)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Root endpoint: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/health/" -ForegroundColor White
    $health = Invoke-RestMethod -Uri "$base/api/health/" -Method Get -TimeoutSec 5
    Write-Host "  ✅ Health check: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Health check: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 2. AUTHENTICATION
# ============================================================================
Write-Host "2. AUTHENTICATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

$token = $null
$headers = @{}

try {
    Write-Host "  Testing: POST /api/v1/auth/login/" -ForegroundColor White
    $loginBody = @{
        email = 'admin@sync2gear.com'
        password = 'admin123'
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/login/" `
        -ContentType 'application/json' -Body $loginBody -TimeoutSec 5
    $token = $login.access
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "  ✅ Login: SUCCESS" -ForegroundColor Green
    Write-Host "     User: $($login.user.email) ($($login.user.role))" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Login: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "     Cannot continue without authentication" -ForegroundColor Yellow
    exit 1
}

try {
    Write-Host "  Testing: GET /api/v1/auth/me/" -ForegroundColor White
    $me = Invoke-RestMethod -Uri "$base/api/v1/auth/me/" -Headers $headers -TimeoutSec 5
    Write-Host "  ✅ Current user: OK" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Current user: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 3. MUSIC ENDPOINTS
# ============================================================================
Write-Host "3. MUSIC ENDPOINTS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "  Testing: GET /api/v1/music/folders/" -ForegroundColor White
    $folders = Invoke-RestMethod -Uri "$base/api/v1/music/folders/" -Headers $headers -TimeoutSec 5
    $folderCount = if ($folders -is [array]) { $folders.Count } else { ($folders.results | Measure-Object).Count }
    Write-Host "  ✅ Folders: $folderCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Folders: FAILED" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/music/files/" -ForegroundColor White
    $files = Invoke-RestMethod -Uri "$base/api/v1/music/files/" -Headers $headers -TimeoutSec 5
    $fileCount = if ($files -is [array]) { $files.Count } else { ($files.results | Measure-Object).Count }
    Write-Host "  ✅ Music files: $fileCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Music files: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 4. ANNOUNCEMENTS
# ============================================================================
Write-Host "4. ANNOUNCEMENTS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "  Testing: GET /api/v1/announcements/" -ForegroundColor White
    $announcements = Invoke-RestMethod -Uri "$base/api/v1/announcements/" -Headers $headers -TimeoutSec 5
    $annCount = if ($announcements -is [array]) { $announcements.Count } else { ($announcements.results | Measure-Object).Count }
    Write-Host "  ✅ Announcements: $annCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Announcements: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 5. ZONES & DEVICES
# ============================================================================
Write-Host "5. ZONES & DEVICES" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "  Testing: GET /api/v1/zones/floors/" -ForegroundColor White
    $floors = Invoke-RestMethod -Uri "$base/api/v1/zones/floors/" -Headers $headers -TimeoutSec 5
    $floorCount = if ($floors -is [array]) { $floors.Count } else { ($floors.results | Measure-Object).Count }
    Write-Host "  ✅ Floors: $floorCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Floors: FAILED" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/zones/zones/" -ForegroundColor White
    $zones = Invoke-RestMethod -Uri "$base/api/v1/zones/zones/" -Headers $headers -TimeoutSec 5
    $zoneCount = if ($zones -is [array]) { $zones.Count } else { ($zones.results | Measure-Object).Count }
    Write-Host "  ✅ Zones: $zoneCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Zones: FAILED" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/devices/devices/" -ForegroundColor White
    $devices = Invoke-RestMethod -Uri "$base/api/v1/devices/devices/" -Headers $headers -TimeoutSec 5
    $deviceCount = if ($devices -is [array]) { $devices.Count } else { ($devices.results | Measure-Object).Count }
    Write-Host "  ✅ Devices: $deviceCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Devices: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# 6. ADMIN ENDPOINTS (Admin Only)
# ============================================================================
Write-Host "6. ADMIN ENDPOINTS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

try {
    Write-Host "  Testing: GET /api/v1/admin/clients/" -ForegroundColor White
    $clients = Invoke-RestMethod -Uri "$base/api/v1/admin/clients/" -Headers $headers -TimeoutSec 5
    $clientCount = if ($clients -is [array]) { $clients.Count } else { ($clients.results | Measure-Object).Count }
    Write-Host "  ✅ Clients: $clientCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Clients: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/admin/users/" -ForegroundColor White
    $users = Invoke-RestMethod -Uri "$base/api/v1/admin/users/" -Headers $headers -TimeoutSec 5
    $userCount = if ($users -is [array]) { $users.Count } else { ($users.results | Measure-Object).Count }
    Write-Host "  ✅ Users: $userCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Users: FAILED" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/admin/ai-providers/" -ForegroundColor White
    $providers = Invoke-RestMethod -Uri "$base/api/v1/admin/ai-providers/" -Headers $headers -TimeoutSec 5
    $providerCount = if ($providers -is [array]) { $providers.Count } else { ($providers.results | Measure-Object).Count }
    Write-Host "  ✅ AI Providers: $providerCount found" -ForegroundColor Green
} catch {
    Write-Host "  ❌ AI Providers: FAILED" -ForegroundColor Red
}

try {
    Write-Host "  Testing: GET /api/v1/admin/stats/" -ForegroundColor White
    $stats = Invoke-RestMethod -Uri "$base/api/v1/admin/stats/" -Headers $headers -TimeoutSec 5
    Write-Host "  ✅ System stats: OK" -ForegroundColor Green
    Write-Host "     Total Clients: $($stats.total_clients)" -ForegroundColor Gray
    Write-Host "     Total Users: $($stats.total_users)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ System stats: FAILED" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   Swagger UI: $base/api/docs/" -ForegroundColor White
Write-Host "   ReDoc: $base/api/redoc/" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full reference: See API_ENDPOINTS_REFERENCE.md" -ForegroundColor Cyan
