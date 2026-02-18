# Test with admin credentials to fix client association issue
Write-Host "Testing with admin credentials..."

# Login as admin
try {
    Write-Host "Logging in as admin..."
    $loginBody = @{
        email = "admin@sync2gear.com"
        password = "Admin@Sync2Gear2025!"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/login/" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host "Admin login: $($response.StatusCode)" -ForegroundColor Green
    
    $loginResult = $response.Content | ConvertFrom-Json
    $token = $loginResult.access
    Write-Host "Admin token received: $($token.Substring(0,20))..." -ForegroundColor Gray
    
    # Test upload URL with admin token and client_id
    Write-Host "Testing upload URL with admin token..."
    $uploadBody = @{
        filename = "test-song.mp3"
        contentType = "audio/mpeg"
        fileSize = 5242880
        client_id = "6766a0a6-4c17-4a1a-9c80-6ac8d3a91d1c"  # Default client ID from seed
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/upload-url/" -Method POST -Body $uploadBody -Headers $headers -UseBasicParsing
    Write-Host "Upload URL: $($response.StatusCode)" -ForegroundColor Green
    
    $uploadResult = $response.Content | ConvertFrom-Json
    Write-Host "Upload URL: $($uploadResult.uploadUrl.Substring(0,50))..." -ForegroundColor Gray
    Write-Host "S3 Key: $($uploadResult.s3Key)" -ForegroundColor Gray
    Write-Host "Expires in: $($uploadResult.expiresIn) seconds" -ForegroundColor Gray
    
    # Test complete upload
    Write-Host "Testing complete upload..."
    $completeBody = @{
        s3Key = $uploadResult.s3Key
        title = "Test Song"
        artist = "Test Artist"
        client_id = "6766a0a6-4c17-4a1a-9c80-6ac8d3a91d1c"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/files/complete/" -Method POST -Body $completeBody -Headers $headers -UseBasicParsing
    Write-Host "Complete upload: $($response.StatusCode)" -ForegroundColor Green
    
    $completeResult = $response.Content | ConvertFrom-Json
    Write-Host "Song created: $($completeResult.title) by $($completeResult.artist)" -ForegroundColor Gray
    Write-Host "File URL: $($completeResult.file_url)" -ForegroundColor Gray
    
    # Test music files listing
    Write-Host "Testing music files listing..."
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/files/" -Method GET -Headers $headers -UseBasicParsing
    Write-Host "Music files: $($response.StatusCode)" -ForegroundColor Green
    
    $filesResult = $response.Content | ConvertFrom-Json
    Write-Host "Found: $($filesResult.count) music files" -ForegroundColor Gray
    
    if ($filesResult.results -and $filesResult.results.Count -gt 0) {
        Write-Host "Latest file: $($filesResult.results[0].title) by $($filesResult.results[0].artist)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}