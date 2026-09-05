/**
 * Rows for "Obligations & room": one per account × symbol, joining what the
 * options demand (exposure) with what the account holds against it (cover).
 *
 * The union matters in both directions. A symbol with short options and no
 * shares must appear with every call in the naked column; a symbol with shares
 * and no options must appear too, because its spare shares are the room the
 * Owner asks about. Neither side is allowed to hide the other.
 */
import type { LivePositionRow } from '@/types/positions'
import type { SymbolExposure } from './assignmentExposure'
import type { CoverRow } from './bookVsBase'
import type { ObligationsRow } from './obligationsRoom'
import { computeIndependentHoldingMetrics } from './independentHoldings'

const keyOf = (accountId: string, symbol: string) => `${accountId}\x00${symbol}`

export function buildObligationsRows(
  exposure: readonly SymbolExposure[],
  cover: readonly CoverRow[],
  coreStocks: readonly LivePositionRow[],
): ObligationsRow[] {
  const rows = new Map<string, ObligationsRow>()
  const blank = (accountId: string, symbol: string): ObligationsRow => ({
    accountId,
    symbol,
    shortPuts: 0,
    cashIfAssigned: 0,
    coveredCalls: 0,
    nakedCalls: 0,
    sharesHeld: 0,
    sharesBacking: 0,
    sharesSpare: 0,
    moreCalls: 0,
    avgCost: null,
    price: null,
    marketValue: null,
    dailyPnl: null,
    totalPnl: null,
  })
  const get = (accountId: string, symbol: string) => {
    const k = keyOf(accountId, symbol)
    let r = rows.get(k)
    if (!r) {
      r = blank(accountId, symbol)
      rows.set(k, r)
    }
    return r
  }

  for (const e of exposure) {
    const r = get(e.accountId, e.underlying)
    r.shortPuts += e.shortPutContracts
    r.cashIfAssigned += e.putAssignmentCash
    r.coveredCalls += e.coveredCallContracts
    r.nakedCalls += e.nakedCallContracts
  }
  for (const c of cover) {
    const r = get(c.accountId, c.symbol)
    r.sharesHeld += c.held
    r.sharesBacking += c.backing
    r.sharesSpare += c.spare
    r.moreCalls += c.moreCalls
    if (c.price != null) r.price = c.price
  }
  // Cost and P&L come from the stock rows themselves; several lots of one
  // symbol in one account sum, and an unpriced lot leaves its value unknown.
  for (const p of coreStocks) {
    const symbol = (p.symbol ?? '').toUpperCase()
    const accountId = (p.account_id ?? '').trim()
    if (!symbol) continue
    const k = keyOf(accountId, symbol)
    const r = rows.get(k)
    if (!r) continue
    const m = computeIndependentHoldingMetrics(p)
    if (p.avgCost != null && Number.isFinite(Number(p.avgCost))) r.avgCost = Number(p.avgCost)
    if (m.marketValue != null) r.marketValue = (r.marketValue ?? 0) + m.marketValue
    if (m.dailyPnl != null) r.dailyPnl = (r.dailyPnl ?? 0) + m.dailyPnl
    if (m.totalPnl != null) r.totalPnl = (r.totalPnl ?? 0) + m.totalPnl
  }
  return [...rows.values()]
}
