import type { PerformanceSummary, RawExecution } from '@/types/trading'

export interface InstanceMetrics {
  netPnl: number
  commission: number
  tradeCount: number
  underlyingCost: number | null
  holdDays: number
  netPnlPerDay: number | null
  annualPct: number | null
  returnPct: number | null
}

function isSellSide(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'SELL' || s === 'SLD'
}

export function computeUnderlyingCost(executions: RawExecution[]): number | null {
  const sellOpts = executions.filter(
    (e) => e.sec_type === 'OPT' && isSellSide(e.side) && e.strike != null,
  )
  if (sellOpts.length === 0) return null
  return sellOpts.reduce((sum, e) => sum + (e.strike! * Math.abs(e.quantity) * 100), 0)
}

export function computeHoldDays(openedAtEpoch: number | null): number {
  if (openedAtEpoch == null) return 1
  const days = Math.floor((Date.now() / 1000 - openedAtEpoch) / 86_400)
  return Math.max(1, days)
}

export function computeInstanceMetrics(
  summary: PerformanceSummary,
  executions: RawExecution[],
  openedAtEpoch: number | null,
): InstanceMetrics {
  const netPnl = summary.net_pnl
  const commission = summary.total_commission
  const tradeCount = summary.trade_count
  const underlyingCost = computeUnderlyingCost(executions)
  const holdDays = computeHoldDays(openedAtEpoch)

  const netPnlPerDay = holdDays > 0 ? netPnl / holdDays : null

  const annualPct =
    underlyingCost != null && underlyingCost > 0
      ? (netPnl / underlyingCost) * (365.25 / holdDays) * 100
      : null

  const returnPct =
    underlyingCost != null && underlyingCost > 0
      ? (netPnl / underlyingCost) * 100
      : null

  return { netPnl, commission, tradeCount, underlyingCost, holdDays, netPnlPerDay, annualPct, returnPct }
}
