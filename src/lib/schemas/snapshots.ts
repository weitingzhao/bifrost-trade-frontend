/**
 * The daily book snapshots (api 0.12.0, core 0.54.0 — TD-138 / TD-139):
 * `GET /api/account/portfolio/nav-history`, `/position-snapshots`, `/pnl-attribution`.
 *
 * Every amount is nullable: a value the snapshot could not read is null, never
 * zero, and a page must render it as a dash.
 */
import { z } from 'zod'

const num = z.number().nullable()
const numOpt = num.optional()

export const GreeksQualitySchema = z.enum(['vendor', 'degraded', 'missing'])

const QualityCountsSchema = z
  .object({ vendor: z.number(), degraded: z.number(), missing: z.number() })
  .passthrough()

export const NavRowSchema = z
  .object({
    snapshot_date: z.string(),
    account_id: z.string(),
    net_liquidation: num,
    total_cash: numOpt,
    buying_power: numOpt,
    cushion: numOpt,
    excess_liquidity: numOpt,
    maint_margin_req: numOpt,
    account_updated_at: z.string().nullable().optional(),
    session_close: z.string().nullable().optional(),
    captured_at: z.string().nullable().optional(),
  })
  .passthrough()

export const NavDroppedSchema = z
  .object({
    snapshot_date: z.string(),
    account_id: z.string(),
    account_updated_at: z.string().nullable().optional(),
    session_close: z.string().nullable().optional(),
    reason: z.string().optional(),
  })
  .passthrough()

export const NavHistoryResponseSchema = z
  .object({
    items: z.array(NavRowSchema),
    count: z.number(),
    dropped: z.array(NavDroppedSchema),
    sessions: z.array(z.string()),
  })
  .passthrough()

export const PositionSnapshotRowSchema = z
  .object({
    snapshot_date: z.string(),
    account_id: z.string(),
    contract_key: z.string(),
    trade_id: z.number().nullable(),
    symbol: z.string().nullable(),
    sec_type: z.string().nullable(),
    trade_qty: z.number(),
    multiplier: z.number(),
    mark: num,
    mark_source: z.string().nullable().optional(),
    market_value: num,
    delta: numOpt,
    delta_shares: numOpt,
    greeks_quality: GreeksQualitySchema.nullable(),
    greeks_quality_reason: z.string().nullable().optional(),
    mark_below_intrinsic: z.boolean().nullable().optional(),
    account_fresh_at_close: z.boolean().nullable().optional(),
  })
  .passthrough()

export const TradeRollupSchema = z
  .object({
    snapshot_date: z.string(),
    trade_id: z.number().nullable(),
    rows: z.number(),
    symbols: z.array(z.string()),
    market_value: num,
    delta_shares: num,
    greeks_quality: QualityCountsSchema,
  })
  .passthrough()

export const PositionSnapshotsResponseSchema = z
  .object({
    items: z.array(PositionSnapshotRowSchema),
    count: z.number(),
    trades: z.array(TradeRollupSchema),
    sessions: z.array(z.string()),
    greeks_quality: z.record(z.string(), QualityCountsSchema),
  })
  .passthrough()

export const AttributionStatusSchema = z.enum(['ok', 'opened_in_session', 'closed_in_session', 'no_mark'])

const PartsSchema = {
  held_pnl: num,
  delta_pnl: num,
  gamma_pnl: num,
  vega_pnl: num,
  theta_pnl: num,
  unexplained: num,
}

export const AttributionRowSchema = z
  .object({
    snapshot_date: z.string(),
    prior_date: z.string(),
    account_id: z.string(),
    contract_key: z.string(),
    trade_id: z.number().nullable(),
    symbol: z.string().nullable(),
    sec_type: z.string().nullable(),
    expiry: z.string().nullable().optional(),
    strike: numOpt,
    option_right: z.string().nullable().optional(),
    status: AttributionStatusSchema,
    greeks_quality: GreeksQualitySchema.nullable(),
    greeks_quality_reason: z.string().nullable().optional(),
    mark_below_intrinsic: z.array(z.string()).optional(),
    ...PartsSchema,
  })
  .passthrough()

export const AttributionSumsSchema = z
  .object({
    held_pnl: z.number(),
    delta_pnl: z.number(),
    gamma_pnl: z.number(),
    vega_pnl: z.number(),
    theta_pnl: z.number(),
    unexplained: z.number(),
    rows: z.number(),
    read_rows: z.number(),
    unread_rows: z.number(),
    unread_held_pnl: z.number(),
    mark_anomaly_rows: z.number(),
    mark_anomaly_unexplained: z.number(),
    greeks_quality: QualityCountsSchema,
    status: z.record(z.string(), z.number()),
  })
  .passthrough()

export const AttributionSessionSchema = z
  .object({
    snapshot_date: z.string(),
    prior_date: z.string(),
    status: z.enum(['ok', 'no_prior_snapshot']),
    days: z.number().optional(),
    totals: AttributionSumsSchema.nullable(),
  })
  .passthrough()

export const PnlAttributionResponseSchema = z
  .object({
    items: z.array(AttributionRowSchema),
    count: z.number(),
    sessions: z.array(AttributionSessionSchema),
    by_trade: z.array(AttributionSumsSchema.extend({ trade_id: z.number().nullable() })),
    by_symbol: z.array(AttributionSumsSchema.extend({ symbol: z.string().nullable() })),
    totals: AttributionSumsSchema,
  })
  .passthrough()

export type GreeksQuality = z.infer<typeof GreeksQualitySchema>
export type NavRow = z.infer<typeof NavRowSchema>
export type NavHistoryResponse = z.infer<typeof NavHistoryResponseSchema>
export type PositionSnapshotRow = z.infer<typeof PositionSnapshotRowSchema>
export type PositionSnapshotsResponse = z.infer<typeof PositionSnapshotsResponseSchema>
export type AttributionRow = z.infer<typeof AttributionRowSchema>
export type AttributionSums = z.infer<typeof AttributionSumsSchema>
export type AttributionSession = z.infer<typeof AttributionSessionSchema>
export type PnlAttributionResponse = z.infer<typeof PnlAttributionResponseSchema>
