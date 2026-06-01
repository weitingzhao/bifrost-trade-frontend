import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchInstancePerformance, fetchExecutionsRange } from '@/api/trading'
import { fetchStructure } from '@/api/strategy'
import type { StrategyInstance, Execution } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import type { PerformanceSummary } from '@/types/trading'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { RiskProfile } from '@/utils/riskProfile'
import { sliceExecutionForInstanceOptView, instanceOptionStockSlippageAdjustment } from '@/utils/ledger/ledgerOptHelpers'
import { fetchOptionStockLinkMapForExecutions } from '@/utils/ledger/fetchOptionStockLinkMap'
import {
  computeInstancePositionStatus,
  computeInstanceExecDerivedNetPnl,
  computeInstanceMaxRiskUsd,
  underlyingCostSellOptUsd,
  holdSpanDaysForMetrics,
  netPnlUsdPerDayFromNetAndExecutions,
  annualReturnDetailFromNetAndExecutions,
  type InstancePositionStatus,
} from '@/utils/instanceListMetrics'
import { computeInstanceRiskProfile } from '@/utils/instanceDetail/riskProfile'
import { computeOpenEndDisplay } from '@/utils/instanceDetail/openEndDisplay'

function sliceExecutions(list: Execution[], instanceId: number): Execution[] {
  return list
    .map((ex) => sliceExecutionForInstanceOptView(ex, instanceId))
    .filter((row): row is Execution => row != null)
}

export interface InstanceDetailData {
  instanceId: number
  structure: StrategyStructure | null
  structureLoading: boolean
  structureError: string | null
  summary: PerformanceSummary | null
  perfLoading: boolean
  execLoading: boolean
  executionsFinal: Execution[]
  executionsTws: Execution[]
  optionStockLinkByOptionId: Record<number, import('@/types/trading').OptionStockLinkSummary>
  positionStatus: InstancePositionStatus
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
  tradeCount: number
}

export function useInstanceDetailData(
  instance: StrategyInstance | null,
  portfolioAccounts: IbAccountSnapshot[] | undefined,
  enabled = true,
): InstanceDetailData | null {
  const instanceId = instance?.strategy_instance_id ?? 0
  const structureId = instance?.strategy_structure_id

  const { data: structure, isLoading: structureLoading, error: structureError } = useQuery({
    queryKey: ['instance-detail-structure', structureId],
    queryFn: () => fetchStructure(structureId!),
    enabled: enabled && structureId != null && structureId > 0,
    staleTime: 120_000,
  })

  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ['instance-detail-perf', instanceId],
    queryFn: () => fetchInstancePerformance(instanceId),
    enabled: enabled && instanceId > 0,
    staleTime: 60_000,
  })

  const { data: execFinalRes, isLoading: execFinalLoading } = useQuery({
    queryKey: ['instance-detail-execs-final', instanceId],
    queryFn: () =>
      fetchExecutionsRange({
        strategy_instance_id: instanceId,
        source_scope: 'performance_book',
        limit: 500,
      }),
    enabled: enabled && instanceId > 0,
    staleTime: 60_000,
  })

  const { data: execTwsRes, isLoading: execTwsLoading } = useQuery({
    queryKey: ['instance-detail-execs-tws', instanceId],
    queryFn: () =>
      fetchExecutionsRange({
        strategy_instance_id: instanceId,
        source_scope: 'tws_raw',
        limit: 500,
      }),
    enabled: enabled && instanceId > 0,
    staleTime: 60_000,
  })

  const executionsFinal = useMemo(
    () => sliceExecutions(execFinalRes?.items ?? [], instanceId),
    [execFinalRes, instanceId],
  )

  const executionsTws = useMemo(
    () => sliceExecutions(execTwsRes?.items ?? [], instanceId),
    [execTwsRes, instanceId],
  )

  const combinedForLinks = useMemo(
    () => [...executionsFinal, ...executionsTws],
    [executionsFinal, executionsTws],
  )

  const { data: optionStockLinkByOptionId = {} } = useQuery({
    queryKey: ['instance-detail-opt-links', instanceId, combinedForLinks.length],
    queryFn: () => fetchOptionStockLinkMapForExecutions(combinedForLinks),
    enabled: enabled && combinedForLinks.length > 0,
    staleTime: 60_000,
  })

  const linkedStockSlippage = useMemo(
    () => instanceOptionStockSlippageAdjustment(execFinalRes?.items ?? [], instanceId, optionStockLinkByOptionId),
    [execFinalRes, instanceId, optionStockLinkByOptionId],
  )

  const positionStatus = useMemo(
    () => computeInstancePositionStatus(executionsFinal),
    [executionsFinal],
  )

  const openEnd = useMemo(
    () => computeOpenEndDisplay(instance, executionsFinal, positionStatus),
    [instance, executionsFinal, positionStatus],
  )

  const riskProfile = useMemo(
    () =>
      computeInstanceRiskProfile(
        executionsFinal,
        structure ?? null,
        portfolioAccounts,
      ),
    [executionsFinal, structure, portfolioAccounts],
  )

  const summary = perfData?.summary ?? null

  const execDerivedNetPnl = useMemo(
    () => computeInstanceExecDerivedNetPnl(executionsFinal, linkedStockSlippage),
    [executionsFinal, linkedStockSlippage],
  )

  const summaryNetFallback =
    summary != null ? Number(summary.net_pnl) + linkedStockSlippage : null

  const displayNetPnl = execDerivedNetPnl ?? summaryNetFallback
  const underlying = underlyingCostSellOptUsd(executionsFinal)
  const capitalAtRisk = computeInstanceMaxRiskUsd(executionsFinal, underlying)
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

  if (!instance) return null

  return {
    instanceId,
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
    tradeCount: summary?.trade_count ?? 0,
  }
}
