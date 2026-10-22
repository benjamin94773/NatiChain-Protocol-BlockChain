# Proyecto #3: Círculos de Ahorro Comunitario en Blockchain (NatiChain)

Prototipo funcional completo en **Solidity + Foundry + React/TypeScript (Viem)** para la creación y gestión descentralizada de **Natilleras (ASCA)** y **Cadenas de Ahorro (ROSCA)**.

## Arquitectura de Contratos Inteligentes (`foundry/src/`)
1. **[`SavingsCircle.sol`](./foundry/src/SavingsCircle.sol)**:
   - **Bóveda Inmutable:** Custodia descentralizada sin riesgo de apropiación por parte del tesorero.
   - **Modalidades Paramétricas:** Soporta desembolso **Por Turnos (`ROSCA` / Cadena)** y **Al Cierre del Ciclo (`ASCA` / Natillera)**.
   - **Reglas Anti-Mora:** Ventana de puntualidad (`gracePeriod`), multas automáticas sobre pagos tardíos (`latePenaltyBps`), cobertura automática de incumplimientos mediante depósito de garantía (`collateralAmount`) y distribución exclusiva de premios (`Rendimiento Base + Multas`) a los participantes puntuales según sus `onTimeShares`.
   - **Sorteo Algorítmico Verificable:** Asignación transparente del orden de turnos con barajado *Fisher-Yates* y semilla auditable on-chain (`verifiableSeed`).
2. **[`MockYieldVault.sol`](./foundry/src/MockYieldVault.sol)**:
   - Simula la generación de un rendimiento base por ronda sobre todo el saldo bloqueado en la bóveda para proteger el capital frente a la inflación.
3. **[`ReputationRegistry.sol`](./foundry/src/ReputationRegistry.sol)**:
   - Implementa un puntaje crediticio comunitario (escala `100` a `1000`) y un sistema de avales sociales (*vouching*) basado en el paper *Good Reputation: Expanding Access to Credit Leveraging Reputational and Social Network Data (UC Berkeley)*.
4. **[`SavingsCircleFactory.sol`](./foundry/src/SavingsCircleFactory.sol)**:
   - Fábrica para desplegar y consultar múltiples círculos paramétricos.
5. **[`MockStablecoin.sol`](./foundry/src/MockStablecoin.sol)**:
   - Activo estable ERC-20 (`cUSD`) con Faucet integrado para pruebas.

---

## Comandos Principales

### 1. Ejecutar Pruebas Automatizadas en Foundry
```powershell
cd foundry
forge test -vv
```

### 2. Iniciar Todo el Proyecto (Blockchain Local + Despliegue + DApp Web)
Desde la raíz del proyecto:
```powershell
.\start-demo.ps1
```
Luego abre **`http://localhost:3000`** en tu navegador.
