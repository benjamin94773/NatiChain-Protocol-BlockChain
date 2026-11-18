# 🎙️ Guion de Exposición — NatiChain Protocol
> **Proyecto #3:** Círculos de Ahorro Comunitario (Microfinanzas & Blockchain)  
> **Duración sugerida:** 8 a 10 minutos (incluyendo Demo interactiva).

---

## ⏱️ MINUTO 0:00 - 1:00 | Diapositiva 1: Portada
**Título en pantalla:** *NatiChain Protocol • Círculos de Ahorro Comunitario en Blockchain*

> "Buenos días/tardes profesor y compañeros. A nosotros nos correspondió el **Proyecto #3: Círculos de Ahorro Comunitario** en la categoría de **Microfinanzas**.
>
> Desarrollamos **NatiChain Protocol**, una solución descentralizada en Solidity y Foundry que reemplaza la figura vulnerable del tesorero tradicional por contratos inteligentes, bóvedas inmutables, reglas matemáticas anti-mora y un sistema de sorteos criptográficamente verificables on-chain."

---

## ⏱️ MINUTO 1:00 - 2:30 | Diapositiva 2: Contexto y Diagnóstico
**Título en pantalla:** *El Problema Real de las Natilleras y Cadenas en Colombia*

> "Para entender por qué se necesita Blockchain, primero debemos ver cómo ahorran millones de colombianos en la economía popular. Existen dos esquemas principales:
>
> 1. La **'Cadena' o Pasanaku (modelo ROSCA):** donde $N$ personas aportan una cuota periódica fija y en cada ronda uno distinto se lleva todo el pozo acumulado.
> 2. La **'Natillera' (modelo ASCA):** un fondo común acumulativo durante 6 a 12 meses que se liquida en diciembre repartiendo capital más intereses.
>
> Ambos esquemas sufren de cuatro fallas críticas en el mundo real:
> - Primero, el **riesgo de custodia**: si al tesorero le roban el efectivo o le embargan su cuenta bancaria personal, todos pierden su dinero.
> - Segundo, el **abandono post-turno**: quien cobra el Turno #1 en una cadena suele desentenderse y no vuelve a pagar las cuotas restantes.
> - Tercero, los **sorteos opacos**: el orden de los turnos se decide a dedo o con papelitos manipulables por el tesorero.
> - Y cuarto, la **inflación**: el dinero quieto en una alcancía o cuenta sin rendimiento pierde poder adquisitivo día tras día."

---

## ⏱️ MINUTO 2:30 - 4:00 | Diapositiva 3: Los 3 Aspectos Clave de Blockchain (Del PDF)
**Título en pantalla:** *Los 3 Aspectos Clave del Rol de Blockchain*

> "El enunciado del proyecto exigía abordar 3 aspectos clave donde la tecnología Blockchain aporta valor real:
>
> 1. **Bóveda Inmutable (Sustitución del tesorero):** Sustituir al tesorero humano por un contrato inteligente (`SavingsCircle.sol`). Los fondos y garantías residen en el contrato sin que ningún administrador pueda drenarlos arbitrariamente. El capital está denominado en un activo estable (`cUSD`) que mitiga la volatilidad de ETH o BTC.
> 2. **Reglas Anti-Mora (Garantía y premios a puntuales):** Implementar un **Depósito de Garantía (Colateral)** obligatorio al ingresar. Si alguien incumple, el contrato auto-cubre su deuda descontándola de su garantía. Además, quien paga tarde asume una multa automática del 10% que va directo a premiar a los cumplidos.
> 3. **Sorteo Verificable (Transparencia algorítmica):** Sustituir el sorteo manual por transparencia algorítmica. Ningún participante ni administrador puede alterar a quién le toca cada turno."

---

## ⏱️ MINUTO 4:00 - 5:15 | Diapositiva 4: Estructura y Arquitectura de Contratos
**Título en pantalla:** *Estructura y Arquitectura de Smart Contracts*

> "Para lograr esto, diseñamos una arquitectura modular y desacoplada de 7 contratos inteligentes en Solidity:
>
> - **`SavingsCircleFactory.sol`:** Aplica el patrón Factory para permitir a cualquier comunidad crear su propio círculo configurando monto, cupos, periodicidad, tasa de interés y modalidad: por turnos (**Cadena/ROSCA**) o al cierre (**Natillera/ASCA**).
> - **`SavingsCircle.sol` (Core):** Es el contrato núcleo y la bóveda inmutable que gestiona el ciclo de vida, rondas, aportes y cobro forzoso a morosos.
> - **`MockYieldVault.sol`:** Simula un protocolo DeFi de rendimientos para generar intereses sobre el saldo bloqueado y proteger el capital de la inflación.
> - **`ReputationRegistry.sol`:** Administra el historial crediticio comunitario.
> - **`MockStablecoin.sol (cUSD)`:** Provee la paridad estable en dólares con función de Faucet.
> - **`IRandomnessProvider.sol`:** La interfaz desacoplada de aleatoriedad con soporte para **Chainlink VRF v2.5** en testnets y simulador local para pruebas."

---

## ⏱️ MINUTO 5:15 - 6:30 | Diapositiva 5: El Sorteo y la Aleatoriedad Verificable
**Título en pantalla:** *El Sistema de Sorteos: Compromiso en 2 Fases y Fisher-Yates*

> "Aquí resolvimos el desafío técnico más importante: **¿cómo generar aleatoriedad en una EVM que es determinística?**
>
> En Blockchain no se puede hacer un sorteo en un solo paso con `block.timestamp` o `prevrandao`, porque el último participante en inscribirse podría simular la transacción en su nodo y, si ve que le toca el último turno, cancela o revierte la transacción.
>
> Nuestra solución opera en **dos fases (Commitment-Reveal)**:
> 1. Al inscribirse el último participante, el contrato congela la lista de miembros en un hash de compromiso criptográfico y pasa a estado `DRAW_PENDING`.
> 2. Luego se solicita aleatoriedad externa a un oráculo (**Chainlink VRF**).
> 3. Con esa semilla se ejecuta el algoritmo **Fisher-Yates con muestreo por rechazo**, descartando muestras residuales para eliminar cualquier sesgo matemático de módulo. Así garantizamos que todos tengan exactamente la misma probabilidad matemática."

---

## ⏱️ MINUTO 6:30 - 7:30 | Diapositiva 6: Mecanismos Económicos Anti-Mora
**Título en pantalla:** *Mecanismo Anti-Mora y Protección del Beneficiario*

> "Desde la teoría de juegos, alineamos los incentivos para que ser honesto sea siempre la mejor opción:
>
> - Para entrar, cada participante aporta una **Garantía Inicial (ej. 150 cUSD)**.
> - Si un miembro deja de pagar al vencer la ronda, el contrato descuenta su cuota y su multa de su garantía. Así, **el beneficiario del turno cobra sus 300 cUSD completos sin verse afectado**.
> - Quien paga a tiempo acumula **Puntos de Puntualidad (`onTimeShares`)**.
> - Quien paga tarde abona una multa del 10%.
> - Al finalizar el ciclo, la fórmula de liquidación reparte todos los rendimientos generados más las multas acumuladas **únicamente entre los miembros con puntualidad perfecta**."

---

## ⏱️ MINUTO 7:30 - 8:15 | Diapositiva 7: Reputación Crediticia On-Chain (Berkeley Paper)
**Título en pantalla:** *Pasaporte de Reputación Descentralizada (Paper de UC Berkeley)*

> "En la sección de recursos del PDF se cita la investigación de UC Berkeley sobre acceso al crédito mediante datos reputacionales y de redes sociales.
>
> Implementamos un **Score Crediticio Comunitario (100 a 1000 puntos)**:
> - Inicia en 500 puntos base.
> - Suma +25 pts por cada pago puntual.
> - Suma +60 pts por círculo completado con éxito.
> - Resta -40 pts por mora y -150 pts por default.
> - Y además incluimos **Respaldo de Red Social (`vouchForMember`)**: miembros veteranos con buen historial pueden avalar socialmente a vecinos o familiares desbancarizados (+15 pts por aval), convirtiendo la confianza comunitaria en un pasaporte crediticio on-chain protegido contra ataques Sybil."

---

## ⏱️ MINUTO 8:15 - 9:00 | Diapositiva 8: Validación Formal y Testing
**Título en pantalla:** *Validación Formal y Batería de Pruebas Automatizadas*

> "Para asegurar que el protocolo es seguro y resistente a fallos económicos o de código, implementamos una suite exhaustiva de pruebas en Foundry:
>
> - **29 pruebas en Solidity con 100% de éxito** en `SavingsCircle.t.sol` y `SavingsCircleSecurity.t.sol`.
> - **256 ejecuciones de Fuzzing**, probando permutaciones matemáticas aleatorias para verificar que ningún participante se duplique ni se omita en los turnos.
> - Y **4 pruebas de auditoría independiente en JavaScript**, verificando que la evidencia del compromiso coincide fuera de la cadena.
>
> Blindamos escenarios reales: bloqueo de front-running al inscribirse, prohibición de cancelaciones en círculos activos y cobertura de impagos en el 100% de los casos."

---

## ⏱️ MINUTO 9:00 - 10:00 | Diapositiva 9 & Pase a la Demo en Vivo
**Título en pantalla:** *Pase a la DApp Interactiva (http://localhost:3000)*

> "A continuación, pasaremos a proyectar la interfaz gráfica en vivo en `http://localhost:3000` para demostrar:
> 1. El autocompletado de cupos y el sorteo algorítmico verificable.
> 2. La diferencia entre un pago puntual y un pago con multa por mora.
> 3. Y la ejecución automática de la garantía ante un caso de abandono.
>
> Muchas gracias, procedemos a la demostración práctica."

---

### 💡 Pasos rápidos durante la Demo en el Navegador:
1. Dale al botón morado: **`Autocompletar Cupos & Sortear Turnos (1-Click Demo)`** $\rightarrow$ muestra el Sorteo Verificable con la semilla y los turnos #1, #2 y #3.
2. Con **Camila**, dale a **`Pagar Cuota Puntual (100 cUSD)`** $\rightarrow$ muestra que sube su Score Berkeley a 525 pts.
3. En el Laboratorio de Tiempo dale a **`+ Saltar a Ventana de Mora`**, cambia arriba a **Mateo** y dale a **`Pagar en Mora (110 cUSD)`** $\rightarrow$ muestra que paga $10 de multa para el pozo de premios.
4. En el Laboratorio de Tiempo dale a **`+ Vencer Ronda (Cubrir Morosos con Garantía)`** y luego en **`Ejecutar Desembolso`** $\rightarrow$ muestra cómo la garantía de Valentina cubrió la deuda y el Turno #1 cobró sus 300 cUSD completos.
