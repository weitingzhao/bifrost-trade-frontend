import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTradePerformance, fetchExecutionsRange } from '@/api/trading'
import { fetchStructure } from '@/api/strategy'
import type { Trade, Execution } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import type { PerformanceSummary } from '@/types/trading'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { RiskProfile } from '@/utils/riskProfile'
import { sliceExecutionForTradeOptView, tradeOptionStockSlippageAdjustment } from '@/utils/ledger/ledgerOptHelpers'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'
import {
  computeTradePositionStatus,
  computeTradeExecDerivedNetPnl,
  computeTradeMaxRiskUsd,
  underlyingCostSellOptUsd,
  holdSpanDaysForMetrics,
  netPnlUsdPerDayFromNetAndExecutions,
  annualReturnDetailFromNetAndExecutions,
  type TradePositionStatus,
} from '@/utils/tradeListMetrics'
import { computeTradeRiskProfile } from '@/utils/tradeDetail/riskProfile'
import { computeOpenEndDisplay } from '@/utils/tradeDetail/openEndDisplay'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fillCountOf } from '@/utils/apiCounts'

function sliceExecutions(list: Execution[], tradeId: number): Execution[] {
  return list
    .map((ex) => sliceExecutionForTradeOptView(ex, tradeId))
    .filter((row): row is Execution => row != null)
}

export interface TradeDetailData {
  tradeId: number
  structure: StrategyStructure | null
  structureLoading: boolean
  structureError: string | null
  summary: PerformanceSummary | null
  perfLoading: boolean
  execLoading: boolean
  executionsFinal: Execution[]
  executionsTws: Execution[]
  optionStockLinkByOptionId: Record<number, import('@/types/trading').OptionStockLinkSummary>
  positionStatus: TradePositionStatus
  openEnd: ReturnType<typeof computeOpenEndDisplay>
  riskProfile: RiskProfile | null
  displayNetPnl: number | null
  totalCommission: number | null
  netPnlPerDay: number | null
  capitalAtRisk: number
  costPerDay: number | null
  holdDays: number | null
  returnPct: number | null
  annualReturnPct: number | null
  fillCount: number
}

export function useTradeDetailData(
  trade: Trade | null,
  portfolioAccounts: IbAccountSnapshot[] | undefined,
  enabled = true,
  riskProfileOverride?: RiskProfile | null,
): TradeDetailData | null {
  const tradeId = trade?.trade_id ?? 0
  const structureId = trade?.strategy_structure_id

  const { data: structure, isLoading: structureLoading, error: structureError } = useQuery({
    queryKey: QUERY_KEYS.strategy.structure(structureId ?? 0),
    queryFn: () => fetchStructure(structureId!),
    enabled: enabled && structureId != null && structureId > 0,
    staleTime: 120_000,
  })

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['trade-detail-perf', tradeId],
    queryFn: () => fetchTradePerformance(tradeId),
    enabled: enabled && tradeId > 0,
    staleTime: 60_000,
  })

  const { data: execFinalRes, isLoading: execFinalLoading } = useQuery({
    queryKey: ['trade-detail-execs-final', tradeId],
    queryFn: () =>
      fetchExecutionsRange({
        trade_id: tradeId,
        source_scope: 'performance_book',
        limit: 500,
      }),
    enabled: enabled && tradeId > 0,
    staleTime: 60_000,
  })

  const { data: execTwsRes, isLoading: execTwsLoading } = useQuery({
    queryKey: ['trade-detail-execs-tws', tradeId],
    queryFn: () =>
      fetchExecutionsRange({
        trade_id: tradeId,
        source_scope: 'tws_raw',
        limit: 500,
      }),
    enabled: enabled && tradeId > 0,
    staleTime: 60_000,
  })

  const executionsFinal = useMemo(
    () => sliceExecutions(execFinalRes?.items ?? [], tradeId),
    [execFinalRes, tradeId],
  )

  const executionsTws = useMemo(
    () => sliceExecutions(execTwsRes?.items ?? [], tradeId),
    [execTwsRes, tradeId],
  )

  const combinedForLinks = useMemo(
    () => [...executionsFinal, ...executionsTws],
    [executionsFinal, executionsTws],
  )

  const { data: optionStockLinkByOptionId = {} } = useQuery({
    queryKey: ['trade-detail-opt-links', tradeId, combinedForLinks.length],
    queryFn: () => fetchOptionStockLinkMapForExecutions(combinedForLinks),
    enabled: enabled && combinedForLinks.length > 0,
    staleTime: 60_000,
  })

  const linkedStockSlippage = useMemo(
    () => tradeOptionStockSlippageAdjustment(execFinalRes?.items ?? [], tradeId, optionStockLinkByOptionId),
    [execFinalRes, tradeId, optionStockLinkByOptionId],
  )

  const positionStatus = useMemo(
    () => computeTradePositionStatus(executionsFinal),
    [executionsFinal],
  )

  const openEnd = useMemo(
    () => computeOpenEndDisplay(trade, executionsFinal, positionStatus),
    [trade, executionsFinal, positionStatus],
  )

  const riskProfileFromExecutions = useMemo(
    () =>
      computeTradeRiskProfile(
        executionsFinal,
        structure ?? null,
        portfolioAccounts,
      ),
    [executionsFinal, structure, portfolioAccounts],
  )

  const riskProfile = riskProfileOverride ?? riskProfileFromExecutions

  const summary = perfData?.summary ?? null

  const execDerivedNetPnl = useMemo(
    () => computeTradeExecDerivedNetPnl(executionsFinal, linkedStockSlippage),
    [executionsFinal, linkedStockSlippage],
  )

  const summaryNetFallback =
    summary != null ? Number(summary.net_pnl) + linkedStockSlippage : null

  const displayNetPnl = execDerivedNetPnl ?? summaryNetFallback
  const underlying = underlyingCostSellOptUsd(executionsFinal)
  const capitalAtRisk = computeTradeMaxRiskUsd(executionsFinal, underlying)
  const holdDays = holdSpanDaysForMetrics(executionsFinal, positionStatus)
  const holdDaysUsed = holdDays != null ? Math.max(holdDays + 1, 1) : null

  const netPnlPerDay = netPnlUsdPerDayFromNetAndExecutions(
    displayNetPnl,
    executionsFinal,
    positionStatus,
  )

  const returnPct =
    displayNetPnl != null && capitalAtRisk > 0
      ? (displayNetPnl / capitalAtRisk) * 100
      : null

  const annualDetail = annualReturnDetailFromNetAndExecutions(
    displayNetPnl,
    executionsFinal,
    capitalAtRisk,
    positionStatus,
  )

  const costPerDay =
    capitalAtRisk > 0 && holdDaysUsed != null ? capitalAtRisk / holdDaysUsed : null

  if (!trade) return null

  return {
    tradeId,
    structure: structure ?? null,
    structureLoading,
    structureError: structureError ? String(structureError) : null,
    summary,
    perfLoading,
    execLoading: execFinalLoading || execTwsLoading,
    executionsFinal,
    executionsTws,
    optionStockLinkByOptionId,
    positionStatus,
    openEnd,
    riskProfile,
    displayNetPnl,
    totalCommission: summary?.total_commission ?? null,
    netPnlPerDay,
    capitalAtRisk,
    costPerDay,
    holdDays: holdDaysUsed,
    returnPct,
    annualReturnPct: annualDetail?.annualReturnPct ?? null,
    fillCount: fillCountOf(summary),
  }
}
