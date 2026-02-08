# Load .env file and set environment variables
$envFile = Get-Content .env
foreach ($line in $envFile) {
    if ($line -match '^\s*#') { continue }  # Skip comments
    if ($line -match '^\s*$') { continue }  # Skip empty lines
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Deploy using serverless
npm run deploy


