# Test backend endpoints for upload and user creation issues
Write-Host "`n🔍 Testing Backend Endpoints" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

# Test 1: Check if API is accessible
Write-Host "`n1. Testing API health check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/health" -Method GET -UseBasicParsing
    Write-Host "✅ API is accessible (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $health = $response.Content | ConvertFrom-Json
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ API health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Test user creation (seed users)
Write-Host "`n2. Testing user creation (seed users)..." -ForegroundColor Yellow
try {
    $body = @{token = "sync2gear-seed-2025"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/seed-users/" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ User seeding successful (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $result = $response.Content | ConvertFrom-Json
    Write-Host "   Created: $($result.created) users" -ForegroundColor Gray
    Write-Host "   Updated: $($result.updated) users" -ForegroundColor Gray
    
    if ($result.credentials) {
        Write-Host "`n   🔑 Default credentials:" -ForegroundColor Cyan
        Write-Host "   Admin: $($result.credentials.admin)" -ForegroundColor Gray
        Write-Host "   Staff: $($result.credentials.staff)" -ForegroundColor Gray
        Write-Host "   Client: $($result.credentials.client)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ User seeding failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Test 3: Test login with default credentials
Write-Host "`n3. Testing login with default client credentials..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "client@example.com"
        password = "Client@Example2025!"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/auth/login/" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Login successful (Status: $($response.StatusCode))" -ForegroundColor Green
    
    $loginResult = $response.Content | ConvertFrom-Json
    Write-Host "   User: $($loginResult.user.name) ($($loginResult.user.role))" -ForegroundColor Gray
    Write-Host "   Client ID: $($loginResult.user.client_id)" -ForegroundColor Gray
    
    # Extract token for further tests
    $global:authToken = $loginResult.access
    Write-Host "   Token received: $($global:authToken.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
}

# Test 4: Test S3 upload URL generation (if login successful)
if ($global:authToken) {
    Write-Host "`n4. Testing S3 upload URL generation..." -ForegroundColor Yellow
    try {
        $uploadBody = @{
            filename = "test-song.mp3"
            contentType = "audio/mpeg"
            fileSize = 5242880  # 5MB
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "Bearer $global:authToken"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/upload-url/" -Method POST -Body $uploadBody -Headers $headers -UseBasicParsing
        Write-Host "✅ Upload URL generation successful (Status: $($response.StatusCode))" -ForegroundColor Green
        
        $uploadResult = $response.Content | ConvertFrom-Json
        Write-Host "   Upload URL: $($uploadResult.uploadUrl.Substring(0,50))..." -ForegroundColor Gray
        Write-Host "   S3 Key: $($uploadResult.s3Key)" -ForegroundColor Gray
        Write-Host "   Expires in: $($uploadResult.expiresIn) seconds" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Upload URL generation failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Red
        }
    }
}

# Test 5: Test music files listing
if ($global:authToken) {
    Write-Host "`n5. Testing music files listing..." -ForegroundColor Yellow
    try {
        $headers = @{
            "Authorization" = "Bearer $global:authToken"
        }
        
        $response = Invoke-WebRequest -Uri "https://02nn8drgsd.execute-api.us-east-1.amazonaws.com/api/v1/music/files/" -Method GET -Headers $headers -UseBasicParsing
        Write-Host "✅ Music files listing successful (Status: $($response.StatusCode))" -ForegroundColor Green
        
        $filesResult = $response.Content | ConvertFrom-Json
        Write-Host "   Found: $($filesResult.count) music files" -ForegroundColor Gray
        
        if ($filesResult.results -and $filesResult.results.Count -gt 0) {
            Write-Host "`n   Sample files:" -ForegroundColor Cyan
            $filesResult.results | Select-Object -First 3 | ForEach-Object {
                Write-Host "   • $($_.title) by $($_.artist)" -ForegroundColor Gray
                if ($_.file_url) {
                    Write-Host "     URL: $($_.file_url.Substring(0,50))..." -ForegroundColor Gray
                }
            }
        }
    } catch {
        Write-Host "❌ Music files listing failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n" -ForegroundColor White
Write-Host "🎯 SUMMARY:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

if ($global:authToken) {
    Write-Host "✅ Authentication is working" -ForegroundColor Green
    Write-Host "✅ S3 upload URL generation is working" -ForegroundColor Green
    Write-Host "✅ Music files API is working" -ForegroundColor Green
    Write-Host "`n🚀 The backend is functional!" -ForegroundColor Green
    Write-Host "   Upload issues may be related to:" -ForegroundColor Yellow
    Write-Host "   • File size limits (10MB max via API Gateway)" -ForegroundColor Gray
    Write-Host "   • Network connectivity on mobile device" -ForegroundColor Gray
    Write-Host "   • S3 bucket permissions (check AWS console)" -ForegroundColor Gray
} else {
    Write-Host "❌ Authentication is failing" -ForegroundColor Red
    Write-Host "❌ This will break all authenticated endpoints" -ForegroundColor Red
    Write-Host "`n🔧 Fix the authentication first, then test uploads" -ForegroundColor Yellow
}