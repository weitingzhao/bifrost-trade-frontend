import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import {
  classifyBookTradeFill,
  ledgerBookingKind,
  ledgerBookingLabel,
} from './ledgerBookingMark'

function opt(partial: Partial<Execution>): Execution {
  return {
    account_executions_id: 1,
    account_id: 'A1',
    contract_key: 'ZZZ  240119P00050000',
    symbol: 'ZZZ',
    sec_type: 'OPT',
    side: 'Sell',
    qty: 1,
    quantity: 1,
    price: 0,
    time: 1_700_000_000,
    trade_date: '2024-01-19',
    expiry: '20240119',
    strike: 50,
    transaction_type: 'BookTrade',
    ...partial,
  } as Execution
}

function stk(partial: Partial<Execution>): Execution {
  return {
    account_executions_id: 2,
    account_id: 'A1',
    contract_key: 'ZZZ',
    symbol: 'ZZZ',
    sec_type: 'STK',
    side: 'Buy',
    qty: 100,
    quantity: 100,
    price: 50,
    time: 1_700_000_000,
    trade_date: '2024-01-19',
    transaction_type: 'ExchTrade',
    ...partial,
  } as Execution
}

describe('ledgerBookingKind', () => {
  it('leaves ExchTrade unmarked', () => {
    expect(ledgerBookingKind([opt({ transaction_type: 'ExchTrade', price: 1.25 })])).toBe('exchange')
    expect(ledgerBookingLabel('exchange')).toBe('')
  })

  it('marks empty transaction_type as not reported by this source', () => {
    expect(ledgerBookingKind([opt({ transaction_type: null }), opt({ transaction_type: '' })])).toBe(
      'unreported',
    )
    expect(ledgerBookingLabel('unreported')).toBe('not reported by this source')
  })

  it('marks a zero-price expiry BookTrade with no strike stock as BOOK · expired', () => {
    expect(classifyBookTradeFill(opt({}), [])).toBe('expired')
    expect(ledgerBookingKind([opt({})], [])).toBe('book_expired')
    expect(ledgerBookingLabel('book_expired')).toBe('BOOK · expired')
  })

  it('marks BOOK · assigned when a same-day stock fill sits at the strike (no live DEV row)', () => {
    const assigned = opt({})
    const share = stk({})
    expect(classifyBookTradeFill(assigned, [share])).toBe('assigned')
    expect(ledgerBookingKind([assigned], [share])).toBe('book_assigned')
    expect(ledgerBookingLabel('book_assigned')).toBe('BOOK · assigned')
  })

  it('finds the assignment when the option symbol is the OCC string Flex writes', () => {
    // Flex puts the full OCC string in `symbol`; the share fill says just the root.
    const occ = opt({ symbol: 'ZZZ   240119P00050000' })
    expect(classifyBookTradeFill(occ, [stk({})])).toBe('assigned')
  })

  it('does not match a different underlying that merely shares a prefix', () => {
    const occ = opt({ symbol: 'ZZ    240119P00050000' })
    expect(classifyBookTradeFill(occ, [stk({})])).toBe('expired')
  })

  it('marks an early assignment, which is neither zero-priced nor dated on expiry', () => {
    const early = opt({ price: 0.35, trade_date: '2024-01-10', symbol: 'ZZZ   240119P00050000' })
    expect(classifyBookTradeFill(early, [stk({ trade_date: '2024-01-10' })])).toBe('assigned')
  })

  it('does not guess a subclass for a stock BookTrade', () => {
    const stockBook = stk({ transaction_type: 'BookTrade', price: 12 })
    expect(classifyBookTradeFill(stockBook, [])).toBe('book')
    expect(ledgerBookingKind([stockBook], [])).toBe('book')
  })
})
