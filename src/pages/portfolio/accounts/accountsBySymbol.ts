/**
 * Every symbol the base holds, as a table rather than a ring.
 *
 * Twelve holdings drawn as twelve slices read as a colour wheel: you cannot
 * tell the third-largest from the fourth, and the ordering — the thing worth
 * knowing — is exactly what a ring throws away. The table sorts by value and
 * keeps the share.
 *
 * The mark and the day change come from the same helper the Stock positions
 * table below uses, so the two never quote the same symbol differently.
 *
 * A symbol that holds a position but produces no row is named on its own line.
 * On DEV that is six option underlyings with no stock leg and no option quote:
 * nothing in this panel represents them, and a slice that is not there looks
 * like a holding that is not there.
 */
import { computeStockPositionRowMetrics } from '@/utils/accountsStockPositions'
import { classifyStockBucket, type StockBucket } from '@/utils/positionsGrouping'
import type { LivePositionRow } from '@/types/positions'
import type { DailyBenchmark, QuoteItem } from '@/types/market'

export interface SymbolHoldingRow {
  symbol: string
  bucket: StockBucket
  quantity: number
  /** The one mark this page quotes for the symbol, everywhere it appears. */
  mark: number
  value: number
  shareOfNetLiq: number | null
  /** Day change against the value the holding started the day at, or null with no reading. */
  dayPct: number | null
  accountIds: string[]
}

export interface BySymbolReading {
  rows: SymbolHoldingRow[]
  /** Symbols holding a position that no row in this panel represents. */
  unrepresented: string[]
}

function qtyOf(pos: LivePositionRow): number {
  const n = Number(pos.position)
  return Number.isFinite(n) ? n : 0
}

export function buildBySymbolRows({
  stocks,
  allPositions,
  quotesBySymbol,
  benchBySymbol,
  totalNetLiq,
}: {
  stocks: readonly LivePositionRow[]
  /** Every line in scope, options included: the check for what has no row runs over all of them. */
  allPositions: readonly LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  totalNetLiq: number
}): BySymbolReading {
  const bySymbol = new Map<
    string,
    {
      bucket: StockBucket
      quantity: number
      mark: number | null
      value: number
      dayUsd: number
      hasDay: boolean
      accounts: Set<string>
    }
  >()

  for (const pos of stocks) {
    const qty = qtyOf(pos)
    if (qty === 0) continue
    const symbol = (pos.symbol ?? '?').toUpperCase()
    const m = computeStockPositionRowMetrics(pos, quotesBySymbol[symbol], benchBySymbol[symbol])

    const entry =
      bySymbol.get(symbol) ??
      {
        bucket: classifyStockBucket(pos.category),
        quantity: 0,
        mark: null,
        value: 0,
        dayUsd: 0,
        hasDay: false,
        accounts: new Set<string>(),
      }
    entry.quantity += qty
    if (m.currPrice != null) entry.mark = m.currPrice
    if (m.totalMarket != null) entry.value += m.totalMarket
    if (m.dailyUsd != null) {
      entry.dayUsd += m.dailyUsd
      entry.hasDay = true
    }
    if (pos.account_id) entry.accounts.add(pos.account_id)
    bySymbol.set(symbol, entry)
  }

  const rows: SymbolHoldingRow[] = [...bySymbol.entries()]
    .filter(([, e]) => e.mark != null)
    .map(([symbol, e]) => {
      const openValue = e.value - e.dayUsd
      return {
        symbol,
        bucket: e.bucket,
        quantity: e.quantity,
        mark: e.mark as number,
        value: e.value,
        shareOfNetLiq: totalNetLiq > 0 ? (e.value / totalNetLiq) * 100 : null,
        dayPct: e.hasDay && openValue !== 0 ? (e.dayUsd / Math.abs(openValue)) * 100 : null,
        accountIds: [...e.accounts].sort(),
      }
    })
    .sort((a, b) => b.value - a.value)

  const represented = new Set(rows.map((r) => r.symbol))
  const unrepresented = new Set<string>()
  for (const pos of allPositions) {
    if (qtyOf(pos) === 0) continue
    const symbol = (pos.symbol ?? '?').toUpperCase()
    if (!represented.has(symbol)) unrepresented.add(symbol)
  }

  return { rows, unrepresented: [...unrepresented].sort() }
}

export function unrepresentedNote(symbols: readonly string[]): string {
  const n = symbols.length
  return `${n} ${n === 1 ? 'symbol holds' : 'symbols hold'} a position that nothing above represents (${symbols.join(' · ')}) — option legs the broker sent no quote for, so no value can be put on them. They are named here rather than left out: a slice that is not there looks like a holding that is not there.`
}
