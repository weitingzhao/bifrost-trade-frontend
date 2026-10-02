import { describe, expect, it } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { matchesPlanTokens, parsePlanTokens, serializePlanTokens, suggestPlanTokens } from './planTokens'

function plan(over: Partial<StrategyPlan>): StrategyPlan {
  return {
    strategy_plan_id: 1,
    symbol: 'AMD',
    structure_label: 'Short put',
    source_kind: 'manual',
    source_ref: null,
    rationale: null,
    ...over,
  } as StrategyPlan
}

describe('plan token search (Rev .138 §7)', () => {
  it('round-trips through the URL and drops unknown kinds', () => {
    const tokens = parsePlanTokens('sym:AMD;bogus:x;contains:roll')
    expect(tokens.map((t) => `${t.kind}:${t.value}`)).toEqual(['sym:AMD', 'contains:roll'])
    expect(serializePlanTokens(tokens)).toBe('sym:AMD;contains:roll')
    expect(serializePlanTokens([])).toBeNull()
  })

  it('is a union within a kind and an intersection across kinds', () => {
    const amd = plan({ symbol: 'AMD', structure_label: 'Short put' })
    const nvda = plan({ strategy_plan_id: 2, symbol: 'NVDA', structure_label: 'Covered call' })
    const both = parsePlanTokens('sym:AMD;sym:NVDA')
    expect([amd, nvda].filter((p) => matchesPlanTokens(p, both))).toHaveLength(2)
    const narrowed = parsePlanTokens('sym:AMD;sym:NVDA;structure:Covered call')
    expect([amd, nvda].filter((p) => matchesPlanTokens(p, narrowed))).toEqual([nvda])
  })

  it('Contains reads the rationale and the source too', () => {
    const p = plan({ rationale: 'Roll the November put', source_kind: 'hypothesis', source_ref: 'H-12' })
    expect(matchesPlanTokens(p, parsePlanTokens('contains:november'))).toBe(true)
    expect(matchesPlanTokens(p, parsePlanTokens('contains:h-12'))).toBe(true)
    expect(matchesPlanTokens(p, parsePlanTokens('contains:march'))).toBe(false)
  })

  it('suggests from the plans on the page, Contains last, with counts', () => {
    const list = [plan({ symbol: 'AMD' }), plan({ strategy_plan_id: 2, symbol: 'AMAT' })]
    const s = suggestPlanTokens(list, 'am')
    expect(s.filter((x) => x.kind === 'sym').map((x) => x.value)).toEqual(['AMD', 'AMAT'])
    expect(s[s.length - 1]).toMatchObject({ kind: 'contains', value: 'am' })
    expect(suggestPlanTokens(list, '  ')).toEqual([])
  })
})
