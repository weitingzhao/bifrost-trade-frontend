import type { IbPositionRow } from '@/types/monitor'

export function isLedgerFixedIncomeCategory(category: string): boolean {
  const n = category.trim().toLowerCase()
  if (!n || n === '—') return false
  return n.includes('fixed income') || n.includes('fix income')
}

export function isLedgerCashLikeCategory(category: string): boolean {
  const n = category.trim().toLowerCase()
  if (!n || n === '—') return false
  if (isLedgerFixedIncomeCategory(category)) return false
  return (
    n.includes('cash like') ||
    n.includes('cash-like') ||
    n.includes('cash equivalent') ||
    n.includes('money market')
  )
}

export function ibPositionMarketValue(pos: Pick<IbPositionRow, 'position' | 'price' | 'avgCost'>): number {
  const qty = Number(pos.position)
  if (!Number.isFinite(qty) || qty === 0) return 0
  const price =
    pos.price != null && Number.isFinite(Number(pos.price))
      ? Number(pos.price)
      : pos.avgCost != null && Number.isFinite(Number(pos.avgCost))
        ? Number(pos.avgCost)
        : 0
  return Math.abs(qty) * price
}
