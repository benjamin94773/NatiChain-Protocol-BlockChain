import React, { useState, useEffect, useCallback } from 'react';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  custom,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';
import {
  ShieldCheck,
  Coins,
  Users,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  PlusCircle,
  RefreshCw,
  FastForward,
  Award,
  ArrowRight,
  Lock,
  Shuffle,
  TrendingUp,
  UserCheck,
  Wallet,
  Layers,
  Info,
} from 'lucide-react';
import {
  ANVIL_RPC_URL,
  DEFAULT_ADDRESSES,
  DEMO_WALLETS,
  STABLECOIN_ABI,
  REPUTATION_ABI,
  FACTORY_ABI,
  SAVINGS_CIRCLE_ABI,
} from './contracts/abis';

const publicClient = createPublicClient({
  chain: foundry,
  transport: http(ANVIL_RPC_URL),
});

interface CircleCardData {
  circleAddress: `0x${string}`;
  creator: `0x${string}`;
  name: string;
  payoutMode: number;
  state: number;
  contributionAmount: bigint;
  collateralAmount: bigint;
  maxParticipants: bigint;
  currentParticipants: bigint;
  currentRound: bigint;
  roundDuration: bigint;
  yieldRateBps: bigint;
  latePenaltyBps: bigint;
  vaultLockedPrincipal: bigint;
  totalYieldGenerated: bigint;
  totalPenaltiesCollected: bigint;
}

interface ParticipantData {
  account: `0x${string}`;
  joined: boolean;
  collateralBalance: bigint;
  principalSaved: bigint;
  onTimeShares: bigint;
  latePaymentsCount: bigint;
  defaultsCount: bigint;
  totalReceivedAtClose: bigint;
  turnPayoutReceived: bigint;
  assignedTurn: bigint;
}

interface RoundSummaryData {
  roundNumber: bigint;
  startTime: bigint;
  graceDeadline: bigint;
  endTime: bigint;
  paidCount: bigint;
  poolCollected: bigint;
  yieldGenerated: bigint;
  beneficiary: `0x${string}`;
  settled: boolean;
}

interface CircleDetailData {
  params: {
    name: string;
    contributionAmount: bigint;
    collateralAmount: bigint;
    maxParticipants: bigint;
    roundDuration: bigint;
    gracePeriod: bigint;
    latePenaltyBps: bigint;
    yieldRateBps: bigint;
    payoutMode: number;
  };
  state: number;
  currentRound: bigint;
  currentTime: bigint;
  participantsCount: bigint;
  vaultLockedPrincipal: bigint;
  totalYieldGenerated: bigint;
  totalPenaltiesCollected: bigint;
  totalOnTimeShares: bigint;
  verifiableSeed: `0x${string}`;
  participants: ParticipantData[];
  turnOrder: `0x${string}`[];
  roundStatuses: number[];
  roundSummaries: RoundSummaryData[];
}

interface UserRepStats {
  score: number;
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  circlesJoined: number;
  circlesCompletedClean: number;
  totalSavedVolume: string;
  socialEndorsements: number;
}

export function App() {
  const [selectedWalletIndex, setSelectedWalletIndex] = useState<number>(0);
  const [useBrowserWallet, setUseBrowserWallet] = useState<boolean>(false);
  const [browserAddress, setBrowserAddress] = useState<`0x${string}` | null>(null);

  const [rpcConnected, setRpcConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [txMessage, setTxMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);

  const [userBalance, setUserBalance] = useState<bigint>(0n);
  const [userRep, setUserRep] = useState<UserRepStats>({
    score: 500,
    onTimePayments: 0,
    latePayments: 0,
    defaults: 0,
    circlesJoined: 0,
    circlesCompletedClean: 0,
    totalSavedVolume: '0',
    socialEndorsements: 0,
  });

  const [circles, setCircles] = useState<CircleCardData[]>([]);
  const [selectedCircleAddr, setSelectedCircleAddr] = useState<`0x${string}` | null>(null);
  const [circleDetail, setCircleDetail] = useState<CircleDetailData | null>(null);
  const [memberScores, setMemberScores] = useState<Record<string, number>>({});

  // Modal de creación de nuevo círculo paramétrico
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCircleForm, setNewCircleForm] = useState({
    name: 'Cadena Comunitaria Cafeteros',
    payoutMode: 0, // 0 = ROSCA (Turnos), 1 = ASCA (Natillera Cierre)
    contributionAmount: '100',
    collateralAmount: '150',
    maxParticipants: '3',
    roundDurationDays: '7',
    gracePeriodDays: '3',
    latePenaltyPercent: '10',
    yieldRatePercent: '2',
  });

  const activeAddress: `0x${string}` =
    useBrowserWallet && browserAddress
      ? browserAddress
      : DEMO_WALLETS[selectedWalletIndex].address;

  const getWalletName = (addr: string) => {
    const found = DEMO_WALLETS.find((w) => w.address.toLowerCase() === addr.toLowerCase());
    if (found) return found.name;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getActiveWalletClient = useCallback(async () => {
    if (useBrowserWallet && (window as unknown as { ethereum?: unknown }).ethereum) {
      return createWalletClient({
        account: activeAddress,
        chain: foundry,
        transport: custom((window as unknown as { ethereum: Parameters<typeof custom>[0] }).ethereum),
      });
    }
    const demoAccount = privateKeyToAccount(DEMO_WALLETS[selectedWalletIndex].privateKey);
    return createWalletClient({
      account: demoAccount,
      chain: foundry,
      transport: http(ANVIL_RPC_URL),
    });
  }, [useBrowserWallet, activeAddress, selectedWalletIndex]);

  const notify = (type: 'info' | 'success' | 'error', text: string) => {
    setTxMessage({ type, text });
    if (type !== 'info') {
      setTimeout(() => {
        setTxMessage((prev) => (prev?.text === text ? null : prev));
      }, 6000);
    }
  };

  const fetchAllData = useCallback(async () => {
    try {
      await publicClient.getChainId();
      setRpcConnected(true);

      // 1. Balance y Reputación del usuario activo
      const [bal, repScore, repStats] = await Promise.all([
        publicClient.readContract({
          address: DEFAULT_ADDRESSES.stablecoin,
          abi: STABLECOIN_ABI,
          functionName: 'balanceOf',
          args: [activeAddress],
        }),
        publicClient.readContract({
          address: DEFAULT_ADDRESSES.reputation,
          abi: REPUTATION_ABI,
          functionName: 'getReputationScore',
          args: [activeAddress],
        }),
        publicClient.readContract({
          address: DEFAULT_ADDRESSES.reputation,
          abi: REPUTATION_ABI,
          functionName: 'getUserStats',
          args: [activeAddress],
        }),
      ]);

      setUserBalance(bal);
      setUserRep({
        score: Number(repScore),
        onTimePayments: Number(repStats.onTimePayments),
        latePayments: Number(repStats.latePayments),
        defaults: Number(repStats.defaults),
        circlesJoined: Number(repStats.circlesJoined),
        circlesCompletedClean: Number(repStats.circlesCompletedClean),
        totalSavedVolume: formatEther(repStats.totalSavedVolume),
        socialEndorsements: Number(repStats.socialEndorsements),
      });

      // 2. Lista de todos los círculos desde el Factory
      const rawCards = await publicClient.readContract({
        address: DEFAULT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: 'getAllCircleCards',
      });

      const formattedCards: CircleCardData[] = rawCards.map((c) => ({
        circleAddress: c.circleAddress,
        creator: c.creator,
        name: c.name,
        payoutMode: Number(c.payoutMode),
        state: Number(c.state),
        contributionAmount: c.contributionAmount,
        collateralAmount: c.collateralAmount,
        maxParticipants: c.maxParticipants,
        currentParticipants: c.currentParticipants,
        currentRound: c.currentRound,
        roundDuration: c.roundDuration,
        yieldRateBps: c.yieldRateBps,
        latePenaltyBps: c.latePenaltyBps,
        vaultLockedPrincipal: c.vaultLockedPrincipal,
        totalYieldGenerated: c.totalYieldGenerated,
        totalPenaltiesCollected: c.totalPenaltiesCollected,
      }));

      setCircles(formattedCards);

      const targetCircle =
        selectedCircleAddr ||
        (formattedCards.length > 0 ? formattedCards[0].circleAddress : null);

      if (targetCircle && !selectedCircleAddr) {
        setSelectedCircleAddr(targetCircle);
      }

      if (targetCircle) {
        const [overview, participants, turnOrder, roundSummaries] = await Promise.all([
          publicClient.readContract({
            address: targetCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'getCircleOverview',
          }),
          publicClient.readContract({
            address: targetCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'getAllParticipantsInfo',
          }),
          publicClient.readContract({
            address: targetCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'getTurnOrder',
          }),
          publicClient.readContract({
            address: targetCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'getAllRoundSummaries',
          }),
        ]);

        const currentRoundNum = overview[2];
        let statuses: readonly number[] = [];
        if (currentRoundNum > 0n) {
          statuses = await publicClient.readContract({
            address: targetCircle,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'getRoundStatuses',
            args: [currentRoundNum],
          });
        }

        // Cargar scores de reputación de todos los miembros de la mesa
        const scoresMap: Record<string, number> = {};
        await Promise.all(
          participants.map(async (p) => {
            const sc = await publicClient.readContract({
              address: DEFAULT_ADDRESSES.reputation,
              abi: REPUTATION_ABI,
              functionName: 'getReputationScore',
              args: [p.account],
            });
            scoresMap[p.account.toLowerCase()] = Number(sc);
          })
        );
        setMemberScores(scoresMap);

        setCircleDetail({
          params: {
            name: overview[0].name,
            contributionAmount: overview[0].contributionAmount,
            collateralAmount: overview[0].collateralAmount,
            maxParticipants: overview[0].maxParticipants,
            roundDuration: overview[0].roundDuration,
            gracePeriod: overview[0].gracePeriod,
            latePenaltyBps: overview[0].latePenaltyBps,
            yieldRateBps: overview[0].yieldRateBps,
            payoutMode: Number(overview[0].payoutMode),
          },
          state: Number(overview[1]),
          currentRound: overview[2],
          currentTime: overview[3],
          participantsCount: overview[4],
          vaultLockedPrincipal: overview[5],
          totalYieldGenerated: overview[6],
          totalPenaltiesCollected: overview[7],
          totalOnTimeShares: overview[8],
          verifiableSeed: overview[9],
          participants: participants.map((p) => ({ ...p })),
          turnOrder: [...turnOrder],
          roundStatuses: statuses.map((s) => Number(s)),
          roundSummaries: roundSummaries.map((r) => ({ ...r })),
        });
      }
    } catch (err) {
      console.error('Error conectando a Anvil:', err);
      setRpcConnected(false);
    }
  }, [activeAddress, selectedCircleAddr]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 4000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ===========================================================================
  // Acciones en Blockchain
  // ===========================================================================

  const handleFaucet = async () => {
    try {
      setLoading(true);
      notify('info', 'Solicitando 1,000 cUSD del Faucet...');
      const wallet = await getActiveWalletClient();
      const hash = await wallet.writeContract({
        address: DEFAULT_ADDRESSES.stablecoin,
        abi: STABLECOIN_ABI,
        functionName: 'faucet',
        args: [activeAddress, parseEther('1000')],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      notify('success', '¡+1,000 cUSD acreditados en tu billetera!');
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error en Faucet: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      notify('info', 'Desplegando nuevo contrato SavingsCircle desde Factory...');
      const wallet = await getActiveWalletClient();

      const params = {
        name: newCircleForm.name,
        contributionAmount: parseEther(newCircleForm.contributionAmount || '100'),
        collateralAmount: parseEther(newCircleForm.collateralAmount || '150'),
        maxParticipants: BigInt(newCircleForm.maxParticipants || '3'),
        roundDuration: BigInt(Math.round(Number(newCircleForm.roundDurationDays || '7') * 86400)),
        gracePeriod: BigInt(Math.round(Number(newCircleForm.gracePeriodDays || '3') * 86400)),
        latePenaltyBps: BigInt(Math.round(Number(newCircleForm.latePenaltyPercent || '10') * 100)),
        yieldRateBps: BigInt(Math.round(Number(newCircleForm.yieldRatePercent || '2') * 100)),
        payoutMode: Number(newCircleForm.payoutMode),
      };

      const hash = await wallet.writeContract({
        address: DEFAULT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: 'createCircle',
        args: [params],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setShowCreateModal(false);
      notify('success', `¡Círculo "${newCircleForm.name}" creado e inscrito en la bóveda!`);
      await fetchAllData();
      // Seleccionar el nuevo círculo recién creado
      const updatedCircles = await publicClient.readContract({
        address: DEFAULT_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: 'getAllCircles',
      });
      if (updatedCircles.length > 0) {
        setSelectedCircleAddr(updatedCircles[updatedCircles.length - 1]);
      }
    } catch (e: unknown) {
      notify('error', `Error al crear círculo: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!selectedCircleAddr || !circleDetail) return;
    try {
      setLoading(true);
      notify('info', 'Aprobando garantía cUSD y uniéndose al círculo...');
      const wallet = await getActiveWalletClient();

      const approveHash = await wallet.writeContract({
        address: DEFAULT_ADDRESSES.stablecoin,
        abi: STABLECOIN_ABI,
        functionName: 'approve',
        args: [selectedCircleAddr, parseEther('100000')],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const joinHash = await wallet.writeContract({
        address: selectedCircleAddr,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: 'joinCircle',
      });
      await publicClient.waitForTransactionReceipt({ hash: joinHash });

      notify('success', '¡Inscripción exitosa! Garantía depositada en el MockYieldVault.');
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error al unirse: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Función de 1-Click Demo para inscribir a todas las cuentas de prueba restantes y disparar el sorteo verificable
  const handleQuickFillParticipants = async () => {
    if (!selectedCircleAddr || !circleDetail) return;
    try {
      setLoading(true);
      notify('info', 'Inscribiendo participantes restantes y ejecutando Sorteo Verificable Fisher-Yates...');

      const joinedSet = new Set(circleDetail.participants.map((p) => p.account.toLowerCase()));
      const needed = Number(circleDetail.params.maxParticipants) - circleDetail.participants.length;
      let added = 0;

      for (const demoW of DEMO_WALLETS) {
        if (added >= needed) break;
        if (!joinedSet.has(demoW.address.toLowerCase())) {
          const wClient = createWalletClient({
            account: privateKeyToAccount(demoW.privateKey),
            chain: foundry,
            transport: http(ANVIL_RPC_URL),
          });
          const appHash = await wClient.writeContract({
            address: DEFAULT_ADDRESSES.stablecoin,
            abi: STABLECOIN_ABI,
            functionName: 'approve',
            args: [selectedCircleAddr, parseEther('100000')],
          });
          await publicClient.waitForTransactionReceipt({ hash: appHash });

          const jHash = await wClient.writeContract({
            address: selectedCircleAddr,
            abi: SAVINGS_CIRCLE_ABI,
            functionName: 'joinCircle',
          });
          await publicClient.waitForTransactionReceipt({ hash: jHash });
          added++;
        }
      }

      notify('success', '¡Cupo completado! Sorteo algorítmico verificable ejecutado y Ronda #1 iniciada.');
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error al autocompletar cupos: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePayContribution = async () => {
    if (!selectedCircleAddr || !circleDetail) return;
    try {
      setLoading(true);
      notify('info', `Pagando cuota de la Ronda #${circleDetail.currentRound.toString()}...`);
      const wallet = await getActiveWalletClient();

      const allowance = await publicClient.readContract({
        address: DEFAULT_ADDRESSES.stablecoin,
        abi: STABLECOIN_ABI,
        functionName: 'allowance',
        args: [activeAddress, selectedCircleAddr],
      });

      if (allowance < parseEther('10000')) {
        const appHash = await wallet.writeContract({
          address: DEFAULT_ADDRESSES.stablecoin,
          abi: STABLECOIN_ABI,
          functionName: 'approve',
          args: [selectedCircleAddr, parseEther('100000')],
        });
        await publicClient.waitForTransactionReceipt({ hash: appHash });
      }

      const payHash = await wallet.writeContract({
        address: selectedCircleAddr,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: 'payContribution',
      });
      await publicClient.waitForTransactionReceipt({ hash: payHash });

      notify('success', `¡Aporte de la Ronda #${circleDetail.currentRound.toString()} registrado en la bóveda!`);
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error al pagar cuota: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Botón de ayuda para Demo: Hace que todos los participantes pendientes paguen su cuota de la ronda actual
  const handleQuickPayAllPending = async () => {
    if (!selectedCircleAddr || !circleDetail) return;
    try {
      setLoading(true);
      notify('info', 'Procesando el aporte de todos los participantes pendientes en esta ronda...');

      for (let i = 0; i < circleDetail.participants.length; i++) {
        const p = circleDetail.participants[i];
        const status = circleDetail.roundStatuses[i];
        if (status === 0) {
          const demoW = DEMO_WALLETS.find(
            (w) => w.address.toLowerCase() === p.account.toLowerCase()
          );
          if (demoW) {
            const wClient = createWalletClient({
              account: privateKeyToAccount(demoW.privateKey),
              chain: foundry,
              transport: http(ANVIL_RPC_URL),
            });
            const payHash = await wClient.writeContract({
              address: selectedCircleAddr,
              abi: SAVINGS_CIRCLE_ABI,
              functionName: 'payContribution',
            });
            await publicClient.waitForTransactionReceipt({ hash: payHash });
          }
        }
      }

      notify('success', '¡Todos los participantes de la ronda han pagado! Lista para desembolsar.');
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error en pago grupal: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleRound = async () => {
    if (!selectedCircleAddr || !circleDetail) return;
    try {
      setLoading(true);
      notify('info', 'Acreditando rendimiento base en MockYieldVault y ejecutando desembolso automático...');
      const wallet = await getActiveWalletClient();

      const hash = await wallet.writeContract({
        address: selectedCircleAddr,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: 'settleCurrentRound',
      });
      await publicClient.waitForTransactionReceipt({ hash });

      const isLastRound = circleDetail.currentRound === circleDetail.params.maxParticipants;
      notify(
        'success',
        isLastRound
          ? '¡Ciclo finalizado! Garantías, ahorros, rendimientos y multas repartidos automáticamente a los puntuales.'
          : `¡Ronda #${circleDetail.currentRound.toString()} liquidada y desembolso ejecutado!`
      );
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error al liquidar ronda: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceTime = async (seconds: bigint, label: string) => {
    if (!selectedCircleAddr) return;
    try {
      setLoading(true);
      notify('info', `Simulando avance de tiempo: ${label}...`);
      const wallet = await getActiveWalletClient();

      const hash = await wallet.writeContract({
        address: selectedCircleAddr,
        abi: SAVINGS_CIRCLE_ABI,
        functionName: 'advanceVirtualTime',
        args: [seconds],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      notify('success', `Reloj del contrato avanzado (${label}).`);
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `Error al avanzar tiempo: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVouch = async (candidateAddress: `0x${string}`) => {
    try {
      setLoading(true);
      notify('info', `Registrando aval social comunitario para ${getWalletName(candidateAddress)}...`);
      const wallet = await getActiveWalletClient();

      const hash = await wallet.writeContract({
        address: DEFAULT_ADDRESSES.reputation,
        abi: REPUTATION_ABI,
        functionName: 'vouchForMember',
        args: [candidateAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      notify('success', `¡Aval social registrado! El puntaje crediticio de ${getWalletName(candidateAddress)} subió +15 pts.`);
      await fetchAllData();
    } catch (e: unknown) {
      notify('error', `No se pudo avalar: ${(e as Error).shortMessage || (e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const connectBrowserWallet = async () => {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
    if (!eth) {
      notify('error', 'No se detectó MetaMask en el navegador. Puedes usar el selector de participantes integrado arriba.');
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setBrowserAddress(accounts[0] as `0x${string}`);
        setUseBrowserWallet(true);
        notify('success', `Billetera MetaMask conectada: ${accounts[0]}`);
      }
    } catch (e: unknown) {
      notify('error', `Error conectando MetaMask: ${(e as Error).message}`);
    }
  };

  // Cálculos de estado de tiempo en la ronda activa
  const currentRoundSummary =
    circleDetail && circleDetail.currentRound > 0n
      ? circleDetail.roundSummaries[Number(circleDetail.currentRound) - 1]
      : null;

  const isGraceWindow =
    circleDetail && currentRoundSummary
      ? circleDetail.currentTime <= currentRoundSummary.graceDeadline
      : true;

  const isRoundExpired =
    circleDetail && currentRoundSummary
      ? circleDetail.currentTime >= currentRoundSummary.endTime
      : false;

  const activeUserParticipantIndex = circleDetail
    ? circleDetail.participants.findIndex(
        (p) => p.account.toLowerCase() === activeAddress.toLowerCase()
      )
    : -1;

  const activeUserJoined = activeUserParticipantIndex !== -1;
  const activeUserRoundStatus =
    activeUserJoined && circleDetail
      ? circleDetail.roundStatuses[activeUserParticipantIndex]
      : 0;

  const allPaidInCurrentRound =
    circleDetail && currentRoundSummary
      ? currentRoundSummary.paidCount === circleDetail.params.maxParticipants
      : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Principal */}
      <header className="border-b border-slate-800/80 bg-slate-900/75 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-950/60">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">NatiChain Protocol</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Proyecto #3 • Microfinanzas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Círculos de Ahorro Comunitario (Natilleras & Cadenas) con Bóveda Inmutable, Reglas Anti-Mora y Sorteo Verificable
              </p>
            </div>
          </div>

          {/* Estado RPC y Billetera Activa */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                rpcConnected
                  ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-700/50 text-rose-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  rpcConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {rpcConnected ? 'Foundry Anvil (Local EVM)' : 'Desconectado de Anvil (8545)'}
            </div>

            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-xs">
                <span className="text-slate-400 mr-1.5">Saldo:</span>
                <span className="font-bold text-white">
                  {Number(formatEther(userBalance)).toLocaleString('es-CO', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  cUSD
                </span>
              </div>
              <button
                onClick={handleFaucet}
                disabled={loading}
                className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition"
                title="Obtener 1,000 cUSD de prueba gratis"
              >
                + Faucet
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              <div className="text-xs">
                <span className="text-slate-400 mr-1.5">Score Berkeley:</span>
                <span className="font-bold text-indigo-300">{userRep.score} / 1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Cambio Rápido de Participante (Modo Demo Multi-Agente) */}
        <div className="bg-slate-900/95 border-t border-slate-800/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-slate-300">Simulador Multi-Participante (1-Click Switch):</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {DEMO_WALLETS.map((w, idx) => {
                const isSelected = !useBrowserWallet && selectedWalletIndex === idx;
                return (
                  <button
                    key={w.address}
                    onClick={() => {
                      setUseBrowserWallet(false);
                      setSelectedWalletIndex(idx);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${w.avatarColor}`} />
                    <span>{w.name.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-70">({w.address.slice(0, 5)}..)</span>
                  </button>
                );
              })}

              <button
                onClick={connectBrowserWallet}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                  useBrowserWallet
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Wallet className="w-3 h-3" />
                {useBrowserWallet && browserAddress
                  ? `MetaMask (${browserAddress.slice(0, 6)}...)`
                  : 'Conectar MetaMask'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de Notificaciones de Transacción */}
      {txMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 w-full">
          <div
            className={`px-4 py-3 rounded-xl border flex items-center justify-between text-sm ${
              txMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200'
                : txMessage.type === 'error'
                ? 'bg-rose-950/70 border-rose-600/60 text-rose-200'
                : 'bg-indigo-950/70 border-indigo-600/60 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {txMessage.type === 'info' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
              {txMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {txMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{txMessage.text}</span>
            </div>
            <button
              onClick={() => setTxMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 ml-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Catálogo de Círculos y Perfil Reputacional */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tarjeta de Círculos Disponibles */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Círculos de Ahorro
                </h2>
                <p className="text-xs text-slate-400">
                  Selecciona un círculo o crea uno nuevo paramétrico
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Crear Círculo
              </button>
            </div>

            <div className="space-y-3">
              {circles.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No hay círculos desplegados aún.
                </div>
              ) : (
                circles.map((c) => {
                  const isSelected =
                    selectedCircleAddr?.toLowerCase() === c.circleAddress.toLowerCase();
                  return (
                    <button
                      key={c.circleAddress}
                      onClick={() => setSelectedCircleAddr(c.circleAddress)}
                      className={`w-full text-left p-3.5 rounded-xl border transition ${
                        isSelected
                          ? 'bg-slate-800/95 border-emerald-500/70 shadow-md shadow-emerald-950/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-semibold text-sm text-white leading-snug">
                          {c.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            c.state === 0
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : c.state === 1
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {c.state === 0 ? 'Abierta' : c.state === 1 ? `Ronda ${c.currentRound.toString()}/${c.maxParticipants.toString()}` : 'Finalizada'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {c.payoutMode === 0 ? '🔄 Por Turnos (Cadena)' : '🏦 Al Cierre (Natillera)'}
                        </span>
                        <span>•</span>
                        <span>
                          Cuota:{' '}
                          <strong className="text-slate-200">
                            {formatEther(c.contributionAmount)} cUSD
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">Cupos</span>
                          <span className="font-semibold text-slate-200">
                            {c.currentParticipants.toString()} / {c.maxParticipants.toString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TVL Bóveda</span>
                          <span className="font-semibold text-emerald-400">
                            {Number(formatEther(c.vaultLockedPrincipal)).toFixed(0)} cUSD
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Yield Base</span>
                          <span className="font-semibold text-amber-300">
                            {(Number(c.yieldRateBps) / 100).toFixed(1)}% / ronda
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Tarjeta de Reputación Crediticia (Berkeley Paper) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Pasaporte de Reputación On-Chain
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium">
                {getWalletName(activeAddress)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Inspirado en <em>Good Reputation (UC Berkeley)</em>: historial de pagos verificable y respaldo de red social para acceso a microcrédito.
            </p>

            <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">Puntaje Crediticio Comunitario</span>
                <span className="text-lg font-extrabold text-indigo-400">
                  {userRep.score} <span className="text-xs font-normal text-slate-500">/ 1000</span>
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, userRep.score / 10))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
                <span className="text-slate-400 block">Pagos Puntuales</span>
                <span className="text-sm font-bold text-emerald-400">
                  {userRep.onTimePayments} (+{userRep.onTimePayments * 25} pts)
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
                <span className="text-slate-400 block">Pagos en Mora</span>
                <span className="text-sm font-bold text-amber-400">
                  {userRep.latePayments} (-{userRep.latePayments * 40} pts)
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
                <span className="text-slate-400 block">Avales Sociales</span>
                <span className="text-sm font-bold text-indigo-300">
                  {userRep.socialEndorsements} respaldos
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-2.5">
                <span className="text-slate-400 block">Incumplimientos</span>
                <span className="text-sm font-bold text-rose-400">
                  {userRep.defaults} defaults
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel Operativo de la Bóveda Inmutable */}
        <div className="lg:col-span-8 space-y-6">
          {!circleDetail ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-400">Selecciona o crea un círculo de ahorro para ver su bóveda inteligente.</p>
            </div>
          ) : (
            <>
              {/* Cabecera del Círculo Seleccionado + KPIs de la Bóveda */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5 mb-1">
                      <h2 className="text-xl font-bold text-white">{circleDetail.params.name}</h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/30">
                        {circleDetail.params.payoutMode === 0
                          ? '🔄 Modalidad Por Turnos (Cadena / ROSCA)'
                          : '🏦 Modalidad Al Cierre del Ciclo (Natillera / ASCA)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Contrato Bóveda Inmutable: {selectedCircleAddr}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        circleDetail.state === 0
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : circleDetail.state === 1
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                      }`}
                    >
                      {circleDetail.state === 0
                        ? '1. Inscripción Abierta'
                        : circleDetail.state === 1
                        ? `2. En Curso — Ronda #${circleDetail.currentRound.toString()} de ${circleDetail.params.maxParticipants.toString()}`
                        : '3. Ciclo Completado y Liquidado'}
                    </span>
                  </div>
                </div>

                {/* 4 Métricas Clave de la Bóveda */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Saldo Bloqueado (Vault)</span>
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-lg font-bold text-white">
                      {formatEther(circleDetail.vaultLockedPrincipal)} <span className="text-xs font-normal text-slate-400">cUSD</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Custodiado sin tesorero humano
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Rendimiento Base</span>
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-lg font-bold text-amber-300">
                      +{formatEther(circleDetail.totalYieldGenerated)} <span className="text-xs font-normal text-slate-400">cUSD</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Tasa: {(Number(circleDetail.params.yieldRateBps) / 100).toFixed(1)}% por ronda
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Pozo Multas Anti-Mora</span>
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="text-lg font-bold text-rose-300">
                      +{formatEther(circleDetail.totalPenaltiesCollected)} <span className="text-xs font-normal text-slate-400">cUSD</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Recargo mora: {(Number(circleDetail.params.latePenaltyBps) / 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Cuota / Garantía</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="text-lg font-bold text-indigo-300">
                      {formatEther(circleDetail.params.contributionAmount)} / {formatEther(circleDetail.params.collateralAmount)}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      cUSD cuota / cUSD colateral
                    </span>
                  </div>
                </div>

                {/* Zona de Acciones Principales según el estado del círculo */}
                {circleDetail.state === 0 && (
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1">
                        Fase de Inscripción ({circleDetail.participantsCount.toString()} de{' '}
                        {circleDetail.params.maxParticipants.toString()} participantes unidos)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Al inscribirte depositas{' '}
                        <strong className="text-slate-200">
                          {formatEther(circleDetail.params.collateralAmount)} cUSD
                        </strong>{' '}
                        de garantía reembolsable. Cuando se complete el cupo, el contrato ejecutará el{' '}
                        <strong className="text-emerald-300">Sorteo Algorítmico Verificable</strong> automáticamente.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {!activeUserJoined ? (
                        <button
                          onClick={handleJoinCircle}
                          disabled={loading}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition"
                        >
                          <UserCheck className="w-4 h-4" />
                          Unirme con {getWalletName(activeAddress).split(' ')[0]} ({formatEther(circleDetail.params.collateralAmount)} cUSD)
                        </button>
                      ) : (
                        <span className="px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {getWalletName(activeAddress).split(' ')[0]} ya está inscrito(a)
                        </span>
                      )}

                      <button
                        onClick={handleQuickFillParticipants}
                        disabled={loading}
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition"
                        title="Inscribe automáticamente a las cuentas de demostración restantes para iniciar el sorteo de inmediato"
                      >
                        <Shuffle className="w-4 h-4 text-indigo-400" />
                        Autocompletar Cupos & Sortear Turnos (1-Click Demo)
                      </button>
                    </div>
                  </div>
                )}

                {circleDetail.state === 1 && currentRoundSummary && (
                  <div className="space-y-4">
                    {/* Barra de Estado de la Ronda Actual y Ventana Anti-Mora */}
                    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-white">
                            Ronda Activa #{circleDetail.currentRound.toString()} de{' '}
                            {circleDetail.params.maxParticipants.toString()}
                          </span>
                          {isGraceWindow && !isRoundExpired && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              ✓ Ventana Puntual Activa (Sin recargo + 1 Punto de Puntualidad)
                            </span>
                          )}
                          {!isGraceWindow && !isRoundExpired && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              ⚠️ Ventana de Mora Activa (+
                              {(Number(circleDetail.params.latePenaltyBps) / 100).toFixed(1)}% multa para el pozo de puntuales)
                            </span>
                          )}
                          {isRoundExpired && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              ⏰ Plazo de Ronda Vencido (Incumplimientos se cubrirán con Garantía)
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400">
                          Pagos recibidos en la ronda:{' '}
                          <strong className="text-white">
                            {currentRoundSummary.paidCount.toString()} /{' '}
                            {circleDetail.params.maxParticipants.toString()}
                          </strong>
                        </div>
                      </div>

                      {circleDetail.params.payoutMode === 0 && (
                        <div className="text-xs text-slate-300 bg-slate-900/90 border border-slate-800/80 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                          <span>
                            Beneficiario del Turno #{circleDetail.currentRound.toString()}:{' '}
                            <strong className="text-emerald-400">
                              {getWalletName(currentRoundSummary.beneficiary)} (
                              {currentRoundSummary.beneficiary.slice(0, 6)}...
                              {currentRoundSummary.beneficiary.slice(-4)})
                            </strong>
                          </span>
                          <span className="font-semibold text-white">
                            Pozo a desembolsar:{' '}
                            {formatEther(
                              circleDetail.params.contributionAmount *
                                circleDetail.params.maxParticipants
                            )}{' '}
                            cUSD
                          </span>
                        </div>
                      )}

                      {/* Botones de Pago y Liquidación de Ronda */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                          {activeUserJoined && activeUserRoundStatus === 0 ? (
                            <button
                              onClick={handlePayContribution}
                              disabled={loading}
                              className={`px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-lg transition ${
                                isGraceWindow
                                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/50'
                              }`}
                            >
                              <Coins className="w-4 h-4" />
                              {isGraceWindow
                                ? `Pagar Cuota Puntual con ${getWalletName(activeAddress).split(' ')[0]} (${formatEther(circleDetail.params.contributionAmount)} cUSD)`
                                : `Pagar en Mora con ${getWalletName(activeAddress).split(' ')[0]} (${formatEther(
                                    circleDetail.params.contributionAmount +
                                      (circleDetail.params.contributionAmount *
                                        circleDetail.params.latePenaltyBps) /
                                        10000n
                                  )} cUSD incl. multa)`}
                            </button>
                          ) : activeUserJoined ? (
                            <span className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              {getWalletName(activeAddress).split(' ')[0]} ya pagó esta ronda
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Selecciona arriba un participante inscrito para pagar individualmente
                            </span>
                          )}

                          {!allPaidInCurrentRound && (
                            <button
                              onClick={handleQuickPayAllPending}
                              disabled={loading}
                              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                              title="Hace que todos los participantes que faltan por pagar en la ronda actual aporten su cuota"
                            >
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                              Pagar con Todos los Restantes (1-Click)
                            </button>
                          )}
                        </div>

                        <button
                          onClick={handleSettleRound}
                          disabled={loading || (!allPaidInCurrentRound && !isRoundExpired)}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition"
                        >
                          <ArrowRight className="w-4 h-4" />
                          {circleDetail.currentRound === circleDetail.params.maxParticipants
                            ? 'Liquidar Ronda Final y Cerrar Ciclo'
                            : `Ejecutar Desembolso y Avanzar a Ronda #${(
                                circleDetail.currentRound + 1n
                              ).toString()}`}
                        </button>
                      </div>
                    </div>

                    {/* Barra de Simulación de Tiempo para Sustentación en Vivo */}
                    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-indigo-200">
                        <FastForward className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>
                          <strong>Laboratorio de Tiempo (Sustentación):</strong> Avanza el reloj del contrato para probar multas por mora o cobertura automática de impagos con la garantía.
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() =>
                            handleAdvanceTime(
                              circleDetail.params.gracePeriod + 3600n,
                              'Entrar a Ventana de Mora'
                            )
                          }
                          disabled={loading || !isGraceWindow}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                        >
                          + Saltar a Ventana de Mora
                        </button>
                        <button
                          onClick={() =>
                            handleAdvanceTime(
                              circleDetail.params.roundDuration + 3600n,
                              'Vencer Plazo de Ronda (Forzar Default)'
                            )
                          }
                          disabled={loading || isRoundExpired}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                        >
                          + Vencer Ronda (Cubrir Morosos con Garantía)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {circleDetail.state === 2 && (
                  <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          ¡Ciclo de Ahorro Completado y Liquidado Exitosamente!
                        </h3>
                        <p className="text-xs text-slate-300">
                          La bóveda distribuyó automáticamente las garantías restantes, el ahorro acumulado y un pozo de premios de{' '}
                          <strong className="text-amber-300">
                            {formatEther(
                              circleDetail.totalYieldGenerated +
                                circleDetail.totalPenaltiesCollected
                            )}{' '}
                            cUSD
                          </strong>{' '}
                          (Rendimiento Base + Multas) entre los participantes puntuales.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sección de Sorteo Algorítmico Verificable y Orden de Turnos */}
              {circleDetail.turnOrder.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Shuffle className="w-4 h-4 text-emerald-400" />
                        Sorteo Algorítmico Verificable (Orden de Turnos)
                      </h3>
                      <p className="text-xs text-slate-400">
                        Secuencia generada on-chain mediante barajado determinístico Fisher-Yates al completarse el cupo
                      </p>
                    </div>
                    <div className="text-[11px] font-mono bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-400">
                      Semilla: {circleDetail.verifiableSeed.slice(0, 18)}...
                      {circleDetail.verifiableSeed.slice(-10)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {circleDetail.turnOrder.map((addr, idx) => {
                      const turnNum = idx + 1;
                      const isCurrentTurn =
                        circleDetail.state === 1 &&
                        Number(circleDetail.currentRound) === turnNum;
                      const isPastTurn =
                        circleDetail.state === 2 ||
                        (circleDetail.state === 1 &&
                          Number(circleDetail.currentRound) > turnNum);

                      return (
                        <div
                          key={addr}
                          className={`p-3.5 rounded-xl border relative ${
                            isCurrentTurn
                              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                              : isPastTurn
                              ? 'bg-slate-950/70 border-slate-800 opacity-85'
                              : 'bg-slate-950/40 border-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-bold text-emerald-400">Turno #{turnNum}</span>
                            {isPastTurn && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                Cobrado
                              </span>
                            )}
                            {isCurrentTurn && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 animate-pulse">
                                En Curso
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-sm text-white truncate">
                            {getWalletName(addr)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {addr.slice(0, 8)}...{addr.slice(-4)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tabla de Estado de Cuentas, Garantías y Distribución de Rendimientos a Puntuales */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      Estado de Cuentas, Puntualidad y Garantías por Participante
                    </h3>
                    <p className="text-xs text-slate-400">
                      Transparencia contable en tiempo real: aportes, puntos de puntualidad (shares de rendimiento) y avales sociales
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-3">Participante</th>
                        <th className="py-3 px-3">Turno</th>
                        <th className="py-3 px-3">Estado Ronda Actual</th>
                        <th className="py-3 px-3">Garantía Activa</th>
                        <th className="py-3 px-3">Ahorro Aportado</th>
                        <th className="py-3 px-3">Puntos Puntualidad</th>
                        <th className="py-3 px-3">Cobrado (Turno / Cierre)</th>
                        <th className="py-3 px-3 text-right">Red Social (Berkeley)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {circleDetail.participants.map((p, idx) => {
                        const rStatus = circleDetail.roundStatuses[idx] || 0;
                        const repScore = memberScores[p.account.toLowerCase()] ?? 500;
                        const isSelf = p.account.toLowerCase() === activeAddress.toLowerCase();

                        // Calcular participación estimada del pozo de premios (Yield + Multas)
                        const totalRewards =
                          circleDetail.totalYieldGenerated +
                          circleDetail.totalPenaltiesCollected;
                        const estimatedReward =
                          circleDetail.totalOnTimeShares > 0n
                            ? (totalRewards * p.onTimeShares) / circleDetail.totalOnTimeShares
                            : 0n;

                        return (
                          <tr key={p.account} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {getWalletName(p.account)}
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {p.account.slice(0, 6)}...{p.account.slice(-4)} • Score: {repScore}
                              </div>
                            </td>

                            <td className="py-3 px-3 font-bold text-slate-200">
                              {p.assignedTurn > 0n ? `#${p.assignedTurn.toString()}` : 'Por sortear'}
                            </td>

                            <td className="py-3 px-3">
                              {circleDetail.state === 0 && (
                                <span className="text-slate-400">Esperando inicio</span>
                              )}
                              {circleDetail.state === 2 && (
                                <span className="text-indigo-300 font-semibold">Ciclo cerrado</span>
                              )}
                              {circleDetail.state === 1 && (
                                <>
                                  {rStatus === 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                                      Pendiente
                                    </span>
                                  )}
                                  {rStatus === 1 && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                                      ✓ Puntual
                                    </span>
                                  )}
                                  {rStatus === 2 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                                      ⚠️ Pagó con Mora
                                    </span>
                                  )}
                                  {rStatus === 3 && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                                      🛡️ Cubierto con Garantía
                                    </span>
                                  )}
                                </>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`font-semibold ${
                                  p.collateralBalance < circleDetail.params.collateralAmount
                                    ? 'text-rose-400'
                                    : 'text-slate-200'
                                }`}
                              >
                                {formatEther(p.collateralBalance)} cUSD
                              </span>
                              {p.defaultsCount > 0n && (
                                <span className="block text-[10px] text-rose-400">
                                  ({p.defaultsCount.toString()} default descontado)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 font-semibold text-slate-200">
                              {formatEther(p.principalSaved)} cUSD
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-bold text-emerald-400">
                                {p.onTimeShares.toString()} pts
                              </div>
                              <div className="text-[10px] text-amber-300">
                                Premio acum: +{ Number(formatEther(estimatedReward)).toFixed(2) } cUSD
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="text-slate-200">
                                Turno: <strong>{formatEther(p.turnPayoutReceived)} cUSD</strong>
                              </div>
                              {p.totalReceivedAtClose > 0n && (
                                <div className="text-[11px] text-indigo-300">
                                  Liquidación final: +{ Number(formatEther(p.totalReceivedAtClose)).toFixed(2) } cUSD
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              {!isSelf ? (
                                <button
                                  onClick={() => handleVouch(p.account)}
                                  disabled={loading}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold transition"
                                  title="Respaldar socialmente a este participante para elevar su score crediticio comunitario"
                                >
                                  + Avalar Miembro
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500">Cuenta activa</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historial Auditable de Rondas */}
              {circleDetail.roundSummaries.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-400" />
                    Libro Mayor Auditable por Ronda
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {circleDetail.roundSummaries.map((r) => (
                      <div
                        key={r.roundNumber.toString()}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            Ronda #{r.roundNumber.toString()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.settled
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {r.settled ? 'Liquidada' : 'En Curso'}
                          </span>
                        </div>
                        <div className="text-slate-400 flex justify-between">
                          <span>Pozo Recaudado:</span>
                          <strong className="text-slate-200">{formatEther(r.poolCollected)} cUSD</strong>
                        </div>
                        <div className="text-slate-400 flex justify-between">
                          <span>Yield Generado:</span>
                          <strong className="text-amber-300">+{formatEther(r.yieldGenerated)} cUSD</strong>
                        </div>
                        {circleDetail.params.payoutMode === 0 && (
                          <div className="text-slate-400 flex justify-between">
                            <span>Beneficiario Turno:</span>
                            <strong className="text-emerald-400">
                              {getWalletName(r.beneficiary).split(' ')[0]}
                            </strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal para Crear Nuevo Círculo de Ahorro Paramétrico */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Crear Círculo de Ahorro Paramétrico
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCircle} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nombre del Círculo / Natillera / Cadena
                </label>
                <input
                  type="text"
                  required
                  value={newCircleForm.name}
                  onChange={(e) => setNewCircleForm({ ...newCircleForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Regla de Adjudicación (Modalidad)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewCircleForm({ ...newCircleForm, payoutMode: 0 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      newCircleForm.payoutMode === 0
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-white mb-0.5">🔄 Por Turnos (Cadena)</div>
                    <div className="text-[11px] opacity-80">
                      Desembolsa el pozo acumulado en cada ronda según el sorteo verificable.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCircleForm({ ...newCircleForm, payoutMode: 1 })}
                    className={`p-3 rounded-xl border text-left transition ${
                      newCircleForm.payoutMode === 1
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-white mb-0.5">🏦 Al Cierre (Natillera)</div>
                    <div className="text-[11px] opacity-80">
                      Bloquea todos los aportes generando interés compuesto hasta cerrar el ciclo.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cuota Periódica (cUSD)
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={newCircleForm.contributionAmount}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, contributionAmount: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Garantía Inicial (cUSD)
                  </label>
                  <input
                    type="number"
                    min={newCircleForm.contributionAmount}
                    required
                    value={newCircleForm.collateralAmount}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, collateralAmount: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    N° Participantes (2-10)
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    required
                    value={newCircleForm.maxParticipants}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, maxParticipants: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Periodicidad de Ronda (Días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCircleForm.roundDurationDays}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, roundDurationDays: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Ventana Puntual sin Mora (Días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={newCircleForm.roundDurationDays}
                    required
                    value={newCircleForm.gracePeriodDays}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, gracePeriodDays: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Penalización por Mora (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newCircleForm.latePenaltyPercent}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, latePenaltyPercent: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rendimiento Base Vault (% / ronda)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    max="20"
                    required
                    value={newCircleForm.yieldRatePercent}
                    onChange={(e) =>
                      setNewCircleForm({ ...newCircleForm, yieldRatePercent: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/60"
                >
                  Desplegar Contrato en Blockchain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
