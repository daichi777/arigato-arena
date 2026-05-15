param([int]$Port)
$conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conns) {
  foreach ($c in $conns) {
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
  Write-Host "killed port $Port"
} else {
  Write-Host "no process on port $Port"
}
