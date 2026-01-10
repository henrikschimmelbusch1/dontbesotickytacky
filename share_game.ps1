$ErrorActionPreference = "Stop"
Write-Host "Starting Cloud Tunnel..." -ForegroundColor Cyan

# 1. Auto-detect the running game port
Write-Host "Detecting game port..."
$port = 0
for ($p = 5173; $p -le 5179; $p++) {
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) {
        $port = $p
        break
    }
}

if ($port -eq 0) {
    Write-Host "Error: Could not find the game running on ports 5173-5179." -ForegroundColor Red
    Write-Host "Make sure you have started the game with 'npm run dev'."
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "Found game running on port $port" -ForegroundColor Green

# 2. Start localtunnel
# Use -y to accept npx prompts automatically
$process = Start-Process npx.cmd -ArgumentList "-y localtunnel --port $port" -PassThru -RedirectStandardOutput "tunnel_log.txt" -RedirectStandardError "tunnel_error.txt" -WindowStyle Hidden

Write-Host "Waiting for public URL..." -ForegroundColor Yellow

# 3. Loop until we find the URL in the log file
$maxRetries = 30
$retryCount = 0
$url = $null

while ($retryCount -lt $maxRetries) {
    Start-Sleep -Seconds 1
    if (Test-Path "tunnel_log.txt") {
        try {
            $content = Get-Content "tunnel_log.txt" -ErrorAction SilentlyContinue
            # Look for the localtunnel URL pattern
            $match = $content | Select-String "https://[\w-]+\.loca\.lt"
            if ($match) {
                $url = $match.Matches[0].Value
                break
            }
        } catch {
            # Ignore read errors (file locking)
        }
    }
    $retryCount++
    Write-Host "." -NoNewline
}
Write-Host ""

if ($url) {
    Write-Host "Success! Tunnel is live at: $url" -ForegroundColor Green
    
    # Fetch tunnel password
    try {
        $password = Invoke-RestMethod -Uri "https://loca.lt/mytunnelpassword"
        Write-Host "Tunnel Password: $password" -ForegroundColor Cyan
    } catch {
        $password = "Unknown (Check https://loca.lt/mytunnelpassword)"
    }

    Write-Host "Opening in your browser..."
    
    # Open the URL
    Start-Process $url
    
    Write-Host "`n--------------------------------------------------"
    Write-Host "  KEEP THIS WINDOW OPEN TO KEEP THE GAME ONLINE"
    Write-Host "--------------------------------------------------"
    Write-Host "  1. The game is now open in your browser."
    Write-Host "  2. If your friend sees a password screen,"
    Write-Host "     tell them to enter: $password"
    Write-Host "  3. Click 'Multiplayer' -> 'Copy Page Link'."
    Write-Host "  4. Send that link to your friend."
    Write-Host "--------------------------------------------------`n"
    
    Read-Host "Press Enter to stop sharing and close the tunnel..."
} else {
    Write-Host "`nError: Could not get public URL." -ForegroundColor Red
    
    if (Test-Path "tunnel_log.txt") {
        Write-Host "--- Log Output ---"
        Get-Content "tunnel_log.txt"
    }
    if (Test-Path "tunnel_error.txt") {
        Write-Host "--- Error Output ---"
        Get-Content "tunnel_error.txt"
    }
    
    Write-Host "`nMake sure you have internet access and 'npm run dev' is running."
    Read-Host "Press Enter to exit..."
}

# Cleanup
Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
if (Test-Path "tunnel_log.txt") { Remove-Item "tunnel_log.txt" }
if (Test-Path "tunnel_error.txt") { Remove-Item "tunnel_error.txt" }
