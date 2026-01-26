# Open the launcher page in default browser
$launcherPath = Join-Path $PSScriptRoot "LAUNCHER.html"
Start-Process $launcherPath
Write-Host "`nLauncher page opened in your browser!`n" -ForegroundColor Green
