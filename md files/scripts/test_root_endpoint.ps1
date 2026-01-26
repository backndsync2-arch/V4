# Test Root Endpoint
Write-Host "=== Testing Root Endpoint ===" -ForegroundColor Cyan
Write-Host ""

$base = 'http://localhost:8000'

try {
    Write-Host "Testing: $base" -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $base -Method Get -TimeoutSec 5 -ErrorAction Stop
    
    Write-Host "✅ SUCCESS! Root endpoint is working!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 5
    
    Write-Host ""
    Write-Host "✅ API Info JSON is being returned correctly!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ FAILED: Root endpoint returned error" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host ""
        Write-Host "⚠️  The Django server needs to be RESTARTED!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To fix:" -ForegroundColor Green
        Write-Host "1. Stop the Django server (Ctrl+C in the terminal running it)" -ForegroundColor White
        Write-Host "2. Restart it: cd sync2gear_backend && python manage.py runserver" -ForegroundColor White
        Write-Host "3. Run this test again" -ForegroundColor White
    } elseif ($_.Exception.Response.StatusCode) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}
