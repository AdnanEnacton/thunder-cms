# THUNDER-CMS dev server starter
Write-Host "Stopping old Node processes on ports 3000-3002..." -ForegroundColor Yellow

foreach ($port in 3000, 3001, 3002) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Start-Sleep -Seconds 2

$nextCache = Join-Path $PSScriptRoot "apps\web\.next"
if (Test-Path $nextCache) {
  Write-Host "Clearing stale Next.js cache..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force $nextCache -ErrorAction SilentlyContinue
}

Write-Host "Starting THUNDER-CMS at http://localhost:3000" -ForegroundColor Green
Set-Location $PSScriptRoot
pnpm dev