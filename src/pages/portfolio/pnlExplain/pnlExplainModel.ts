/**
 * What the book cannot account for — and what it would take to say why.
 *
 * The design writes this page as one identity: Day P&L = Δ + Γ + vega + θ +
 * Unexplained, where Unexplained is *defined* as the difference, not measured.
 * Taking that difference needs the four attributions, and the four need a
 * per-day snapshot of positions, marks and vendor Greeks that nothing stores
 * yet. So the difference is not taken here, and the page says so rather than
 * printing a residual it cannot stand behind.
 *
 * What the book *can* see are named leaks: rows in one source that never
 * reached the one Performance counts, cash that moved with no position behind
 * it, and lines carrying no mark at all. Each is a lead with a page that
 * settles it — which is what the design asks the band to be. None of them is
 * asserted as the answer.
 */
import { ledgerOptionExecutionCashFlowSigned } from '@/utils/ledger/performanceUtils'
import type { Execution } from '@/types/positions'
import type { AccountTransaction } from '@/types/trading'
import type { ByDayRangeData, PerformanceDayPnLCell } from '@/types/trading'

/** How loudly a lead reads: amber past the threshold, grey when it has no amount. */
export type PnlLeadReading = 'worth a look' | 'inside tolerance' | 'no reading'

export interface PnlLead {
  key: string
  /** Null when the source row carries no symbol — cash flow does not. */
  symbol: string | null
  /** Null when the leak is a count, not an amount. */
  amount: number | null
  n: number
  cause: string
  reading: PnlLeadReading
  /** The page that confirms or rules it out. */
  to: string | null
  toLabel: string
}

/** Amber past this share of the window's own P&L. Below it, a residual is normal. */
export const PNL_UNEXPLAINED_THRESHOLD = 0.05

/** The readings this page cannot make, and what would have to exist first. */
export const PNL_UNRECORDED = {
  snapshot:
    'The four attributions need a per-day snapshot of positions, marks and vendor Greeks. Nothing stores one, so Δ, Γ, vega and θ have no reading — and neither does the difference they define.',
  hypothesis:
    'Judging a thesis needs both that snapshot and a store of hypotheses with what each should earn from. Neither exists yet.',
  symbol:
    'Cash rows carry an account and a description, never a symbol, so these cannot be placed against a name.',
} as const

const ASSET_CLASSES = ['opt', 'stocks', 'fixed_income', 'cash_like'] as const

function sumCells(byDay: Record<string, PerformanceDayPnLCell> | undefined, since: string, until: string): number {
  let sum = 0
  for (const [day, cell] of Object.entries(byDay ?? {})) {
    if (day < since || day > until) continue
    sum += (cell.realized || 0) + (cell.unrealized || 0)
  }
  return sum
}

/**
 * The window's P&L, as Performance computes it — realized plus unrealized over
 * the four asset classes it keeps apart. This page quotes that figure; it does
 * not build a second one (§14.2). `stock` is Performance's own alias of
 * `stocks` and is left out so the same day is not counted twice.
 */
export function windowBookPnl(byDay: ByDayRangeData | undefined, since: string, until: string): number {
  if (!byDay) return 0
  return ASSET_CLASSES.reduce((sum, k) => sum + sumCells(byDay[k], since, until), 0)
}

function execKey(e: Execution): string {
  return `${e.account_executions_id ?? ''}|${e.exec_id ?? ''}|${e.account_id ?? ''}`
}

function underlyingOf(e: Execution): string {
  return (e.symbol ?? '').trim().toUpperCase().split(/\s+/)[0] ?? ''
}

export interface BookGapRow {
  symbol: string
  n: number
  /** Priced option rows — the only ones that carry cash, and so the only ones summed. */
  priced: number
  amount: number
}

/**
 * Fills the canonical source has and the performance book does not, per
 * underlying. A zero-price row is a combo wrapper or a shell, so it is counted
 * but cannot carry an amount — the amount only sums the priced ones.
 */
export function bookGapFills(canonical: readonly Execution[], book: readonly Execution[]): BookGapRow[] {
  const inBook = new Set(book.map(execKey))
  const bySymbol = new Map<string, BookGapRow>()
  for (const e of canonical) {
    if (inBook.has(execKey(e))) continue
    const symbol = underlyingOf(e) || '—'
    const row = bySymbol.get(symbol) ?? { symbol, n: 0, priced: 0, amount: 0 }
    row.n += 1
    // A combo (BAG) row is the wrapper around its legs: it carries a price but
    // no cash of its own, and summing it would count the legs twice.
    if ((Number(e.price) || 0) !== 0 && (e.sec_type ?? '').toUpperCase() === 'OPT') {
      row.priced += 1
      row.amount += ledgerOptionExecutionCashFlowSigned(e)
    }
    bySymbol.set(symbol, row)
  }
  return [...bySymbol.values()].sort((a, b) => b.priced - a.priced || Math.abs(b.amount) - Math.abs(a.amount))
}

export interface CashGroup {
  type: string
  n: number
  amount: number
}

/**
 * Cash that moved in the window, by the type Transfer & Pay classifies it as.
 * Deposits and withdrawals are the Owner's own money and are excluded: returns
 * are ruled net of external cash flow (§14.5), so they were never part of the
 * P&L this page takes apart.
 */
export function cashInWindow(
  transactions: readonly AccountTransaction[],
  sinceSec: number,
  untilSec: number,
): CashGroup[] {
  const byType = new Map<string, CashGroup>()
  for (const t of transactions) {
    const type = (t.type ?? '').trim().toLowerCase()
    if (type === 'deposit' || type === 'withdrawal') continue
    const ts = Number(t.ts)
    if (!Number.isFinite(ts) || ts < sinceSec || ts > untilSec) continue
    const group = byType.get(type) ?? { type: type || 'unclassified', n: 0, amount: 0 }
    group.n += 1
    group.amount += Number(t.amount) || 0
    byType.set(type, group)
  }
  return [...byType.values()].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
}

function readingFor(amount: number | null, windowPnl: number): PnlLeadReading {
  if (amount == null) return 'no reading'
  if (Math.abs(windowPnl) <= 0) return 'inside tolerance'
  return Math.abs(amount) > Math.abs(windowPnl) * PNL_UNEXPLAINED_THRESHOLD ? 'worth a look' : 'inside tolerance'
}

/**
 * Every lead, in the order a reader should work them: the ones carrying an
 * amount first, largest first, then the ones that are only a count.
 */
export function pnlLeads(input: {
  gaps: readonly BookGapRow[]
  cash: readonly CashGroup[]
  unpricedLegs: number
  windowPnl: number
}): PnlLead[] {
  const leads: PnlLead[] = []

  for (const g of input.gaps) {
    const amount = g.priced > 0 ? g.amount : null
    leads.push({
      key: `gap:${g.symbol}`,
      symbol: g.symbol,
      amount,
      n: g.n,
      cause:
        g.priced > 0
          ? `${g.priced} of ${g.n} rows are priced option fills — a fill the performance book never took in, or a copy of one it already has`
          : `${g.n} ${g.n === 1 ? 'row' : 'rows'} the performance book never took in, none of them a priced option fill — combo wrappers, which carry no cash of their own`,
      reading: readingFor(amount, input.windowPnl),
      to: '/portfolio/ledger',
      toLabel: 'reconcile → Trade Ledger',
    })
  }

  for (const c of input.cash) {
    leads.push({
      key: `cash:${c.type}`,
      symbol: null,
      amount: c.amount,
      n: c.n,
      cause: `${c.n} cash ${c.n === 1 ? 'row' : 'rows'} classified ${c.type} — ${PNL_UNRECORDED.symbol}`,
      reading: readingFor(c.amount, input.windowPnl),
      to: '/portfolio/transfer',
      toLabel: 'Transfer & Pay →',
    })
  }

  if (input.unpricedLegs > 0) {
    leads.push({
      key: 'unpriced',
      symbol: null,
      amount: null,
      n: input.unpricedLegs,
      cause: `${input.unpricedLegs} short ${input.unpricedLegs === 1 ? 'leg carries' : 'legs carry'} no mark, so whatever they did today is in no figure on this page`,
      reading: 'no reading',
      to: '/portfolio/positions',
      toLabel: 'the legs → Positions',
    })
  }

  return leads.sort((a, b) => {
    if ((a.amount == null) !== (b.amount == null)) return a.amount == null ? 1 : -1
    return Math.abs(b.amount ?? 0) - Math.abs(a.amount ?? 0)
  })
}

/** What the leads add up to — the amount ones only; a count cannot be summed. */
export function leadsTotal(leads: readonly PnlLead[]): { amount: number; withAmount: number; countOnly: number } {
  let amount = 0
  let withAmount = 0
  let countOnly = 0
  for (const l of leads) {
    if (l.amount == null) countOnly += 1
    else {
      amount += l.amount
      withAmount += 1
    }
  }
  return { amount, withAmount, countOnly }
}
