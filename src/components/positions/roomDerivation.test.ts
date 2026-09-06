import { describe, it, expect } from 'vitest'
import { roomDerivation } from './roomDerivation'
import { computeRoomToAdd } from '@/utils/roomToAdd'
import { fixture, NOW } from '@/utils/roomToAdd.fixture'
import { derivationFields, derivationRows } from '@/utils/derivation'


describe('roomDerivation', () => {
  const f = fixture()
  const d = roomDerivation(computeRoomToAdd({ ...f, ceiling: 0.5, nowSec: NOW }), f.coverRows)

  it('walks each table figure down to the pool, the premium and the broker sums', () => {
    expect(derivationRows(d).map((r) => `${r.depth}:${r.name}`)).toEqual([
      '0:Calls',
      '0:Puts',
      '1:CashFree',
      '1:CashPerPut',
      '0:Income',
      '1:PoolFree',
      '1:Yield',
      '0:MarginPuts',
      '1:HeadroomLeft',
      '2:Headroom',
      '2:MarginPerPut',
      '0:MarginIncome',
      '1:PremiumPerPut',
      '0:PressureAfter',
    ])
    expect(derivationFields(d)).toEqual(['CashLike', 'PutCashNeeded', 'ShortPuts', 'NetPremium', 'PoolUsed', 'Ceiling', 'ShortPutPremium', 'ExcessLiquidity', 'NetLiquidation'])
  })

  it('quotes the same numbers the table shows and lists the rows the sums came from', () => {
    const v = d.variables
    expect(v.Puts.value).toBe('+2')
    expect(v.CashPerPut.value).toBe('$20,000.00')
    expect(v.MarginPuts.value).toBe('+56')
    expect(v.MarginPerPut.value).toBe('$3,955.00')
    expect(v.MarginPerPut.items?.[0]).toMatchObject({ label: 'DDOG 200P 10/16/26', value: '$3,955.00' })
    expect(v.MarginPerPut.items?.[0].sub).toContain('max(20% × $213.00 − OTM $13.00, 10% × $200.00) + $9.95 premium')
    expect(v.Headroom.items?.[0]).toMatchObject({ label: 'U1', value: '$230,000.00' })
    expect(v.Calls.items?.[0]).toMatchObject({ label: 'U1 NVDA', value: '+0' })
    expect(v.ExcessLiquidity.source).toBe('broker')
    expect(v.PressureAfter.value).toBe('50%')
  })
})
