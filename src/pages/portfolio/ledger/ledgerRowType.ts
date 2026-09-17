import type { Execution } from '@/types/positions'

export type LedgerRowType = 'all' | 'exch' | 'book'

export const LEDGER_ROW_TYPE_TABS: { id: LedgerRowType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'exch', label: 'Trades' },
  { id: 'book', label: 'Book events' },
]

export function executionTransactionType(e: Execution): string {
  return (e.transaction_type ?? '').trim()
}

export function executionMatchesRowType(e: Execution, rowType: LedgerRowType): boolean {
  if (rowType === 'all') return true
  const t = executionTransactionType(e)
  if (!t) return false
  if (rowType === 'exch') return t === 'ExchTrade'
  return t === 'BookTrade'
}

/** Rows whose source did not send `transaction_type` — they only appear in All. */
export function countUnreportedTransactionType(rows: Execution[]): number {
  let n = 0
  for (const e of rows) {
    if (!executionTransactionType(e)) n += 1
  }
  return n
}

export function unreportedTypeNote(count: number): string {
  if (count <= 0) return ''
  return `${count} row${count === 1 ? '' : 's'} — not reported by this source`
}
