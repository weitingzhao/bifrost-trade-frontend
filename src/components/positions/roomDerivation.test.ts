import { describe, it, expect } from 'vitest'
import { roomDerivation } from './roomDerivation'
import { computeRoomToAdd } from '@/utils/roomToAdd'
import { fixture, NOW } from '@/utils/roomToAdd.fixture'
import { derivationFields, derivationRows } from '@/utils/derivation'

const f = fixture()
const room = computeRoomToAdd({ ...f, ceiling: 0.5, nowSec: NOW })
const view = (v: 'now' | 'backed' | 'margin' | 'all') => roomDerivation(room, f.coverRows, v)

describe('roomDerivation', () => {
  it('gives each step its own walk, rooted in that row\'s figures', () => {
    expect(derivationRows(view('now')).map((r) => `${r.depth}:${r.name}`)).toEqual([
      '0:CallsNow',
      '0:PutsNow',
      '0:NetPremium',
      '0:PressureNow',
    ])
    expect(derivationRows(view('backed')).map((r) => `${r.depth}:${r.name}`)).toEqual([
      '0:Calls',
      '0:Puts',
      '1:CashFree',
      '1:CashPerPut',
      '2:PutsNow',
      '0:Income',
      '1:PoolFree',
      '1:Yield',
      '2:NetPremium',
      '0:PressureBacked',
      '1:MarginPerPut',
    ])
    expect(derivationRows(view('margin')).map((r) => `${r.depth}:${r.name}`)).toEqual([
      '0:MarginPuts',
      '1:HeadroomLeft',
      '2:Headroom',
      // The backed puts come off the headroom first, so they are part of this walk too.
      '2:Puts',
      '3:CashFree',
      '3:CashPerPut',
      '4:PutsNow',
      '2:MarginPerPut',
      '0:MarginIncome',
      '1:PremiumPerPut',
      '0:PressureAfter',
    ])
    // The margin step rests on the broker's own two sums, and says so.
    expect(derivationFields(view('margin'))).toContain('ExcessLiquidity')
    expect(view('margin').variables.ExcessLiquidity.source).toBe('broker')
  })

  it('reads the book back to its contracts, its legs and its accounts', () => {
    const v = view('now').variables
    expect(v.CallsNow.value).toBe('5')
    expect(v.CallsNow.items).toEqual([{ label: 'U1 NVDA', sub: 'strike 245', value: '5' }])
    expect(v.PutsNow.items).toEqual([{ label: 'U1 DDOG', sub: 'strike 200', value: '1' }])
    expect(v.NetPremium.value).toBe('$5,990.00')
    expect(v.NetPremium.items?.map((i) => [i.label, i.sub, i.value])).toEqual([
      ['U1 NVDA 245C 11/20/26', 'sold 5 × $9.99/share × 100', '+$4,995.00'],
      ['U1 DDOG 200P 10/16/26', 'sold 1 × $9.95/share × 100', '+$995.00'],
    ])
    expect(v.PressureNow.value).toBe('27%')
    expect(v.PressureNow.items?.[0]).toEqual({
      label: 'U1',
      sub: 'excess $730,000.00 ÷ NLV $1,000,000.00 = cushion 0.7300',
      value: '27%',
      warn: false,
    })
  })

  it('quotes the same numbers the table shows for the two steps that add', () => {
    const b = view('backed').variables
    expect(b.Puts.value).toBe('+2')
    expect(b.CashPerPut.value).toBe('$20,000.00')
    expect(b.PressureBacked.value).toBe('28%')
    expect(b.PressureBacked.note).toContain('$7,910.00 of margin for 2 puts')
    const m = view('margin').variables
    expect(m.MarginPuts.value).toBe('+56')
    expect(m.MarginPerPut.value).toBe('$3,955.00')
    expect(m.MarginPerPut.items?.[0]).toMatchObject({ label: 'DDOG 200P 10/16/26', value: '$3,955.00' })
    expect(m.MarginPerPut.items?.[0].sub).toContain('max(20% × $213.00 − OTM $13.00, 10% × $200.00) + $9.95 premium')
    expect(m.Headroom.items?.[0]).toMatchObject({ label: 'U1', value: '$230,000.00' })
    expect(m.PressureAfter.value).toBe('50%')
  })

  it('explains both meters on every step, and the header walks the whole model', () => {
    for (const v of ['now', 'backed', 'margin'] as const) {
      expect(view(v).scale?.[0]).toContain('Wide bar')
      expect(view(v).scale?.[1]).toContain('Thin bar')
    }
    const all = derivationRows(view('all')).map((r) => r.name)
    expect(all).toContain('CallsNow')
    expect(all).toContain('Income')
    expect(all).toContain('PressureAfter')
    expect(view('all').title).toBe('Room to add')
    expect(view('now').title).toBe('Now — the book in scope')
  })
})
