import type { Execution } from '@/types/positions'

type SideInput = string | null | undefined | Pick<Execution, 'side' | 'quantity' | 'qty'>

/** Human-readable option side from execution row or raw side/qty. */
export function sideLabel(sideOrExec: SideInput, quantity?: number | null): string {
  if (sideOrExec != null && typeof sideOrExec === 'object') {
    const ex = sideOrExec
    return sideLabel(ex.side, ex.quantity ?? ex.qty ?? null)
  }
  const side = sideOrExec
  const s = (side ?? '').toUpperCase()
  if (s === 'BUY' || s === 'BOT' || s === 'B') return 'Buy'
  if (s === 'SELL' || s === 'SLD' || s === 'S') return 'Sell'
  if (quantity != null && Number.isFinite(quantity)) {
    if (quantity > 0) return 'Buy'
    if (quantity < 0) return 'Sell'
  }
  return side?.trim() || '—'
}
