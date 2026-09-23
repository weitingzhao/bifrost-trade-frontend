import { describe, expect, it } from 'vitest'
import { orderIntentView } from '@/lib/harness/orderIntent'

// The four pending on DEV 2026-09-22, verbatim.
const INTC = {
  strategy_template: 'bull_put_spread',
  legs: [
    { side: 'sell', right: 'P', strike: 110.0, symbol: 'INTC', expiry: null, qty_hint: null },
    { side: 'sell', right: 'P', strike: 100.0, symbol: 'INTC', expiry: null, qty_hint: null },
  ],
}
const TWLO = { strategy_template: 'long_call', legs: [{ side: 'sell', right: 'C', strike: 270.0, symbol: 'TWLO' }] }
const WATCH = { strategy_template: 'NoStructureConditionalWatch', legs: [] }

describe('orderIntentView', () => {
  it('flags a spread whose legs are not one buy and one sell', () => {
    const v = orderIntentView(INTC)
    expect(v.mismatch).toBe(true)
    expect(v.mismatchNote).toMatch(/one buy and one sell/)
    expect(v.mismatchNote).toMatch(/raised with Research/)
  })

  // The legs are the fact. A card that quietly corrected them would hide the
  // defect this flag exists to surface.
  it('draws the legs as received, unchanged', () => {
    expect(orderIntentView(INTC).legs.map((l) => l.side)).toEqual(['sell', 'sell'])
  })

  it('flags nothing when the template is not a spread', () => {
    expect(orderIntentView(TWLO).mismatch).toBe(false)
    expect(orderIntentView(TWLO).mismatchNote).toBeNull()
  })

  it('flags nothing when a spread does carry both sides', () => {
    const v = orderIntentView({
      strategy_template: 'bull_put_spread',
      legs: [{ side: 'sell', strike: 110 }, { side: 'buy', strike: 100 }],
    })
    expect(v.mismatch).toBe(false)
  })

  it('says a template with no legs is a condition, not a structure', () => {
    const v = orderIntentView(WATCH)
    expect(v.noLegs).toBe(true)
    expect(v.mismatch).toBe(false)
  })

  it('keeps a missing expiry and qty as null rather than inventing them', () => {
    const [leg] = orderIntentView(INTC).legs
    expect(leg.expiry).toBeNull()
    expect(leg.qty).toBeNull()
    expect(leg.strike).toBe(110)
  })
})
