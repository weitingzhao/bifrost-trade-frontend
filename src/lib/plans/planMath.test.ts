import { describe, expect, it } from 'vitest'
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'
import { planEstCredit, planExitSummary, planStatusLabel } from './planMath'

const OPT_LEG: PlanLeg = {
  side: 'sell',
  sec_type: 'OPT',
  right: 'P',
  strike: 180,
  expiry: '2026-11-20',
  ratio: 1,
}

function plan(over: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    strategy_plan_id: 1,
    account_id: 'U1',
    symbol: 'NVDA',
    structure_label: 'Short put',
    strategy_structure_id: null,
    strategy_opportunity_id: null,
    legs_json: [OPT_LEG],
    qty: 1,
    price_effect: 'credit',
    limit_price: 3.2,
    target_kind: null,
    target_value: null,
    stop_kind: null,
    stop_value: null,
    exit_by: null,
    rationale: null,
    source_kind: 'manual',
    source_ref: null,
    source_json: [],
    status: 'draft',
    effective_status: 'draft',
    expires_at: null,
    intended_at: null,
    filled_at: null,
    cancelled_at: null,
    strategy_instance_id: null,
    parent_strategy_plan_id: null,
    created_at: null,
    updated_at: null,
    ...over,
  }
}

describe('planEstCredit', () => {
  it('counts an option combination per contract, and signs it by direction', () => {
    expect(planEstCredit(plan({ limit_price: 3.2, qty: 2 }))).toBe(640)
    expect(planEstCredit(plan({ limit_price: 3.2, qty: 2, price_effect: 'debit' }))).toBe(-640)
  })

  it('counts a stock-only plan per share', () => {
    const stock: PlanLeg = { side: 'buy', sec_type: 'STK', ratio: 1 }
    expect(planEstCredit(plan({ legs_json: [stock], limit_price: 172.5, qty: 100, price_effect: 'debit' }))).toBe(
      -17250,
    )
  })

  it('says nothing when the plan named no price', () => {
    // Not zero: zero would read as a free trade on the desk.
    expect(planEstCredit(plan({ limit_price: null }))).toBeNull()
  })

  it('takes the limit as the combination price, not per leg', () => {
    const twoLegs = [OPT_LEG, { ...OPT_LEG, side: 'buy' as const, strike: 170 }]
    expect(planEstCredit(plan({ legs_json: twoLegs, limit_price: 1.1, qty: 1 }))).toBe(110)
  })
})

describe('planExitSummary', () => {
  it('reads the three rules in one line', () => {
    expect(
      planExitSummary(
        plan({
          target_kind: 'credit_pct',
          target_value: 50,
          stop_kind: 'credit_multiple',
          stop_value: 2,
          exit_by: '2026-10-16',
        }),
      ),
    ).toBe('TP 50% of credit · Stop 2× credit · Exit by 16 Oct')
  })

  it('reads a single rule on its own', () => {
    expect(planExitSummary(plan({ exit_by: '2026-10-16' }))).toBe('Exit by 16 Oct')
    expect(planExitSummary(plan({ target_kind: 'option_price', target_value: 1.6 }))).toBe('TP at 1.6')
    expect(planExitSummary(plan({ stop_kind: 'underlying_price', stop_value: 150 }))).toBe(
      'Stop underlying 150',
    )
  })

  it('returns null when the plan wrote no exit at all', () => {
    // The review has nothing to compare against, and the desk has to say that
    // rather than show an empty rule.
    expect(planExitSummary(plan())).toBeNull()
  })

  it('does not shift the exit date across a timezone', () => {
    expect(planExitSummary(plan({ exit_by: '2026-01-01' }))).toBe('Exit by 1 Jan')
  })
})

describe('planStatusLabel', () => {
  it('names every status the server can send, expired included', () => {
    expect(planStatusLabel('draft')).toBe('Draft')
    expect(planStatusLabel('intended')).toBe('Intended')
    expect(planStatusLabel('expired')).toBe('Expired')
    expect(planStatusLabel('filled')).toBe('Filled')
    expect(planStatusLabel('cancelled')).toBe('Cancelled')
  })
})
