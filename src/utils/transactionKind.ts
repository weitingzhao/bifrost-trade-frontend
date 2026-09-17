import type { AccountTransaction } from '@/types/trading'

/**
 * Kind is a reading of this page, not a field from IB.
 *
 * The broker labels three things — deposit, withdrawal, dividend — and
 * everything else arrives as `other`: 85 of 116 rows measured on DEV, 73%. One
 * bucket cannot answer for both a market-data subscription (a cost) and
 * securities-lending income, so Kind cuts the description into the six classes
 * the Owner ruled (decision C4, with `Interest` renamed `Financing` by F-T2) and
 * echoes the broker's own label for the three types it does name.
 *
 * The rules run in order and are printed on the page — a reader can check the
 * classification against the description in the same row.
 */
export type TransactionKind =
  | 'Data fee'
  | 'Lending'
  | 'Financing'
  | 'Tax'
  | 'Cancel'
  | 'Transfer'
  | 'Dividend'
  | 'Other'

/** Chip order: the six read from the description first, then the two echoes. */
export const KIND_NAMES: readonly TransactionKind[] = [
  'Data fee',
  'Lending',
  'Financing',
  'Tax',
  'Cancel',
  'Transfer',
  'Dividend',
  'Other',
]

/**
 * Printed on the page verbatim, so what the reader sees is the rule that ran.
 *
 * ` - US TAX` is in it because the prototype's `WITHHOLDING TAX` matches nothing
 * in this data: all 17 tax rows are IB's `… PER SHARE - US TAX` suffix, and
 * without the second alternative every one of them would fall through to
 * `Other`.
 */
export const KIND_RULE =
  'CANCEL* → Cancel · SYEP|MANAGED SECURITIES → Lending · ' +
  'CREDIT INT|DEBIT INT|BORROW FEES → Financing · WITHHOLDING TAX| - US TAX → Tax · ' +
  'W******|OPRA|CBOE|SNAPSHOT|ABCOPRANP → Data fee · ' +
  'deposit|withdrawal → Transfer · dividend → Dividend · else Other'

export const KIND_BLURB: Partial<Record<TransactionKind, string>> = {
  'Data fee': 'Market-data subscriptions — a cost',
  Lending: 'Securities-lending income — the opposite of a cost',
  Financing:
    'Margin financing, both directions: CREDIT INT earned, DEBIT INT and BORROW FEES paid. ' +
    'The class nets on purpose; the sign is coloured row by row.',
  Tax: 'Tax withheld at source on a distribution',
  Cancel: 'Reverses another row — sometimes named, sometimes not',
  Transfer: "The broker's own deposit and withdrawal labels",
  Dividend: "The broker's own dividend label",
  Other: 'Nothing above matched the description',
}

export function kindOf(tx: Pick<AccountTransaction, 'type' | 'description'>): TransactionKind {
  const d = (tx.description ?? '').toUpperCase()
  const t = (tx.type ?? '').toLowerCase()
  if (d.startsWith('CANCEL')) return 'Cancel'
  if (d.includes('SYEP') || d.includes('MANAGED SECURITIES')) return 'Lending'
  if (d.includes('CREDIT INT') || d.includes('DEBIT INT') || d.includes('BORROW FEES')) {
    return 'Financing'
  }
  if (d.includes('WITHHOLDING TAX') || d.includes(' - US TAX')) return 'Tax'
  if (
    d.includes('W******') ||
    d.includes('OPRA') ||
    d.includes('CBOE') ||
    d.includes('SNAPSHOT') ||
    d.includes('ABCOPRANP')
  ) {
    return 'Data fee'
  }
  if (t === 'deposit' || t === 'withdrawal') return 'Transfer'
  if (t === 'dividend') return 'Dividend'
  return 'Other'
}

/**
 * What a cancellation reverses, in the two states the data actually has.
 *
 * Three of the five measured cancellations carry a bracket, which names a
 * subscription and the month it covered — never a trade, and never an amount.
 * The other two are a bare `CANCELLATION` pointing at nothing. Saying so is
 * better than pairing them off by amount, which would guess (F-T3).
 */
export type CancelNote =
  | { state: 'named'; ref: string; period: string | null }
  | { state: 'unidentified' }
  | null

export function cancelNoteOf(tx: Pick<AccountTransaction, 'type' | 'description'>): CancelNote {
  if (kindOf(tx) !== 'Cancel') return null
  const raw = (tx.description ?? '').trim()
  const m = /^CANCEL\[([^\]]+)\]\s*(?:FOR\s+(.+))?$/i.exec(raw)
  if (!m) return { state: 'unidentified' }
  return { state: 'named', ref: m[1].trim(), period: m[2]?.trim() ?? null }
}
