# Quick backend test
Write-Host "Testing backend endpoints..."

# Test health endpoint
try {
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/health" -Method GET -UseBasicParsing
    Write-Host "Health check: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test seed users
try {
    $body = @{token = "sync2gear-seed-2025"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/seed-users/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Seed users: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Seed users failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}