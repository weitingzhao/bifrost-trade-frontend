import { describe, expect, it } from 'vitest'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { ledgerDetailsSubject } from './ledgerDetailsSubject'

const group = (fills: number): OptExecutionGroup =>
  ({
    symbol: 'ZZZ',
    expiry: '20240119',
    strike: 50,
    option_right: 'C',
    contract_key: 'ZZZ|OPT|20240119|50.0|C',
    trades: Array.from({ length: fills }, () => ({})),
  }) as unknown as OptExecutionGroup

describe('ledgerDetailsSubject', () => {
  it('names the one contract whose fills are shown', () => {
    expect(ledgerDetailsSubject([group(2)])).toBe('ZZZ 19JAN24 50C · 2 fills')
  })

  it('counts contracts when several rows are open', () => {
    expect(ledgerDetailsSubject([group(1), group(2)])).toBe('2 contracts · 3 fills')
  })

  it('says nothing when no row is open', () => {
    expect(ledgerDetailsSubject([])).toBe('')
  })
})
