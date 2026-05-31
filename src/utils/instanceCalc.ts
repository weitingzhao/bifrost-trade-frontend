import type { PerformanceSummary, RawExecution } from '@/types/trading'

export type PositionStatus = 'no_fills' | 'open' | 'closed'

export interface InstanceMetrics {
  netPnl: number
  commission: number
  tradeCount: number
  underlyingCost: number | null
  holdDays: number
  netPnlPerDay: number | null
  annualPct: number | null
  returnPct: number | null
  positionStatus: PositionStatus
}

function isSellSide(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}

function isBuySide(side: string): boolean {
  const s = side.toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

/**
 * Compute position status by netting buy/sell quantities per contract.
 * Legacy logic: group OPT executions by contract_key|strike, net buy - sell;
 * if any contract has |net_qty| > 0 → open; all flat → closed; no fills → no_fills.
 */
export function computePositionStatus(executions: RawExecution[]): PositionStatus {
  if (executions.length === 0) return 'no_fills'

  const groups = new Map<string, number>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const strike = e.strike ?? 0
    const right = (e.option_right ?? '').toUpperCase().charAt(0)
    const expiry = (e.expiry ?? '').replace(/\D/g, '').slice(0, 8)
    const symbol = (e.symbol ?? '').toUpperCase().split(/\s/)[0] || ''
    const key = e.contract_key ?? `${symbol}|${expiry}|${strike}|${right}`

    const qty = Math.abs(e.quantity)
    if (qty < 1e-9) continue

    const prev = groups.get(key) ?? 0
    if (isBuySide(e.side)) {
      groups.set(key, prev + qty)
    } else if (isSellSide(e.side)) {
      groups.set(key, prev - qty)
    }
  }

  if (groups.size === 0) {
    const hasAny = executions.length > 0
    return hasAny ? 'closed' : 'no_fills'
  }

  for (const netQty of groups.values()) {
    if (Math.abs(netQty) >= 1e-9) return 'open'
  }
  return 'closed'
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
  const positionStatus = computePositionStatus(executions)

  const netPnlPerDay = holdDays > 0 ? netPnl / holdDays : null

  const annualPct =
    underlyingCost != null && underlyingCost > 0
      ? (netPnl / underlyingCost) * (365.25 / holdDays) * 100
      : null

  const returnPct =
    underlyingCost != null && underlyingCost > 0
      ? (netPnl / underlyingCost) * 100
      : null

  return { netPnl, commission, tradeCount, underlyingCost, holdDays, netPnlPerDay, annualPct, returnPct, positionStatus }
}
