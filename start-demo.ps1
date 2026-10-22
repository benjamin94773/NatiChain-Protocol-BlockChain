# Script de Inicio Rápido - Proyecto #3: Círculos de Ahorro Comunitario (NatiChain)
$ErrorActionPreference = "Stop"
$FoundryBin = "$env:USERPROFILE\.foundry\bin"
$env:Path = "$FoundryBin;$env:Path"

Write-Host "1. Iniciando nodo Blockchain local (Anvil en puerto 8545)..." -ForegroundColor Cyan
Start-Process -FilePath "$FoundryBin\anvil.exe" -ArgumentList "--host 127.0.0.1 --port 8545" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "2. Desplegando Smart Contracts y datos semilla con Foundry..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot\foundry"
& "$FoundryBin\forge.exe" script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
Pop-Location

Write-Host "3. Iniciando Interfaz Web3 en http://localhost:3000 ..." -ForegroundColor Green
Set-Location "$PSScriptRoot\web"
npm run dev
