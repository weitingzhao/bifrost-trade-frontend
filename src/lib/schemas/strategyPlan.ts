import { z } from 'zod'

/**
 * `/api/strategy/strategies/plans` — structured trade plans (core 0.22.0).
 *
 * `status` is what the row stores; `effective_status` is what to show, and adds
 * `expired`: an intent past `expires_at` is expired to a reader while the row
 * keeps saying `intended`, because that is what happened.
 */

export const PlanLegSchema = z
  .object({
    side: z.enum(['buy', 'sell']),
    sec_type: z.enum(['OPT', 'STK']),
    right: z.enum(['C', 'P']).nullable().optional(),
    strike: z.number().nullable().optional(),
    expiry: z.string().nullable().optional(),
    ratio: z.number(),
    contract_key: z.string().nullable().optional(),
    mid_at_plan: z.number().nullable().optional(),
    quote_asof: z.string().nullable().optional(),
  })
  .passthrough()

export const PlanSourceEntrySchema = z
  .object({
    kind: z.string().optional(),
    text: z.string().optional(),
    ref: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
  })
  .passthrough()

export const StrategyPlanSchema = z
  .object({
    strategy_plan_id: z.number(),
    account_id: z.string(),
    symbol: z.string(),
    structure_label: z.string(),
    strategy_structure_id: z.number().nullable(),
    strategy_opportunity_id: z.number().nullable(),
    legs_json: z.array(PlanLegSchema),
    qty: z.number(),
    price_effect: z.enum(['credit', 'debit']).nullable(),
    limit_price: z.number().nullable(),
    target_kind: z.enum(['credit_pct', 'option_price', 'underlying_price']).nullable(),
    target_value: z.number().nullable(),
    stop_kind: z.enum(['credit_multiple', 'option_price', 'underlying_price']).nullable(),
    stop_value: z.number().nullable(),
    exit_by: z.string().nullable(),
    rationale: z.string().nullable(),
    source_kind: z.enum(['manual', 'symbol', 'hypothesis', 'inbox_draft', 'roll']),
    source_ref: z.string().nullable(),
    source_json: z.array(PlanSourceEntrySchema),
    status: z.enum(['draft', 'intended', 'filled', 'cancelled']),
    effective_status: z.enum(['draft', 'intended', 'expired', 'filled', 'cancelled']),
    expires_at: z.string().nullable(),
    intended_at: z.string().nullable(),
    filled_at: z.string().nullable(),
    cancelled_at: z.string().nullable(),
    strategy_instance_id: z.number().nullable(),
    parent_strategy_plan_id: z.number().nullable(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
  })
  .passthrough()

export const StrategyPlansResponseSchema = z
  .object({
    items: z.array(StrategyPlanSchema),
    count: z.number(),
  })
  .passthrough()

export type StrategyPlan = z.infer<typeof StrategyPlanSchema>
export type PlanLeg = z.infer<typeof PlanLegSchema>
export type PlanSourceEntry = z.infer<typeof PlanSourceEntrySchema>
export type StrategyPlansResponse = z.infer<typeof StrategyPlansResponseSchema>
export type PlanEffectiveStatus = StrategyPlan['effective_status']
export type PlanSourceKind = StrategyPlan['source_kind']
export type PlanTargetKind = NonNullable<StrategyPlan['target_kind']>
export type PlanStopKind = NonNullable<StrategyPlan['stop_kind']>
