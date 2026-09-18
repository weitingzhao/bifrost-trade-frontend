import { describe, expect, it } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import {
  creditOnCash,
  extendedExpiry,
  legExpiryText,
  planCashSecured,
  planTimeline,
  twsCopyText,
} from './planCardModel'

// Invented fixtures — never DEV rows (fixture rule, 2026-09-17).
import type { PlanLeg } from '@/lib/schemas/strategyPlan'

const leg = (over: Partial<PlanLeg> = {}): PlanLeg =>
  ({
    side: 'sell',
    sec_type: 'OPT',
    right: 'P',
    strike: 140,
    expiry: '2026-11-21',
    ratio: 1,
    ...over,
  }) as PlanLeg

const plan = (over: Partial<StrategyPlan> = {}): StrategyPlan =>
  ({
    strategy_plan_id: 9,
    symbol: 'ZZZ',
    qty: 6,
    legs_json: [leg()],
    limit_price: 2.45,
    created_at: '2026-09-05T14:12:00Z',
    intended_at: '2026-09-05T14:30:00Z',
    filled_at: null,
    expires_at: '2026-09-12',
    effective_status: 'intended',
    strategy_instance_id: null,
    ...over,
  }) as StrategyPlan

describe('planTimeline', () => {
  it('reads each step from the field that stores it', () => {
    const tl = planTimeline(plan())
    expect(tl.map((t) => [t.label, t.on])).toEqual([
      ['Draft', true],
      ['Intent', true],
      ['Filled', false],
      ['Linked', false],
    ])
    expect(tl[0].when).toBe('2026-09-05 14:12')
  })

  it('calls the third step Expired when the intent lapsed, and Linked names the instance', () => {
    const tl = planTimeline(plan({ effective_status: 'expired', strategy_instance_id: 77 }))
    expect(tl[2]).toMatchObject({ label: 'Expired', when: '2026-09-12', on: true })
    expect(tl[3]).toMatchObject({ label: 'Linked', when: '#77', on: true })
  })
})

describe('twsCopyText', () => {
  it('spells the basket line the desk pastes — nothing is sent anywhere', () => {
    expect(twsCopyText(plan())).toBe('ZZZ · Sell 6 21Nov26 140P · limit 2.45')
  })

  it('multiplies ratio legs and leaves the limit off when none is stored', () => {
    const p = plan({
      limit_price: null,
      legs_json: [leg(), leg({ side: 'buy', strike: 120, ratio: 2 })],
    })
    expect(twsCopyText(p)).toBe('ZZZ · Sell 6 21Nov26 140P · Buy 12 21Nov26 120P')
  })

  it('reads a stock leg as shares', () => {
    const p = plan({ legs_json: [leg({ sec_type: 'STK', right: null, strike: null, expiry: null })], limit_price: null })
    expect(twsCopyText(p)).toBe('ZZZ · Sell 600 shares')
  })
})

describe('planCashSecured', () => {
  it('pins strike × 100 × qty for short puts — arithmetic on stored fields only', () => {
    expect(planCashSecured(plan())).toBe(84_000)
  })

  it('answers null when no short put pins cash — a covered call is checked in shares', () => {
    expect(planCashSecured(plan({ legs_json: [leg({ right: 'C' })] }))).toBeNull()
  })

  it('reads the credit against the cash it secures', () => {
    expect(creditOnCash(1470, 84_000)).toBe('1.75% on cash')
    expect(creditOnCash(1470, null)).toBeNull()
  })
})

describe('small spellings', () => {
  it('writes leg expiries the §14.4 way', () => {
    expect(legExpiryText('2026-11-21')).toBe('21Nov26')
    expect(legExpiryText(null)).toBe('—')
  })

  it('extends an intent window seven days from now', () => {
    expect(extendedExpiry('2026-09-18T20:00:00Z')).toBe('2026-09-25')
  })
})
