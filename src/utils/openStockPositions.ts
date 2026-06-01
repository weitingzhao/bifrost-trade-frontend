import type { LivePositionRow } from '@/types/positions'

export interface OpenStockPositionMetrics {
  qty: number
  sideLabel: string
  lastPrice: number | null
  dailyPnl: number | null
  dailyPct: number | null
  sincePnl: number | null
  sincePct: number | null
  marketValue: number | null
}

/** Same formulas as Legacy Positions `buildOpenStockPositionRows`. */
export function computeOpenStockPositionMetrics(position: LivePositionRow): OpenStockPositionMetrics {
  const qty = Number(position.position)
  const lastPrice =
    position.price != null && Number.isFinite(Number(position.price)) ? Number(position.price) : null
  const avgCost =
    position.avgCost != null && Number.isFinite(Number(position.avgCost)) ? Number(position.avgCost) : null
  const prevClose =
    position.daily_prev_close != null && Number.isFinite(Number(position.daily_prev_close))
      ? Number(position.daily_prev_close)
      : null
  const sincePnl =
    position.unrealized_pnl != null && Number.isFinite(Number(position.unrealized_pnl))
      ? Number(position.unrealized_pnl)
      : null
  const sincePct =
    sincePnl != null && avgCost != null && avgCost !== 0 && Number.isFinite(qty)
      ? (sincePnl / Math.abs(avgCost * qty)) * 100
      : null
  const dailyPnl =
    lastPrice != null && prevClose != null && Number.isFinite(qty) ? (lastPrice - prevClose) * qty : null
  const dailyPct =
    dailyPnl != null && prevClose != null && prevClose !== 0
      ? ((lastPrice! - prevClose) / prevClose) * 100
      : null
  const marketValue =
    lastPrice != null && Number.isFinite(qty) ? qty * lastPrice : null

  return {
    qty,
    sideLabel: qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—',
    lastPrice,
    dailyPnl,
    dailyPct,
    sincePnl,
    sincePct,
    marketValue,
  }
}

export function groupStockPositionsByAccount(
  positions: LivePositionRow[],
): { accountId: string; rows: LivePositionRow[] }[] {
  const byAccount: Record<string, LivePositionRow[]> = {}
  for (const position of positions) {
    const accId = (position.account_id ?? '').trim() || '—'
    if (!byAccount[accId]) byAccount[accId] = []
    byAccount[accId].push(position)
  }
  return Object.keys(byAccount)
    .sort()
    .map((accountId) => ({ accountId, rows: byAccount[accountId] }))
}
