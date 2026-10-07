/**
 * What the book cannot account for — and what it would take to say why.
 *
 * The design writes this page as one identity: Day P&L = Δ + Γ + vega + θ +
 * Unexplained, where Unexplained is *defined* as the difference, not measured.
 * The four attributions read the nightly book snapshot (api 0.12.0, TD-138):
 * each session against the session before it, from the positions, marks and
 * vendor Greeks as they stood at the prior close. A session whose prior
 * session was not captured has no reading — it is never differenced against an
 * older day (SNAPSHOT-SPEC §2).
 *
 * What the book can see on its own are named leaks: rows in one source that
 * never reached the one Performance counts, cash that moved with no position
 * behind it, and lines carrying no mark at all. Each is a lead with a page that
 * settles it — which is what the design asks the band to be. None of them is
 * asserted as the answer.
 */
import { ledgerOptionExecutionCashFlowSigned } from '@/utils/ledger/performanceUtils'
import { kindOf } from '@/utils/transactionKind'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'
import type { AccountTransaction } from '@/types/trading'
import type { ByDayRangeData, PerformanceDayPnLCell } from '@/types/trading'
import type { AttributionSession, AttributionSums, PnlAttributionResponse } from '@/lib/schemas/snapshots'

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

/** What the attribution band says when it has no reading, and why. */
export const PNL_UNRECORDED = {
  notServed:
    'This API does not serve the daily snapshot yet (trade-api 0.12.0 adds GET /portfolio/pnl-attribution), so Δ, Γ, vega and θ have no reading here — and neither does the difference they define.',
  noPair:
    'No session in this window has its prior session on file. The snapshot is taken nightly from 05OCT26; a session is read against the one before it, never against an older day.',
  heldBook:
    'Read from the nightly snapshot: the book as it stood at each prior close, marked at both closes, split by the vendor Greeks of the prior close. Fills and closes inside a session are not in it — their P&L is Performance’s.',
  symbol:
    'these rows carry no symbol — account-level cash, not about any one name, so they cannot be placed against one.',
} as const

/**
 * The five lines the design stacks, and the formula each reads from the
 * snapshot. Units are the vendor's: vega per vol point, theta per calendar day.
 */
export const ATTRIBUTION_LINES: {
  key: 'delta_pnl' | 'gamma_pnl' | 'vega_pnl' | 'theta_pnl' | 'unexplained'
  label: string
  what: string
  formula: string
}[] = [
  {
    key: 'delta_pnl',
    label: 'Δ · direction',
    what: 'the move times the position delta — the shares plus the deltas of the legs, net',
    formula: 'qty × delta(t−1) × Δspot',
  },
  {
    key: 'gamma_pnl',
    label: 'Γ · convexity',
    what: 'what the move did beyond delta',
    formula: 'qty × ½ gamma(t−1) × Δspot²',
  },
  {
    key: 'vega_pnl',
    label: 'Vega · vol marks',
    what: 'IV re-marks on the open legs',
    formula: 'qty × vega(t−1) × ΔIV in points',
  },
  {
    key: 'theta_pnl',
    label: 'Θ · carry',
    what: 'decay collected over the window',
    formula: 'qty × theta(t−1) × calendar days',
  },
  {
    key: 'unexplained',
    label: 'Unexplained',
    what: 'everything the four cannot account for — defined as the difference, never measured',
    formula: 'held P&L − (Δ + Γ + vega + θ)',
  },
]

/** The sessions of a window the snapshot could read, and the ones it could not. */
export function attributionCoverage(attr: Pick<PnlAttributionResponse, 'sessions'> | null | undefined): {
  read: AttributionSession[]
  noPrior: AttributionSession[]
} {
  const sessions = attr?.sessions ?? []
  return {
    read: sessions.filter((s) => s.status === 'ok'),
    noPrior: sessions.filter((s) => s.status === 'no_prior_snapshot'),
  }
}

/** Δ + Γ + vega + θ over the fully read rows. */
export function explainedOf(t: Pick<AttributionSums, 'delta_pnl' | 'gamma_pnl' | 'vega_pnl' | 'theta_pnl'>): number {
  return t.delta_pnl + t.gamma_pnl + t.vega_pnl + t.theta_pnl
}

/**
 * The Greeks cell of a row group: a missing Greek is grey (no reading, §11.3), a
 * degraded one amber, vendor values neutral; a group with no option leg is shares.
 */
export function greeksTag(q: { vendor: number; degraded: number; missing: number }): {
  label: string
  variant: 'neutral' | 'warning'
  title: string
} {
  if (q.missing > 0) {
    return { label: `MISSING ${q.missing}`, variant: 'neutral', title: 'The vendor had no Greeks at the prior close: the four parts of these rows are not read.' }
  }
  if (q.degraded > 0) {
    return { label: `DEG ${q.degraded}`, variant: 'warning', title: 'Greeks present but not that session’s vendor close — read, and marked so.' }
  }
  if (q.vendor > 0) return { label: 'VENDOR', variant: 'neutral', title: 'The vendor’s Greeks of the prior close.' }
  return { label: 'SHARES', variant: 'neutral', title: 'Shares only: delta 1, no Greek to read.' }
}

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
    const symbol = extractUnderlyingRootSymbol(e.symbol) || '—'
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
  /** The name the cash is about (core 0.25.3); null when the rows carry none. */
  symbol: string | null
  n: number
  amount: number
}

/**
 * Cash that moved in the window, by the Kind Transfer & Pay reads it as — that
 * page's own classification, not a second one (§14.2). The broker labels three
 * things and files the rest under `other`, which cannot answer for both a
 * market-data subscription and lending income; Kind cuts the description, so a
 * data fee and a withheld tax arrive here as themselves.
 *
 * Deposits, withdrawals and transfers are the Owner's own money and are left
 * out: returns are ruled net of external cash flow (§14.5), so they were never
 * part of the P&L this page takes apart.
 *
 * Grouped by kind × name since core 0.25.3 returns the row's symbol: a
 * dividend and its withholding land against the name they are about; only
 * account-level cash stays nameless.
 */
export function cashInWindow(
  transactions: readonly AccountTransaction[],
  sinceSec: number,
  untilSec: number,
): CashGroup[] {
  const byType = new Map<string, CashGroup>()
  for (const t of transactions) {
    const broker = (t.type ?? '').trim().toLowerCase()
    if (broker === 'deposit' || broker === 'withdrawal') continue
    const ts = Number(t.ts)
    if (!Number.isFinite(ts) || ts < sinceSec || ts > untilSec) continue
    const type = kindOf(t)
    if (type === 'Transfer') continue
    const symbol = t.symbol?.trim() ? t.symbol.trim().toUpperCase() : null
    const key = `${type}|${symbol ?? ''}`
    const group = byType.get(key) ?? { type, symbol, n: 0, amount: 0 }
    group.n += 1
    group.amount += Number(t.amount) || 0
    byType.set(key, group)
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
      toLabel: 'reconcile → Ledger',
    })
  }

  for (const c of input.cash) {
    leads.push({
      key: `cash:${c.type}:${c.symbol ?? ''}`,
      symbol: c.symbol,
      amount: c.amount,
      n: c.n,
      cause: `${c.n} cash ${c.n === 1 ? 'row' : 'rows'} classified ${c.type}${c.symbol ? '' : ` — ${PNL_UNRECORDED.symbol}`}`,
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
