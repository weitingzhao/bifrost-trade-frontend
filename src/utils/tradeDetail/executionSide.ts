import type { Execution } from '@/types/positions'

/** BUY / BOT / B — Execution.side variants from IB / ledger. */
export function isBuySide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

/** SELL / SLD / S — Execution.side variants from IB / ledger. */
export function isSellSide(e: Execution): boolean {
  const s = (e.side ?? '').toUpperCase()
  return s === 'SELL' || s === 'SLD' || s === 'S'
}
