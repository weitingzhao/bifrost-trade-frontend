import type { Execution } from '@/types/positions'

export type LedgerBookingKind = 'exchange' | 'book' | 'book_expired' | 'book_assigned' | 'mixed' | 'unreported'

function ymd(raw: string | null | undefined): string | null {
  const compact = (raw ?? '').trim().replace(/-/g, '').slice(0, 8)
  if (!/^\d{8}$/.test(compact)) return null
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
}

function isStk(ex: Execution): boolean {
  return (ex.sec_type ?? '').toUpperCase() === 'STK'
}

function isOpt(ex: Execution): boolean {
  return (ex.sec_type ?? '').toUpperCase() === 'OPT'
}

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005
}

/** Same account, same underlying, same trade date, stock price equals the option strike. */
export function hasAssignmentStockFill(opt: Execution, stockFills: Execution[]): boolean {
  const strike = Number(opt.strike)
  if (!Number.isFinite(strike)) return false
  const day = ymd(opt.trade_date)
  const acct = (opt.account_id ?? '').trim()
  const sym = (opt.symbol ?? '').trim().toUpperCase()
  if (!day || !acct || !sym) return false
  return stockFills.some(s => {
    if (!isStk(s)) return false
    if ((s.account_id ?? '').trim() !== acct) return false
    if ((s.symbol ?? '').trim().toUpperCase() !== sym) return false
    if (ymd(s.trade_date) !== day) return false
    return near(Number(s.price) || 0, strike)
  })
}

export function classifyBookTradeFill(
  ex: Execution,
  stockFills: Execution[],
): 'expired' | 'assigned' | 'book' | null {
  if ((ex.transaction_type ?? '').trim() !== 'BookTrade') return null
  if (!isOpt(ex)) return 'book'
  const price = Number(ex.price) || 0
  const expiryDay = ymd(ex.expiry)
  const tradeDay = ymd(ex.trade_date)
  const expiredShape = near(price, 0) && expiryDay != null && tradeDay != null && expiryDay === tradeDay
  if (!expiredShape) return 'book'
  if (hasAssignmentStockFill(ex, stockFills)) return 'assigned'
  return 'expired'
}

export function ledgerBookingKind(execs: Execution[], stockFills: Execution[] = []): LedgerBookingKind {
  const types = execs.map(e => (e.transaction_type ?? '').trim())
  const named = types.filter(Boolean)
  if (named.length === 0) return 'unreported'
  const unique = new Set(named)
  const hasBook = unique.has('BookTrade')
  const hasExch = unique.has('ExchTrade')
  const hasOther = [...unique].some(t => t !== 'BookTrade' && t !== 'ExchTrade')
  const hasBlank = named.length !== types.length
  if (hasBook && (hasExch || hasOther || hasBlank)) return 'mixed'
  if (hasBook && unique.size === 1 && !hasBlank) {
    const subtypes = new Set(
      execs.map(e => classifyBookTradeFill(e, stockFills)).filter((s): s is 'expired' | 'assigned' | 'book' => s != null),
    )
    if (subtypes.size === 1 && subtypes.has('expired')) return 'book_expired'
    if (subtypes.size === 1 && subtypes.has('assigned')) return 'book_assigned'
    return 'book'
  }
  if (hasExch && unique.size === 1 && !hasBlank) return 'exchange'
  if (unique.size === 1 && !hasBlank) return 'exchange'
  return 'mixed'
}

export function ledgerBookingLabel(kind: LedgerBookingKind): string {
  if (kind === 'book') return 'BOOK'
  if (kind === 'book_expired') return 'BOOK · expired'
  if (kind === 'book_assigned') return 'BOOK · assigned'
  if (kind === 'mixed') return 'MIX'
  if (kind === 'unreported') return 'not reported by this source'
  return ''
}

export function ledgerBookingKindForFill(ex: Execution, stockFills: Execution[] = []): LedgerBookingKind {
  return ledgerBookingKind([ex], stockFills)
}
