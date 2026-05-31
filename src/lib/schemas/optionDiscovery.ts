import { z } from 'zod'

const OptionSnapshotRowSchema = z.object({
  strike: z.number(),
  right: z.string(),
  snapshot_ts: z.string().nullable().optional(),
  mark: z.number().nullable().optional(),
  bid: z.number().nullable().optional(),
  ask: z.number().nullable().optional(),
  last: z.number().nullable().optional(),
  mid: z.number().nullable().optional(),
  iv: z.number().nullable().optional(),
  delta: z.number().nullable().optional(),
  gamma: z.number().nullable().optional(),
  theta: z.number().nullable().optional(),
  vega: z.number().nullable().optional(),
  open_interest: z.number().nullable().optional(),
  underlying_ticker: z.string().nullable().optional(),
}).passthrough()

export const OptionSnapshotsPgResponseSchema = z.object({
  symbol: z.string(),
  expiration: z.string(),
  underlying_price: z.number().optional(),
  rows: z.array(OptionSnapshotRowSchema),
  error: z.string().optional(),
  warning: z.string().optional(),
}).passthrough()

export const OptionExpirationsResponseSchema = z.object({
  symbol: z.string(),
  expirations: z.array(z.string()),
  strikes: z.array(z.number()).optional(),
  last_price: z.number().optional(),
  error: z.string().optional(),
  provider: z.string().optional(),
}).passthrough()

export const MassiveStatusResponseSchema = z.object({
  configured: z.boolean(),
  tier: z.string(),
  delay_notice: z.string(),
  trades_enabled: z.boolean(),
  daily_full_backfill_years: z.number(),
}).passthrough()

const MassiveDailyDimBlockSchema = z.object({
  status: z.string().optional(),
  rows: z.number().optional(),
  last_ts: z.string().optional(),
  trade_date: z.string().optional(),
  last_trade_date: z.string().nullable().optional(),
  last_sync: z.string().optional(),
  connected: z.boolean().optional(),
  last_msg_age_s: z.number().nullable().optional(),
}).passthrough()

export const MassiveDailyChecklistResponseSchema = z.object({
  ok: z.boolean(),
  trade_date: z.string().optional(),
  symbols: z.record(z.string(), z.record(z.string(), MassiveDailyDimBlockSchema)).optional(),
  error: z.string().optional(),
}).passthrough()

export const GreeksCoverageResponseSchema = z.object({
  ok: z.boolean(),
  symbol: z.string().optional(),
  expiration: z.string().optional(),
  coverage_pct: z.number().optional(),
  rows_with_greeks: z.number().optional(),
  rows_total: z.number().optional(),
  error: z.string().optional(),
}).passthrough()

export const MaxPainComputeResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  symbol: z.string().optional(),
  expiry: z.string().optional(),
  max_pain_strike: z.number().optional(),
}).passthrough()

export const IvTermStructureResponseSchema = z.object({
  ok: z.boolean(),
  symbol: z.string().optional(),
  points: z.array(z.record(z.string(), z.unknown())).optional(),
  error: z.string().optional(),
}).passthrough()
