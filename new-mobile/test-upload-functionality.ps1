# Test upload functionality directly
Write-Host "Testing upload functionality..."

# First, let's test the upload URL endpoint without authentication to see the error
try {
    $body = @{
        filename = "test-song.mp3"
        contentType = "audio/mpeg"
        fileSize = 5242880
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/upload-url/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Upload URL (no auth): $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Unknown" }
    Write-Host "Upload URL (no auth): $statusCode (Expected: 401)" -ForegroundColor Yellow
}

# Now let's test with authentication - first login to get token
try {
    Write-Host "`nTesting login..."
    $loginBody = @{
        email = "client@example.com"
        password = "Client@Example2025!"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/login/" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Login: $($response.StatusCode)" -ForegroundColor Green
    
    $loginResult = $response.Content | ConvertFrom-Json
    $token = $loginResult.access
    Write-Host "Token received: $($token.Substring(0,20))..." -ForegroundColor Gray
    
    # Now test upload URL with token
    Write-Host "`nTesting upload URL with auth..."
    $uploadBody = @{
        filename = "test-song.mp3"
        contentType = "audio/mpeg"
        fileSize = 5242880
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/upload-url/" -Method POST -Body $uploadBody -Headers $headers -UseBasicParsing
    Write-Host "Upload URL (with auth): $($response.StatusCode)" -ForegroundColor Green
    
    $uploadResult = $response.Content | ConvertFrom-Json
    Write-Host "Upload URL: $($uploadResult.uploadUrl.Substring(0,50))..." -ForegroundColor Gray
    Write-Host "S3 Key: $($uploadResult.s3Key)" -ForegroundColor Gray
    Write-Host "Expires in: $($uploadResult.expiresIn) seconds" -ForegroundColor Gray
    
} catch {
    Write-Host "Auth/upload test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}