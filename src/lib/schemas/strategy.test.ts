import { describe, expect, it } from 'vitest'
import {
  AllocationsResponseSchema,
  GateSetFullSchema,
  GateSetResponseSchema,
  OpportunitiesResponseSchema,
  TradeDetailSchema,
  TradesResponseSchema,
  StrategyOpportunityDetailSchema,
} from './strategy'
import { StrategyPlansResponseSchema } from './strategyPlan'

/**
 * Answers shaped like the api 0.3.1 response models (contract 3c-1, §2) —
 * invented values, never copied from an environment.
 */
const TS = '2031-03-04T14:30:00Z'

const opportunityRow = {
  strategy_opportunity_id: 41,
  name: 'Fixture Put Harvest',
  strategy_structure_id: 3,
  structure_name: 'Cash Secured Put',
  default_gate_safety_strategy_id: null,
  gate_safety_name: null,
  scope_type: null,
  symbols: null,
  is_active: true,
  created_at: TS,
  updated_at: TS,
}

const tradeRow = {
  trade_id: 7,
  strategy_opportunity_id: 41,
  strategy_opportunity_name: 'Fixture Put Harvest',
  strategy_structure_id: null,
  strategy_structure_name: null,
  account_id: 'U0000001',
  opened_at: TS,
  label: null,
  created_at: TS,
  updated_at: TS,
  opened_at_epoch: 1930401000,
  created_at_epoch: 1930401000,
}

const gateRow = {
  gate_safety_strategy_id: 2,
  name: 'Fixture gate',
  version: 3,
  dim_direction: null,
  dim_structure: null,
  dim_coverage: null,
  dim_risk: null,
  dim_volatility: null,
  dim_time: null,
  is_active: true,
  structure_type: null,
}

describe('strategy response schemas (api 0.3.1 models)', () => {
  it('takes an opportunity list whose row has no symbols (null in the list)', () => {
    const parsed = OpportunitiesResponseSchema.safeParse({ items: [opportunityRow], count: 1 })
    expect(parsed.success).toBe(true)
  })

  it('wants the detail’s symbols as an array, with its entry conditions', () => {
    const detail = {
      ...opportunityRow,
      symbols: [],
      entry_conditions: [{ condition_type: null, value_text: null, value_numeric: 0.3 }],
    }
    expect(StrategyOpportunityDetailSchema.safeParse(detail).success).toBe(true)
    expect(StrategyOpportunityDetailSchema.safeParse({ ...detail, symbols: null }).success).toBe(false)
  })

  it('reads one instance without executions_count — GET / PATCH never send it', () => {
    expect(TradeDetailSchema.safeParse(tradeRow).success).toBe(true)
    const listed = TradesResponseSchema.safeParse({
      items: [{ ...tradeRow, executions_count: 4 }],
      count: 1,
    })
    expect(listed.success).toBe(true)
  })

  it('keeps fields the model does not declare (extra="allow")', () => {
    const parsed = TradeDetailSchema.parse({ ...tradeRow, added_later: 'x' })
    expect(parsed.added_later).toBe('x')
    const list = GateSetResponseSchema.parse({ items: [{ ...gateRow, added_later: 1 }], count: 1 })
    expect(list.items[0].added_later).toBe(1)
  })

  it('checks gates as an object and keeps it whole', () => {
    const gates = { strategy: { trading_hours_only: true }, guard: { risk: { paper_trade: true } } }
    const parsed = GateSetFullSchema.parse({ ...gateRow, gates, earnings_dates: ['2031-02-03'] })
    expect(parsed.gates).toEqual(gates)
    expect(GateSetFullSchema.safeParse({ ...gateRow, gates: [], earnings_dates: [] }).success).toBe(false)
  })

  it('takes an allocation with no limits, and refuses a fraction where an id is an int', () => {
    const row = {
      strategy_allocation_id: 5,
      name: 'Fixture sleeve',
      gate_safety_strategy_id: null,
      gate_safety_name: null,
      max_positions: null,
      max_bp_pct: null,
      allocation_limits: null,
      strategy_opportunity_ids: [],
      is_active: false,
      created_at: TS,
      updated_at: TS,
    }
    expect(AllocationsResponseSchema.safeParse({ items: [row], count: 1 }).success).toBe(true)
    expect(
      AllocationsResponseSchema.safeParse({ items: [{ ...row, strategy_allocation_id: 5.5 }], count: 1 }).success,
    ).toBe(false)
  })

  it('takes a plan leg with every field left out (PlanLegRow is all optional)', () => {
    const plan = {
      strategy_plan_id: 2,
      account_id: 'U0000001',
      symbol: 'ZZZ',
      structure_label: 'Cash Secured Put',
      strategy_structure_id: null,
      strategy_opportunity_id: null,
      legs_json: [{}],
      qty: 1,
      price_effect: null,
      limit_price: '1.10',
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
      trade_id: null,
      parent_strategy_plan_id: null,
      created_at: TS,
      updated_at: TS,
    }
    const parsed = StrategyPlansResponseSchema.parse({ items: [plan], count: 1 })
    expect(parsed.items[0].limit_price).toBe(1.1)
  })
})
