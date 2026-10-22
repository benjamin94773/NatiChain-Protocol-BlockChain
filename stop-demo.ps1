# Script para detener los procesos del proyecto (Anvil Blockchain + Servidor Web Vite)
Write-Host "Deteniendo nodo local Anvil (puerto 8545)..." -ForegroundColor Yellow
Get-Process -Name "anvil" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Deteniendo servidor web en puerto 3000..." -ForegroundColor Yellow
$portProcess = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($portProcess) {
    Stop-Process -Id $portProcess -Force -ErrorAction SilentlyContinue
}

Write-Host "¡Listo! Todos los procesos del proyecto están detenidos." -ForegroundColor Green
