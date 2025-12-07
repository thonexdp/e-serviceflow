# PowerShell script to fix VITE environment variables in .env
# This replaces ${VAR} syntax with actual values

$envFile = ".env"
$content = Get-Content $envFile -Raw

Write-Host "Fixing VITE environment variables..." -ForegroundColor Yellow

# Extract current values
$pusherKey = if ($content -match 'PUSHER_APP_KEY=([^\r\n]+)') { $matches[1] } else { "" }
$pusherHost = if ($content -match 'PUSHER_HOST=([^\r\n]+)') { $matches[1] } else { "127.0.0.1" }
$pusherPort = if ($content -match 'PUSHER_PORT=([^\r\n]+)') { $matches[1] } else { "6001" }
$pusherScheme = if ($content -match 'PUSHER_SCHEME=([^\r\n]+)') { $matches[1] } else { "http" }
$pusherCluster = if ($content -match 'PUSHER_APP_CLUSTER=([^\r\n]+)') { $matches[1] } else { "mt1" }

Write-Host "Detected values:" -ForegroundColor Cyan
Write-Host "  PUSHER_APP_KEY: $pusherKey"
Write-Host "  PUSHER_HOST: $pusherHost"
Write-Host "  PUSHER_PORT: $pusherPort"
Write-Host "  PUSHER_SCHEME: $pusherScheme"
Write-Host "  PUSHER_APP_CLUSTER: $pusherCluster"
Write-Host ""

# Replace VITE_ variables with actual values (remove quotes and ${} syntax)
$content = $content -replace 'VITE_PUSHER_APP_KEY="?\$\{PUSHER_APP_KEY\}"?', "VITE_PUSHER_APP_KEY=$pusherKey"
$content = $content -replace 'VITE_PUSHER_HOST="?\$\{PUSHER_HOST\}"?', "VITE_PUSHER_HOST=$pusherHost"
$content = $content -replace 'VITE_PUSHER_PORT="?\$\{PUSHER_PORT\}"?', "VITE_PUSHER_PORT=$pusherPort"
$content = $content -replace 'VITE_PUSHER_SCHEME="?\$\{PUSHER_SCHEME\}"?', "VITE_PUSHER_SCHEME=$pusherScheme"
$content = $content -replace 'VITE_PUSHER_APP_CLUSTER="?\$\{PUSHER_APP_CLUSTER\}"?', "VITE_PUSHER_APP_CLUSTER=$pusherCluster"

# Save back to file
$content | Set-Content $envFile -NoNewline

Write-Host "✅ Fixed VITE environment variables!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated variables:" -ForegroundColor Cyan
Write-Host "  VITE_PUSHER_APP_KEY=$pusherKey"
Write-Host "  VITE_PUSHER_HOST=$pusherHost"
Write-Host "  VITE_PUSHER_PORT=$pusherPort"
Write-Host "  VITE_PUSHER_SCHEME=$pusherScheme"
Write-Host "  VITE_PUSHER_APP_CLUSTER=$pusherCluster"
Write-Host ""
Write-Host "⚠️  IMPORTANT: You MUST restart 'npm run dev' for changes to take effect!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "  1. In the terminal running 'npm run dev', press Ctrl+C"
Write-Host "  2. Run: npm run dev"
Write-Host "  3. Refresh your browser"
