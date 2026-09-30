import { describe, expect, it } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { originsByTrade, planTermsText, planToken } from './tradeOrigin'

// Invented plans (fixtures are never copied from DEV).
const plan = (over: Partial<StrategyPlan>): StrategyPlan =>
  ({
    strategy_plan_id: 1,
    strategy_instance_id: null,
    source_kind: 'manual',
    source_ref: null,
    status: 'intended',
    exit_by: null,
    target_kind: null,
    target_value: null,
    stop_kind: null,
    stop_value: null,
    ...over,
  }) as StrategyPlan

describe('trade origins (Rev .112)', () => {
  it('keys each plan by the trade it names, and leaves unlinked plans out', () => {
    const m = originsByTrade([
      plan({ strategy_plan_id: 3, strategy_instance_id: 40, source_kind: 'hypothesis', source_ref: 'H-9', exit_by: '2026-03-20T00:00:00Z' }),
      plan({ strategy_plan_id: 4 }),
    ])
    expect([...m.keys()]).toEqual([40])
    expect(m.get(40)).toMatchObject({ planId: 3, source: 'Hypothesis', ref: 'H-9', exitBy: '2026-03-20' })
  })

  it('prefers the plan that filled over a newer one that did not', () => {
    const m = originsByTrade([
      plan({ strategy_plan_id: 5, strategy_instance_id: 41, status: 'filled', source_kind: 'symbol' }),
      plan({ strategy_plan_id: 6, strategy_instance_id: 41, status: 'cancelled', source_kind: 'roll' }),
    ])
    expect(m.get(41)?.planId).toBe(5)
  })

  it('writes the exit terms the plan holds, and says so when it holds none', () => {
    const [o] = originsByTrade([
      plan({ strategy_instance_id: 42, target_kind: 'credit_pct', target_value: 50, stop_kind: 'credit_multiple', stop_value: 2, exit_by: '2026-04-17' }),
    ]).values()
    expect(planTermsText(o)).toBe('target 50% of credit kept · stop at a loss of 2× credit · out by 2026-04-17')
    const [bare] = originsByTrade([plan({ strategy_instance_id: 43 })]).values()
    expect(planTermsText(bare)).toBe('no target, stop or exit date written')
  })
})

describe('plan token (Rev .113 §5.1.4a)', () => {
  it('pads to four digits and keeps longer ids whole', () => {
    expect([planToken(7), planToken(212), planToken(12345)]).toEqual(['TP-0007', 'TP-0212', 'TP-12345'])
  })
})
