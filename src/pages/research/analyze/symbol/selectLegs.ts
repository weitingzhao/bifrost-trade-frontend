/**
 * Pure selector for "my legs on this name" — filters STK/OPT rows by symbol,
 * drops zero quantities, and orders stocks first then options (expiry ↑, strike ↑).
 *
 * Kept out of the component file so lint's fast-refresh rule does not fire and
 * the function is trivial to unit-test.
 */
import type { LivePositionRow } from '@/types/positions'

export interface SymbolLeg {
  key: string
  kind: 'STK' | 'OPT'
  qty: number
  avgCost: number | null
  price: number | null
  unrealized: number | null
  right?: 'C' | 'P'
  strike?: number
  expiry?: string
  contractKey?: string | null
  account?: string
}

export function selectLegs(rows: LivePositionRow[], symbol: string): SymbolLeg[] {
  const needle = symbol.trim().toUpperCase()
  if (!needle) return []
  const out: SymbolLeg[] = []
  for (const p of rows) {
    if ((p.symbol ?? '').toUpperCase() !== needle) continue
    const st = (p.secType ?? '').toUpperCase()
    if (st !== 'STK' && st !== 'OPT') continue
    const qty = p.position ?? 0
    if (!qty) continue
    const right = (p.right ?? '').toUpperCase()
    out.push({
      key: `${p.account_id}|${st}|${p.contract_key ?? p.symbol}`,
      kind: st as 'STK' | 'OPT',
      qty,
      avgCost: p.avgCost ?? null,
      price: p.price ?? null,
      unrealized: p.unrealized_pnl ?? null,
      right: right === 'C' || right === 'P' ? right : undefined,
      strike: p.strike,
      expiry: p.expiry ?? p.lastTradeDateOrContractMonth,
      contractKey: p.contract_key,
      account: p.account_id,
    })
  }
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'STK' ? -1 : 1
    if (a.kind === 'OPT') {
      const ax = (a.expiry ?? '').replace(/\D/g, '')
      const bx = (b.expiry ?? '').replace(/\D/g, '')
      if (ax !== bx) return ax < bx ? -1 : 1
      return (a.strike ?? 0) - (b.strike ?? 0)
    }
    return 0
  })
  return out
}
