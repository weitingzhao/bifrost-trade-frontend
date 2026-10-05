/**
 * The corporate-action feed's rows as events against the book — what kind, when,
 * how much, and whether an open leg is on the name — and how they are written.
 *
 * Shared because the Calendar's Corporate actions layer quotes the same
 * events in the same words (§14.2: moved out of `pages/portfolio/corporateActions`
 * when it became the second reader). The page's own panels are built on it.
 */
import { daysBetween } from '@/lib/isoDate'

export type CorporateActionKind = 'dividend' | 'split' | 'other'

export interface FeedRow {
  symbol: string
  action_type: string
  ex_date: string | null
  record_date: string | null
  payment_date: string | null
  ratio_from: number | null
  ratio_to: number | null
  amount: number | null
  currency?: string | null
  fetched_at?: string | null
}

export interface BookEvent {
  key: string
  symbol: string
  kind: CorporateActionKind
  /** yyyy-mm-dd, or null when the vendor did not date it. */
  exDate: string | null
  recordDate: string | null
  paymentDate: string | null
  /** Per share, on a dividend. */
  amount: number | null
  ratioFrom: number | null
  ratioTo: number | null
  /** Shares the book holds today — not what it held on the ex-date. */
  shares: number | null
  /**
   * `amount × shares`, on today's holding.
   *
   * Deliberately not called "received": the book's share count today is not
   * the count on the ex-date, and what actually landed is Transfer & Pay's
   * record. This is the size of the event against the book as it stands.
   */
  onTodaysHolding: number | null
  /** An open option leg on this name would be rewritten by it. */
  touchesAContract: boolean
  /** Days from today; negative is past. Null when the row carries no ex-date. */
  daysAway: number | null
}

function kindOf(actionType: string): CorporateActionKind {
  const t = actionType.trim().toLowerCase()
  if (t.includes('split')) return 'split'
  if (t.includes('dividend') || t.includes('distribution')) return 'dividend'
  return 'other'
}

export function buildBookEvents(input: {
  rows: readonly FeedRow[]
  sharesBySymbol: ReadonlyMap<string, number>
  /** Underlyings carrying an open option leg — those an event would reshape. */
  legSymbols: ReadonlySet<string>
  today: string
}): BookEvent[] {
  const out: BookEvent[] = []
  for (const r of input.rows) {
    const symbol = (r.symbol ?? '').trim().toUpperCase()
    if (!symbol) continue
    const exDate = r.ex_date ? r.ex_date.slice(0, 10) : null
    const shares = input.sharesBySymbol.get(symbol) ?? null
    const amount = r.amount ?? null
    out.push({
      key: `${symbol}|${r.action_type}|${exDate ?? '—'}|${amount ?? r.ratio_to ?? ''}`,
      symbol,
      kind: kindOf(r.action_type ?? ''),
      exDate,
      recordDate: r.record_date ? r.record_date.slice(0, 10) : null,
      paymentDate: r.payment_date ? r.payment_date.slice(0, 10) : null,
      amount,
      ratioFrom: r.ratio_from ?? null,
      ratioTo: r.ratio_to ?? null,
      shares,
      onTodaysHolding: amount == null || shares == null ? null : amount * shares,
      touchesAContract: input.legSymbols.has(symbol),
      daysAway: exDate ? daysBetween(input.today, exDate) : null,
    })
  }
  // Newest first: the reading is "what just happened", and the calendar sorts
  // the other way on its own.
  return out.sort((a, b) => (b.exDate ?? '').localeCompare(a.exDate ?? ''))
}

export function kindLabel(e: BookEvent): string {
  if (e.kind === 'split') {
    return e.ratioFrom != null && e.ratioTo != null ? `split ${e.ratioFrom} : ${e.ratioTo}` : 'split'
  }
  return e.kind
}

/**
 * A per-share distribution, at the precision the vendor states it.
 *
 * Rounding a six-place distribution to two places makes the row unreproducible: the reader
 * multiplies the printed figures and gets a different total from the one
 * beside them. Six places, trailing zeros trimmed, and the arithmetic holds.
 */
export function fmtPerShare(v: number): string {
  return `$${v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.00')}`
}

export function amountLabel(e: BookEvent): string {
  if (e.kind === 'split') {
    return e.ratioFrom != null && e.ratioTo != null ? `${e.ratioFrom} : ${e.ratioTo}` : '—'
  }
  return e.amount == null ? '—' : `${fmtPerShare(e.amount)} / sh`
}
