# Test current API endpoints
Write-Host "Testing API endpoints..."

# Test base API
Write-Host "Testing base API..."
try {
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/" -Method GET -UseBasicParsing
    Write-Host "Base API: $($response.StatusCode)" -ForegroundColor Green
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "Available endpoints: $($result.endpoints.PSObject.Properties.Name -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "Base API failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test auth endpoints
Write-Host "Testing auth endpoints..."
try {
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/" -Method GET -UseBasicParsing
    Write-Host "Auth endpoint: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Auth endpoint: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

# Test music endpoints  
Write-Host "Testing music endpoints..."
try {
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/" -Method GET -UseBasicParsing
    Write-Host "Music endpoint: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Music endpoint: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

# Test upload URL endpoint
Write-Host "Testing upload URL endpoint..."
try {
    $body = @{
        filename = "test.mp3"
        contentType = "audio/mpeg"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/upload-url/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Upload URL: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Unknown" }
    Write-Host "Upload URL: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}