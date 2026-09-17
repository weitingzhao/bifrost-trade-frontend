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

/**
 * A number the API sends as a string.
 *
 * `limit_price`, `target_value` and `stop_value` are PostgreSQL `numeric`, and
 * psycopg2 maps numeric to `Decimal`, which serialises as a JSON string —
 * the same trap `AccountTransaction.ts` documents for `ts`. Declaring them
 * `number` made every plan fetch warn about drift that was not drift, and let
 * `50.0` reach the page as the text "50.0" where a number would have read 50.
 * Parsed here once, so nothing downstream has to remember.
 */
const apiNumeric = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v),
  z.number().nullable(),
)

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
    limit_price: apiNumeric,
    target_kind: z.enum(['credit_pct', 'option_price', 'underlying_price']).nullable(),
    target_value: apiNumeric,
    stop_kind: z.enum(['credit_multiple', 'option_price', 'underlying_price']).nullable(),
    stop_value: apiNumeric,
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
