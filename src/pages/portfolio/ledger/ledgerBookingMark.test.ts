import { describe, expect, it } from 'vitest'
import type { Execution } from '@/types/positions'
import { ledgerBookingKind, ledgerBookingLabel } from './ledgerBookingMark'

function ex(transaction_type?: string | null): Execution {
  return { transaction_type } as Execution
}

describe('ledgerBookingKind', () => {
  it('marks empty transaction_type as not reported', () => {
    expect(ledgerBookingKind([ex(null), ex('')])).toBe('unreported')
    expect(ledgerBookingLabel('unreported')).toBe('not reported')
  })

  it('marks ExchTrade as exchange and BookTrade as BOOK', () => {
    expect(ledgerBookingKind([ex('ExchTrade')])).toBe('exchange')
    expect(ledgerBookingLabel('exchange')).toBe('Exch')
    expect(ledgerBookingKind([ex('BookTrade')])).toBe('book')
    expect(ledgerBookingLabel('book')).toBe('BOOK')
  })

  it('marks a mix of exchange and book as MIX', () => {
    expect(ledgerBookingKind([ex('ExchTrade'), ex('BookTrade')])).toBe('mixed')
  })
})
