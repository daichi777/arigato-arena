$ports = 1999, 3000, 3001, 3002, 3003
foreach ($p in $ports) {
  $c = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
  if ($c) {
    Write-Host "$p : LISTENING (PID $($c[0].OwningProcess))"
  } else {
    Write-Host "$p : free"
  }
}
