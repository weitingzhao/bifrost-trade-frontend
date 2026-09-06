import { z } from 'zod'

/** Structural validation only — detailed unions live in types/modelAnalysis.ts */
export const ModelAnalysisResponseSchema = z
  .object({
    account_id: z.string(),
    // Core answers `{}` for an account it has no summary for; each field is
    // optional so that validates instead of failing the whole response.
    account_summary: z.object({
      net_liquidation: z.number().nullable().optional(),
      total_cash: z.number().nullable().optional(),
      buying_power: z.number().nullable().optional(),
    }),
    per_underlying: z.array(z.record(z.string(), z.unknown())),
    account_rollups: z.object({
      total_car: z.number().nullable(),
      car_has_unbounded: z.boolean(),
      weighted_annualized_return: z.number().nullable(),
      total_delta: z.number().nullable(),
      total_delta_dollars: z.number().nullable(),
    }),
    account_stress: z
      .object({
        available: z.boolean(),
        iv_stress_available: z.boolean().optional(),
        scenarios: z.array(z.record(z.string(), z.unknown())).optional(),
      })
      .passthrough(),
    disclaimer: z.string(),
    method: z.string(),
  })
  .passthrough()
