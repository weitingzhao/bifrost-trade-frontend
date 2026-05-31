import { z } from 'zod'

const passCountBucketSchema = z.object({
  conditions_passed: z.number(),
  symbol_count: z.number(),
})

const conditionStatSchema = z.object({
  id: z.string(),
  label: z.string(),
  pass: z.number(),
  fail: z.number(),
})

export const SepaCriteriaStatsSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  universe_count: z.number(),
  computed_at: z.string(),
  fundamental: z.object({
    cached_count: z.number(),
    fund_pass_count: z.number(),
    no_data_count: z.number(),
    conditions: z.array(conditionStatSchema),
    pass_count_distribution: z.array(passCountBucketSchema).optional(),
  }),
  technical: z.object({
    total_in_snapshot: z.number(),
    price_ready_count: z.number(),
    fund_cached_count: z.number(),
    both_ready: z.number(),
    bars_ge_252: z.number(),
    bars_ge_240: z.number(),
    bars_ge_200: z.number(),
    bars_lt_200: z.number(),
    no_bars: z.number(),
    failure_reasons: z.array(z.object({ notes: z.string().nullable(), cnt: z.number() })),
    tech_cached_count: z.number(),
    tech_pass_count: z.number(),
    tech_insufficient_count: z.number(),
    conditions: z.array(conditionStatSchema),
    pass_count_distribution: z.array(passCountBucketSchema).optional(),
  }),
})

export const ReadinessSnapshotRowSchema = z.object({
  symbol: z.string(),
  found: z.boolean(),
  as_of_date: z.string().nullable().optional(),
  included_in_universe: z.boolean().optional(),
  price_ready: z.boolean().optional(),
  bar_count_lookback: z.number().optional(),
  income_stmt_ready: z.boolean().optional(),
  income_stmt_q_count: z.number().optional(),
  income_stmt_a_count: z.number().optional(),
  balance_sheet_present: z.boolean().optional(),
  cash_flow_present: z.boolean().optional(),
  ratios_present: z.boolean().optional(),
  short_interest_present: z.boolean().optional(),
  short_volume_present: z.boolean().optional(),
  fundamental_pass_count: z.number().optional(),
  fundamental_insufficient: z.boolean().optional(),
  passed_conditions: z.array(z.string()).optional(),
  technical_pass: z.boolean().optional(),
  technical_pass_count: z.number().optional(),
  technical_insufficient: z.boolean().optional(),
  passed_tech_conditions: z.array(z.string()).optional(),
})

export const SymbolsReadinessSnapshotSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  as_of_date: z.string().nullable().optional(),
  count: z.number().optional(),
  symbols: z.array(ReadinessSnapshotRowSchema).optional(),
})
