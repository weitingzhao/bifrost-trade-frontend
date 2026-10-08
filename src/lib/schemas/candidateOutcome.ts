import { z } from 'zod'

/**
 * Candidate outcome (research 0.186.0).
 *
 * Prices and returns are Postgres numerics, so they arrive as strings. A
 * missing regime key is drift; a null regime is a candidate nobody labelled.
 * `by_regime` is absent unless the summary was asked with `by_regime=true`.
 * `hit_rate` stays nullable: nothing judged is not a 0% rate.
 */

const outcomeDecimal = z.union([z.number(), z.string(), z.null()])

export const CandidateOutcomeRegimeSliceSchema = z
  .object({
    regime: z.string().nullable(),
    horizon_days: z.number(),
    settled: z.number(),
    judged: z.number(),
    hits: z.number(),
    hit_rate: z.number().nullable(),
    avg_excess: z.number().nullable(),
  })
  .passthrough()

export const CandidateOutcomeHorizonSchema = z
  .object({
    horizon_days: z.number(),
    settled: z.number(),
    judged: z.number(),
    hits: z.number(),
    hit_rate: z.number().nullable(),
    avg_return: z.number().nullable(),
    avg_benchmark: z.number().nullable(),
    avg_excess: z.number().nullable(),
  })
  .passthrough()

export const CandidateOutcomeSummarySchema = z
  .object({
    candidates: z.number(),
    pending: z.number(),
    horizons: z.array(CandidateOutcomeHorizonSchema),
    by_regime: z.array(CandidateOutcomeRegimeSliceSchema).optional(),
  })
  .passthrough()

export const CandidateOutcomeRowSchema = z
  .object({
    candidate_id: z.string(),
    symbol: z.string(),
    trade_date: z.string().nullable(),
    horizon_days: z.number(),
    entry_close: outcomeDecimal,
    exit_close: outcomeDecimal,
    exit_date: z.string().nullable(),
    forward_return: outcomeDecimal,
    benchmark_symbol: z.string().nullable(),
    benchmark_return: outcomeDecimal,
    excess_return: outcomeDecimal,
    hit: z.boolean().nullable(),
    source: z.string().nullable(),
    regime: z.string().nullable(),
    regime_scope: z.string().nullable(),
    regime_date: z.string().nullable(),
  })
  .passthrough()

export const CandidateOutcomeRowsSchema = z
  .object({
    rows: z.array(CandidateOutcomeRowSchema),
    count: z.number(),
  })
  .passthrough()
