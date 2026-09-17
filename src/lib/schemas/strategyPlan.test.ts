import { describe, expect, it } from 'vitest'
import { StrategyPlanSchema } from './strategyPlan'

/**
 * The plan store's money columns are PostgreSQL `numeric`, which psycopg2 maps
 * to `Decimal` and the API serialises as a JSON string. The schema said
 * `number`, so every fetch warned about drift that was not drift and `50.0`
 * reached the page as text.
 */
describe('StrategyPlanSchema numerics', () => {
  const base = {
    strategy_plan_id: 2,
    account_id: 'U0000001',
    symbol: 'ZZZ',
    structure_label: 'Cash Secured Put',
    strategy_structure_id: 4,
    strategy_opportunity_id: null,
    legs_json: [],
    qty: 1,
    price_effect: 'credit',
    target_kind: 'credit_pct',
    stop_kind: null,
    stop_value: null,
    exit_by: null,
    rationale: null,
    source_kind: 'manual',
    source_ref: null,
    source_json: [],
    status: 'cancelled',
    effective_status: 'cancelled',
    intended_at: null,
    filled_at: null,
    cancelled_at: null,
    expires_at: null,
    strategy_instance_id: null,
    parent_strategy_plan_id: null,
    created_at: null,
    updated_at: null,
  }

  it('reads the API’s strings as the numbers they are', () => {
    const parsed = StrategyPlanSchema.parse({ ...base, limit_price: '3.4', target_value: '50.0' })
    expect(parsed.limit_price).toBe(3.4)
    expect(parsed.target_value).toBe(50)
  })

  it('still takes a real number, and still takes null', () => {
    const parsed = StrategyPlanSchema.parse({ ...base, limit_price: 3.4, target_value: null })
    expect(parsed.limit_price).toBe(3.4)
    expect(parsed.target_value).toBeNull()
  })
})
