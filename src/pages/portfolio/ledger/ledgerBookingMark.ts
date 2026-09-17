import type { Execution } from '@/types/positions'

export type LedgerBookingKind = 'exchange' | 'book' | 'mixed' | 'unreported'

export function ledgerBookingKind(execs: Execution[]): LedgerBookingKind {
  const types = execs.map(e => (e.transaction_type ?? '').trim())
  const named = types.filter(Boolean)
  if (named.length === 0) return 'unreported'
  const unique = new Set(named)
  const hasBook = unique.has('BookTrade')
  const hasExch = unique.has('ExchTrade')
  const hasOther = [...unique].some(t => t !== 'BookTrade' && t !== 'ExchTrade')
  const hasBlank = named.length !== types.length
  if (hasBook && (hasExch || hasOther || hasBlank)) return 'mixed'
  if (hasBook && unique.size === 1 && !hasBlank) return 'book'
  if (hasExch && unique.size === 1 && !hasBlank) return 'exchange'
  if (unique.size === 1 && !hasBlank) return 'exchange'
  return 'mixed'
}

export function ledgerBookingLabel(kind: LedgerBookingKind): string {
  if (kind === 'book') return 'BOOK'
  if (kind === 'mixed') return 'MIX'
  if (kind === 'unreported') return 'not reported'
  return 'Exch'
}

export function ledgerBookingKindForFill(ex: Execution): LedgerBookingKind {
  return ledgerBookingKind([ex])
}
