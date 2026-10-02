import { describe, expect, it } from 'vitest'
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'
import { draftOf, payloadFor } from './PlanEditSection'
import { planReadOnlyReason } from './planRows'

const LEGS: PlanLeg[] = [
  { side: 'sell', sec_type: 'OPT', right: 'P', strike: 150, expiry: '2026-11-20', ratio: 1 },
  { side: 'buy', sec_type: 'STK', ratio: 100 },
]

const PLAN = {
  strategy_plan_id: 7,
  account_id: 'U1000001',
  qty: 2,
  legs_json: LEGS,
  rationale: 'Earnings behind it',
} as unknown as StrategyPlan

describe('editing a draft in place (Rev .138 §2)', () => {
  it('starts from the plan as written', () => {
    expect(draftOf(PLAN)).toEqual({
      account_id: 'U1000001',
      qty: '2',
      legs: [
        { strike: '150', expiry: '2026-11-20' },
        { strike: '', expiry: '' },
      ],
      rationale: 'Earnings behind it',
    })
  })

  it('writes a whole number of contracts, and nothing while it is not one', () => {
    const d = draftOf(PLAN)
    expect(payloadFor('qty', { ...d, qty: '3' }, LEGS)).toEqual({ qty: 3 })
    expect(payloadFor('qty', { ...d, qty: '' }, LEGS)).toBeNull()
    expect(payloadFor('qty', { ...d, qty: '1.5' }, LEGS)).toBeNull()
    expect(payloadFor('qty', { ...d, qty: '0' }, LEGS)).toBeNull()
  })

  it('rewrites the option legs and leaves the stock leg as it was', () => {
    const d = draftOf(PLAN)
    const next = { ...d, legs: [{ strike: '145', expiry: '2026-12-18' }, d.legs[1]] }
    expect(payloadFor('strike0', next, LEGS)).toEqual({
      legs: [{ ...LEGS[0], strike: 145, expiry: '2026-12-18' }, LEGS[1]],
    })
    expect(payloadFor('strike0', { ...d, legs: [{ strike: 'abc', expiry: '' }, d.legs[1]] }, LEGS)).toBeNull()
  })

  it('clears an empty rationale rather than writing blanks', () => {
    expect(payloadFor('rationale', { ...draftOf(PLAN), rationale: '   ' }, LEGS)).toEqual({ rationale: null })
  })
})

describe('read-only past draft (Rev .138 §3)', () => {
  it('says why for every state but draft', () => {
    expect(planReadOnlyReason({ effective_status: 'draft', intended_at: null, filled_at: null })).toBeNull()
    for (const s of ['intended', 'expired', 'filled', 'cancelled'] as const) {
      expect(planReadOnlyReason({ effective_status: s, intended_at: '2026-09-30T14:00:00Z', filled_at: null })).toBeTruthy()
    }
  })
})
