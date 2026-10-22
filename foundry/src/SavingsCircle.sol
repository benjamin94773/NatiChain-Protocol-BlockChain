// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockStablecoin} from "./MockStablecoin.sol";
import {MockYieldVault} from "./MockYieldVault.sol";
import {ReputationRegistry} from "./ReputationRegistry.sol";

/**
 * @title SavingsCircle (Bóveda Inmutable de Ahorro Comunitario)
 * @notice Contrato inteligente que reemplaza al tesorero humano en Natilleras (ASCA) y Cadenas (ROSCA).
 *         Implementa:
 *         1. Bóveda inmutable sin riesgo de apropiación.
 *         2. Reglas anti-mora (ventana de gracia, multas automáticas, cobertura con garantía y premio a puntuales).
 *         3. Sorteo verificable (Fisher-Yates con semilla criptográfica auditable).
 *         4. Generación de rendimiento base sobre el saldo bloqueado vía MockYieldVault.
 *         5. Desembolso automático por turnos (ROSCA) o al cierre del ciclo (ASCA).
 */
contract SavingsCircle {
    enum PayoutMode {
        ROSCA, // 0: Por Turnos (Cadena / Pasanaku) - Desembolsa el pozo en cada ronda según orden sorteado
        ASCA   // 1: Al Cierre del Ciclo (Natillera) - Acumula todo el capital + interés compuesto hasta el final
    }

    enum CircleState {
        OPEN,      // Esperando que se inscriban los N participantes
        ACTIVE,    // En curso: rondas de ahorro y adjudicación activas
        COMPLETED  // Ciclo finalizado y fondos/rendimientos liquidados
    }

    enum PaymentStatus {
        PENDING,         // Aún no ha pagado en la ronda
        ON_TIME,         // Pagó puntualmente dentro de la ventana de gracia
        LATE,            // Pagó en mora (con recargo/multa)
        DEFAULT_COVERED  // Incumplió y su cuota fue cubierta automáticamente con su garantía
    }

    struct CircleParams {
        string name;
        uint256 contributionAmount; // Cuota periódica en cUSD (18 dec)
        uint256 collateralAmount;   // Garantía inicial anti-fuga en cUSD
        uint256 maxParticipants;    // Número de participantes (N) y de rondas
        uint256 roundDuration;      // Duración de cada ronda en segundos
        uint256 gracePeriod;        // Ventana de pago puntual sin multa (segundos desde inicio de ronda)
        uint256 latePenaltyBps;     // Multa por pago en mora en puntos básicos (ej. 500 = 5%)
        uint256 yieldRateBps;       // Rendimiento base simulado por ronda en puntos básicos (ej. 150 = 1.5%)
        PayoutMode payoutMode;      // ROSCA (Por turnos) o ASCA (Al cierre del ciclo)
    }

    struct ParticipantInfo {
        address account;
        bool joined;
        uint256 collateralBalance;
        uint256 principalSaved;
        uint256 onTimeShares;
        uint256 latePaymentsCount;
        uint256 defaultsCount;
        uint256 totalReceivedAtClose;
        uint256 turnPayoutReceived;
        uint256 assignedTurn; // 1..N una vez sorteado
    }

    struct RoundSummary {
        uint256 roundNumber;
        uint256 startTime;
        uint256 graceDeadline;
        uint256 endTime;
        uint256 paidCount;
        uint256 poolCollected;
        uint256 yieldGenerated;
        address beneficiary;
        bool settled;
    }

    MockStablecoin public immutable stablecoin;
    MockYieldVault public immutable yieldVault;
    ReputationRegistry public immutable reputationRegistry;
    address public immutable creator;

    CircleParams public params;
    CircleState public state;

    address[] public participants;
    address[] public turnOrder; // Orden sorteado verificablemente (0..N-1)
    bytes32 public verifiableSeed;

    uint256 public currentRound; // 1..maxParticipants
    uint256 public currentRoundStart;
    uint256 public virtualTimeOffset; // Permite simular paso del tiempo en demos en vivo (incluso en testnets)

    uint256 public totalOnTimeShares;
    uint256 public totalPenaltiesCollected;
    uint256 public totalYieldGenerated;

    mapping(address => ParticipantInfo) public participantData;
    mapping(uint256 => mapping(address => PaymentStatus)) public roundPaymentStatus;
    mapping(uint256 => RoundSummary) public roundSummaries;

    event ParticipantJoined(address indexed participant, uint256 currentCount, uint256 maxParticipants, uint256 collateralDeposited);
    event VerifiableDrawCompleted(address[] turnOrder, bytes32 seedUsed, uint256 startTime);
    event ContributionPaid(address indexed participant, uint256 indexed round, PaymentStatus status, uint256 amountPaid, uint256 penaltyPaid);
    event DefaultCoveredByCollateral(address indexed participant, uint256 indexed round, uint256 contributionCovered, uint256 penaltyCovered);
    event RoundSettled(uint256 indexed round, address indexed beneficiary, uint256 potDisbursed, uint256 yieldGenerated);
    event CycleCompleted(uint256 totalYieldDistributed, uint256 totalPenaltiesDistributed);
    event VirtualTimeAdvanced(uint256 secondsAdded, uint256 newVirtualTimestamp);

    error CircleNotOpen();
    error CircleNotActive();
    error AlreadyJoined();
    error NotParticipant();
    error AlreadyPaidInRound();
    error InvalidParameters();
    error RoundNotReadyToSettle();
    error InsufficientCollateralToJoin();

    constructor(
        address _stablecoin,
        address _yieldVault,
        address _reputationRegistry,
        address _creator,
        CircleParams memory _params
    ) {
        if (
            _params.maxParticipants < 2 ||
            _params.maxParticipants > 50 ||
            _params.contributionAmount == 0 ||
            _params.roundDuration == 0 ||
            _params.gracePeriod == 0 ||
            _params.gracePeriod > _params.roundDuration ||
            _params.collateralAmount < _params.contributionAmount
        ) {
            revert InvalidParameters();
        }

        stablecoin = MockStablecoin(_stablecoin);
        yieldVault = MockYieldVault(_yieldVault);
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        creator = _creator;
        params = _params;
        state = CircleState.OPEN;

        // Aprobar al MockYieldVault para custodiar el saldo bloqueado del círculo
        stablecoin.approve(_yieldVault, type(uint256).max);
    }

    /**
     * @notice Retorna el timestamp efectivo del contrato (incluyendo offset para demos interactivas).
     */
    function getCurrentTime() public view returns (uint256) {
        return block.timestamp + virtualTimeOffset;
    }

    /**
     * @notice Permite avanzar el reloj virtual del círculo para demostrar vencimientos, mora y cierres en vivo.
     */
    function advanceVirtualTime(uint256 secondsToAdd) external {
        virtualTimeOffset += secondsToAdd;
        emit VirtualTimeAdvanced(secondsToAdd, getCurrentTime());
    }

    /**
     * @notice Inscribe a un participante en el círculo depositando la garantía inicial en la bóveda.
     *         Al completarse el cupo N, ejecuta automáticamente el sorteo verificable e inicia la Ronda 1.
     */
    function joinCircle() external {
        if (state != CircleState.OPEN) revert CircleNotOpen();
        if (participantData[msg.sender].joined) revert AlreadyJoined();

        uint256 collateral = params.collateralAmount;
        stablecoin.transferFrom(msg.sender, address(this), collateral);
        yieldVault.deposit(collateral);

        participants.push(msg.sender);
        participantData[msg.sender] = ParticipantInfo({
            account: msg.sender,
            joined: true,
            collateralBalance: collateral,
            principalSaved: 0,
            onTimeShares: 0,
            latePaymentsCount: 0,
            defaultsCount: 0,
            totalReceivedAtClose: 0,
            turnPayoutReceived: 0,
            assignedTurn: 0
        });

        reputationRegistry.recordJoin(msg.sender);

        emit ParticipantJoined(msg.sender, participants.length, params.maxParticipants, collateral);

        if (participants.length == params.maxParticipants) {
            _startCircleAndDrawTurns();
        }
    }

    /**
     * @notice Realiza el pago de la cuota correspondiente a la ronda actual.
     *         Aplica reglas de puntualidad o recargo automático si se paga en mora.
     */
    function payContribution() external {
        if (state != CircleState.ACTIVE) revert CircleNotActive();
        ParticipantInfo storage pInfo = participantData[msg.sender];
        if (!pInfo.joined) revert NotParticipant();
        if (roundPaymentStatus[currentRound][msg.sender] != PaymentStatus.PENDING) {
            revert AlreadyPaidInRound();
        }

        uint256 nowTs = getCurrentTime();
        uint256 graceDeadline = currentRoundStart + params.gracePeriod;
        uint256 contribution = params.contributionAmount;
        uint256 penalty = 0;
        PaymentStatus status;

        if (nowTs <= graceDeadline) {
            status = PaymentStatus.ON_TIME;
            pInfo.onTimeShares += 1;
            totalOnTimeShares += 1;
            reputationRegistry.recordPayment(msg.sender, true, contribution);
        } else {
            status = PaymentStatus.LATE;
            penalty = (contribution * params.latePenaltyBps) / 10_000;
            pInfo.latePaymentsCount += 1;
            totalPenaltiesCollected += penalty;
            reputationRegistry.recordPayment(msg.sender, false, contribution);
        }

        uint256 totalToPay = contribution + penalty;
        stablecoin.transferFrom(msg.sender, address(this), totalToPay);
        yieldVault.deposit(totalToPay);

        pInfo.principalSaved += contribution;
        roundPaymentStatus[currentRound][msg.sender] = status;

        RoundSummary storage rSummary = roundSummaries[currentRound];
        rSummary.paidCount += 1;
        rSummary.poolCollected += contribution;

        emit ContributionPaid(msg.sender, currentRound, status, contribution, penalty);
    }

    /**
     * @notice Liquida la ronda actual:
     *         1. Verifica si todos pagaron o si ya venció el tiempo de la ronda.
     *         2. Si hay morosos al cierre de la ronda, cubre su cuota y multa descontando de su garantía.
     *         3. Genera el rendimiento base sobre el saldo bloqueado en MockYieldVault.
     *         4. Si es modo ROSCA (Por turnos), desembolsa el pozo al ganador del turno actual.
     *         5. Avanza a la siguiente ronda o ejecuta el cierre definitivo del ciclo.
     */
    function settleCurrentRound() external {
        if (state != CircleState.ACTIVE) revert CircleNotActive();

        RoundSummary storage rSummary = roundSummaries[currentRound];
        uint256 nowTs = getCurrentTime();
        bool allPaid = (rSummary.paidCount == params.maxParticipants);
        bool timeExpired = (nowTs >= rSummary.endTime);

        if (!allPaid && !timeExpired) {
            revert RoundNotReadyToSettle();
        }

        // 1. Cubrir incumplimientos (defaults) con la garantía de los participantes que no pagaron
        if (!allPaid) {
            uint256 contribution = params.contributionAmount;
            uint256 penalty = (contribution * params.latePenaltyBps) / 10_000;

            for (uint256 i = 0; i < participants.length; i++) {
                address member = participants[i];
                if (roundPaymentStatus[currentRound][member] == PaymentStatus.PENDING) {
                    ParticipantInfo storage mInfo = participantData[member];
                    uint256 availableCollateral = mInfo.collateralBalance;

                    uint256 coveredContribution = availableCollateral >= contribution
                        ? contribution
                        : availableCollateral;
                    uint256 remainingAfterContribution = availableCollateral - coveredContribution;
                    uint256 coveredPenalty = remainingAfterContribution >= penalty
                        ? penalty
                        : remainingAfterContribution;

                    uint256 totalDeducted = coveredContribution + coveredPenalty;
                    mInfo.collateralBalance -= totalDeducted;
                    mInfo.principalSaved += coveredContribution;
                    mInfo.defaultsCount += 1;

                    totalPenaltiesCollected += coveredPenalty;
                    roundPaymentStatus[currentRound][member] = PaymentStatus.DEFAULT_COVERED;
                    rSummary.paidCount += 1;
                    rSummary.poolCollected += coveredContribution;

                    reputationRegistry.recordDefault(member, totalDeducted);
                    emit DefaultCoveredByCollateral(member, currentRound, coveredContribution, coveredPenalty);
                }
            }
        }

        // 2. Simular generación de rendimiento base sobre el saldo bloqueado en el Vault
        uint256 yieldGenerated = yieldVault.accrueYield(params.yieldRateBps);
        totalYieldGenerated += yieldGenerated;
        rSummary.yieldGenerated = yieldGenerated;
        rSummary.settled = true;

        // 3. Ejecutar desembolso si el modo es ROSCA (Por turnos / Cadena)
        uint256 disbursedPot = 0;
        address beneficiary = rSummary.beneficiary;
        if (params.payoutMode == PayoutMode.ROSCA) {
            disbursedPot = rSummary.poolCollected;
            if (disbursedPot > 0) {
                yieldVault.withdrawPrincipal(beneficiary, disbursedPot);
                participantData[beneficiary].turnPayoutReceived += disbursedPot;
            }
        }

        emit RoundSettled(currentRound, beneficiary, disbursedPot, yieldGenerated);

        // 4. Avanzar a la siguiente ronda o liquidar el cierre del ciclo
        if (currentRound < params.maxParticipants) {
            currentRound += 1;
            _initializeRound(currentRound);
        } else {
            _finalizeCycle();
        }
    }

    /**
     * @dev Ejecuta el sorteo algorítmico verificable usando barajado Fisher-Yates e inicia la Ronda 1.
     */
    function _startCircleAndDrawTurns() internal {
        state = CircleState.ACTIVE;
        uint256 n = participants.length;
        turnOrder = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            turnOrder[i] = participants[i];
        }

        // Semilla verificable combinando entropía del bloque, timestamp y lista de participantes
        bytes32 seed = keccak256(
            abi.encodePacked(block.prevrandao, getCurrentTime(), block.number, address(this), participants)
        );
        verifiableSeed = seed;

        // Algoritmo Fisher-Yates shuffle determinístico a partir de la semilla
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);
            address temp = turnOrder[i];
            turnOrder[i] = turnOrder[j];
            turnOrder[j] = temp;
        }

        for (uint256 i = 0; i < n; i++) {
            participantData[turnOrder[i]].assignedTurn = i + 1;
        }

        currentRound = 1;
        _initializeRound(1);

        emit VerifiableDrawCompleted(turnOrder, seed, currentRoundStart);
    }

    function _initializeRound(uint256 roundNum) internal {
        uint256 nowTs = getCurrentTime();
        currentRoundStart = nowTs;
        address beneficiary = params.payoutMode == PayoutMode.ROSCA ? turnOrder[roundNum - 1] : address(0);

        roundSummaries[roundNum] = RoundSummary({
            roundNumber: roundNum,
            startTime: nowTs,
            graceDeadline: nowTs + params.gracePeriod,
            endTime: nowTs + params.roundDuration,
            paidCount: 0,
            poolCollected: 0,
            yieldGenerated: 0,
            beneficiary: beneficiary,
            settled: false
        });
    }

    /**
     * @dev Cierra el ciclo, retira fondos del MockYieldVault y distribuye:
     *      - Garantías restantes + Capital acumulado (en modo ASCA)
     *      - Rendimiento base + Multas de morosos proporcionalmente a los puntos de puntualidad (onTimeShares).
     */
    function _finalizeCycle() internal {
        state = CircleState.COMPLETED;

        uint256 vaultPrincipal = yieldVault.principalBalance(address(this));
        uint256 vaultYield = yieldVault.accruedYieldBalance(address(this));

        if (vaultPrincipal > 0) {
            yieldVault.withdrawPrincipal(address(this), vaultPrincipal);
        }
        if (vaultYield > 0) {
            yieldVault.withdrawYield(address(this), vaultYield);
        }

        uint256 rewardPool = totalYieldGenerated + totalPenaltiesCollected;
        uint256 distributedRewards = 0;
        uint256 n = participants.length;

        for (uint256 i = 0; i < n; i++) {
            address member = participants[i];
            ParticipantInfo storage mInfo = participantData[member];

            // Capital a devolver al cierre: Garantía restante + (en modo Natillera/ASCA, todo el ahorro acumulado)
            uint256 baseReturn = mInfo.collateralBalance;
            if (params.payoutMode == PayoutMode.ASCA) {
                baseReturn += mInfo.principalSaved;
            }

            // Premio por puntualidad proporcional a onTimeShares
            uint256 memberReward = 0;
            if (rewardPool > 0) {
                if (totalOnTimeShares > 0) {
                    memberReward = (rewardPool * mInfo.onTimeShares) / totalOnTimeShares;
                } else {
                    memberReward = rewardPool / n;
                }
            }

            distributedRewards += memberReward;
            uint256 totalPayout = baseReturn + memberReward;
            mInfo.totalReceivedAtClose = totalPayout;

            if (totalPayout > 0) {
                stablecoin.transfer(member, totalPayout);
            }

            bool cleanRecord = (mInfo.defaultsCount == 0 && mInfo.latePaymentsCount == 0);
            reputationRegistry.recordCircleCompletion(member, cleanRecord);
        }

        // Entregar cualquier residuo de división entera (wei dust) al primer turno
        uint256 remainingDust = stablecoin.balanceOf(address(this));
        if (remainingDust > 0 && n > 0) {
            address firstMember = turnOrder[0];
            participantData[firstMember].totalReceivedAtClose += remainingDust;
            stablecoin.transfer(firstMember, remainingDust);
        }

        emit CycleCompleted(totalYieldGenerated, totalPenaltiesCollected);
    }

    // =========================================================================
    // Funciones de Vista para el Frontend y Auditoría
    // =========================================================================

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    function getTurnOrder() external view returns (address[] memory) {
        return turnOrder;
    }

    function getAllParticipantsInfo() external view returns (ParticipantInfo[] memory list) {
        uint256 len = participants.length;
        list = new ParticipantInfo[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = participantData[participants[i]];
        }
    }

    function getRoundStatuses(uint256 roundNum) external view returns (PaymentStatus[] memory statuses) {
        uint256 len = participants.length;
        statuses = new PaymentStatus[](len);
        for (uint256 i = 0; i < len; i++) {
            statuses[i] = roundPaymentStatus[roundNum][participants[i]];
        }
    }

    function getAllRoundSummaries() external view returns (RoundSummary[] memory summaries) {
        uint256 total = currentRound;
        summaries = new RoundSummary[](total);
        for (uint256 i = 1; i <= total; i++) {
            summaries[i - 1] = roundSummaries[i];
        }
    }

    function getCircleOverview()
        external
        view
        returns (
            CircleParams memory _params,
            CircleState _state,
            uint256 _currentRound,
            uint256 _currentTime,
            uint256 _participantsCount,
            uint256 _vaultLockedPrincipal,
            uint256 _totalYieldGenerated,
            uint256 _totalPenaltiesCollected,
            uint256 _totalOnTimeShares,
            bytes32 _verifiableSeed
        )
    {
        return (
            params,
            state,
            currentRound,
            getCurrentTime(),
            participants.length,
            yieldVault.principalBalance(address(this)),
            totalYieldGenerated,
            totalPenaltiesCollected,
            totalOnTimeShares,
            verifiableSeed
        );
    }
}
