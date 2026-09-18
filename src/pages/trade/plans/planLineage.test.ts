import { describe, expect, it } from 'vitest'
import { planLineage } from './planLineage'
import type { StrategyAllocation, StrategyOpportunity } from '@/types/strategy'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

function plan(p: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    strategy_plan_id: 1,
    symbol: 'PLTR',
    structure_label: 'Cash Secured Put',
    strategy_structure_id: 4,
    strategy_opportunity_id: null,
    effective_status: 'draft',
    ...p,
  } as unknown as StrategyPlan
}

function opp(id: number, name: string): StrategyOpportunity {
  return {
    strategy_opportunity_id: id,
    name,
    strategy_structure_id: 4,
    default_gate_safety_strategy_id: 1,
    scope_type: 'explicit_symbols',
    is_active: true,
    created_at: null,
    updated_at: null,
    structure_name: 'Cash Secured Put',
    gate_safety_name: 'Security Gate',
    symbols: ['NVDA'],
  }
}

function alloc(p: Partial<StrategyAllocation> = {}): StrategyAllocation {
  return {
    strategy_allocation_id: 1,
    name: 'Test Portfolio 1',
    strategy_opportunity_ids: [7],
    gate_safety_strategy_id: 1,
    gate_safety_name: 'Security Gate',
    max_positions: 10,
    max_bp_pct: 0.5,
    is_active: true,
    created_at: null,
    updated_at: null,
    ...p,
  }
}

const OPPS = [opp(7, 'NVDA Covered Call')]

describe('planLineage', () => {
  it('is covered when an active allocation carries the plan’s opportunity', () => {
    const l = planLineage(plan({ strategy_opportunity_id: 7 }), OPPS, [alloc()])
    expect(l.outsideRules).toBe(false)
    expect(l.read).toContain('NVDA Covered Call')
    expect(l.read).toContain('Test Portfolio 1')
    expect(l.gateName).toBe('Security Gate')
    expect(l.allocation?.active).toBe(true)
  })

  it('is a hand plan when no opportunity is named, and says so by symbol', () => {
    const l = planLineage(plan(), OPPS, [alloc()])
    expect(l.outsideRules).toBe(true)
    expect(l.read).toContain('No opportunity covers PLTR')
    expect(l.opportunity).toBeNull()
    expect(l.allocation).toBeNull()
  })

  it('is outside the rules when an opportunity covers it but no allocation carries that', () => {
    const l = planLineage(plan({ strategy_opportunity_id: 7 }), OPPS, [alloc({ strategy_opportunity_ids: [99] })])
    expect(l.outsideRules).toBe(true)
    expect(l.read).toContain('no allocation carries that opportunity')
    expect(l.gateName).toBeNull()
  })

  it('is outside the rules when the allocation carrying it is inactive', () => {
    const l = planLineage(plan({ strategy_opportunity_id: 7 }), OPPS, [alloc({ is_active: false })])
    expect(l.outsideRules).toBe(true)
    expect(l.read).toContain('which is inactive')
    // The allocation is still named — knowing which one is switched off is the
    // point of the row.
    expect(l.allocation?.name).toBe('Test Portfolio 1')
    expect(l.allocation?.active).toBe(false)
  })

  it('prefers an active allocation when more than one carries the opportunity', () => {
    const l = planLineage(plan({ strategy_opportunity_id: 7 }), OPPS, [
      alloc({ strategy_allocation_id: 2, name: 'Retired book', is_active: false }),
      alloc({ strategy_allocation_id: 3, name: 'Income Q3', is_active: true }),
    ])
    expect(l.outsideRules).toBe(false)
    expect(l.allocation?.name).toBe('Income Q3')
  })

  it('says the rulebook has moved on when the named opportunity is gone', () => {
    const l = planLineage(plan({ strategy_opportunity_id: 404 }), OPPS, [alloc()])
    expect(l.outsideRules).toBe(true)
    expect(l.read).toContain('no longer in the rulebook')
  })

  it('carries the structure through for the chain chip even outside the rules', () => {
    expect(planLineage(plan(), OPPS, []).structure).toEqual({ id: 4, name: 'Cash Secured Put' })
  })
})
