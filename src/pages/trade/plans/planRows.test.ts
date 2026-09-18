import { describe, expect, it } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import {
  coercePlanFilter,
  filterPlans,
  planFilterCounts,
  planInAccountScope,
  planWhenTone,
  sortPlans,
} from './planRows'

const plan = (over: Partial<StrategyPlan>): StrategyPlan =>
  ({ strategy_plan_id: 1, symbol: 'ZZZ', account_id: 'U1', created_at: '2026-09-01T00:00:00Z', ...over }) as StrategyPlan

const book = [
  plan({ strategy_plan_id: 1, effective_status: 'filled' }),
  plan({ strategy_plan_id: 2, effective_status: 'draft' }),
  plan({ strategy_plan_id: 3, effective_status: 'intended' }),
  plan({ strategy_plan_id: 4, effective_status: 'expired' }),
  plan({ strategy_plan_id: 5, effective_status: 'cancelled' }),
]

describe('the design scope', () => {
  it('Open is draft + intended and the default; old deep links land on the scope that contains them', () => {
    expect(filterPlans(book, 'open').map((p) => p.strategy_plan_id)).toEqual([2, 3])
    expect(coercePlanFilter(null)).toBe('open')
    expect(coercePlanFilter('draft')).toBe('open')
    expect(coercePlanFilter('cancelled')).toBe('all')
    expect(coercePlanFilter('filled')).toBe('filled')
  })

  it('counts the open book beside the per-status counts', () => {
    expect(planFilterCounts(book)).toMatchObject({ all: 5, open: 2, draft: 1, intended: 1 })
  })

  it('sorts the design way — the live book first, the record after it', () => {
    expect(sortPlans(book).map((p) => p.effective_status)).toEqual([
      'intended',
      'draft',
      'filled',
      'expired',
      'cancelled',
    ])
  })

  it('a toggle only speaks for the account it names', () => {
    const scope = { host: false, secondary: true }
    expect(planInAccountScope(plan({ account_id: 'U1' }), scope, 'U1', 'U2')).toBe(false)
    expect(planInAccountScope(plan({ account_id: 'U2' }), scope, 'U1', 'U2')).toBe(true)
    // An account that is neither is never hidden by them.
    expect(planInAccountScope(plan({ account_id: 'U9' }), scope, 'U1', 'U2')).toBe(true)
    // With no host id known, the host toggle hides nothing.
    expect(planInAccountScope(plan({ account_id: 'U1' }), { host: false, secondary: true }, '', 'U2')).toBe(true)
  })

  it('ambers only the waiting intent', () => {
    expect(planWhenTone('intended')).toBe('warning')
    expect(planWhenTone('expired')).toBe('muted')
  })
})
