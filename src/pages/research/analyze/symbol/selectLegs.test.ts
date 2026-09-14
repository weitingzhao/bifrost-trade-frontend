import { describe, expect, it } from 'vitest'
import { selectLegs } from './selectLegs'
import type { LivePositionRow } from '@/types/positions'

function row(overrides: Partial<LivePositionRow> = {}): LivePositionRow {
  return {
    account_id: 'U1',
    symbol: 'NVDA',
    secType: 'STK',
    position: 100,
    avgCost: 100,
    price: 120,
    unrealized_pnl: 2000,
    ...overrides,
  } as LivePositionRow
}

describe('selectLegs', () => {
  it('returns nothing when the account holds no leg on this name', () => {
    expect(selectLegs([row({ symbol: 'AAPL' })], 'NVDA')).toEqual([])
  })

  it('filters by upper-cased symbol match', () => {
    const legs = selectLegs([row({ symbol: 'nvda' })], 'NVDA')
    expect(legs).toHaveLength(1)
    expect(legs[0].kind).toBe('STK')
  })

  it('skips zero-quantity rows so a closed leg does not render', () => {
    expect(selectLegs([row({ position: 0 })], 'NVDA')).toEqual([])
  })

  it('sorts stocks first, then options by expiry then strike', () => {
    const legs = selectLegs(
      [
        row({ secType: 'OPT', expiry: '20261017', strike: 130, right: 'C', position: -1, contract_key: 'k1' }),
        row({ secType: 'STK', position: 100, contract_key: null }),
        row({ secType: 'OPT', expiry: '20260919', strike: 125, right: 'P', position: -2, contract_key: 'k2' }),
        row({ secType: 'OPT', expiry: '20260919', strike: 130, right: 'P', position: -1, contract_key: 'k3' }),
      ],
      'NVDA',
    )
    expect(legs.map((l) => l.kind)).toEqual(['STK', 'OPT', 'OPT', 'OPT'])
    expect(legs.slice(1).map((l) => `${l.expiry}-${l.strike}`)).toEqual([
      '20260919-125',
      '20260919-130',
      '20261017-130',
    ])
  })

  it('ignores non-STK/OPT rows (CASH, FUT, …)', () => {
    const legs = selectLegs([row({ secType: 'CASH' }), row({ secType: 'STK' })], 'NVDA')
    expect(legs).toHaveLength(1)
  })
})
