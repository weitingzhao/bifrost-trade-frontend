import { z } from 'zod'

/**
 * Vendor option snapshots from the market-data warehouse.
 *
 * Validated because this crosses a domain boundary: Trade reads figures the
 * Research pipeline ingests from a third party, and the two ship on separate
 * chains. A field that quietly changes type there would otherwise surface here
 * as a Greek that silently stops contributing to a portfolio total.
 *
 * Greeks are nullable throughout — the vendor genuinely returns rows with none,
 * and the join treats those as unmatched rather than as zero.
 */
export const VendorGreeksRowSchema = z
  .object({
    option_ticker: z.string(),
    underlying: z.string(),
    snapshot_ts: z.string().nullable(),
    iv: z.number().nullable(),
    delta: z.number().nullable(),
    gamma: z.number().nullable(),
    theta: z.number().nullable(),
    vega: z.number().nullable(),
  })
  .passthrough()

export const OptionSnapshotsResponseSchema = z
  .object({
    symbol: z.string(),
    expiration: z.string().nullable(),
    rows: z.array(VendorGreeksRowSchema),
    count: z.number(),
  })
  .passthrough()

/**
 * Listed expiries (and one expiry's strikes) from the plugin's own catalogue.
 * Past expiries stay in the list — the catalogue keeps what it has seen — so a
 * reader filters to the ones still ahead.
 */
export const ChainExpirationsResponseSchema = z
  .object({
    symbol: z.string(),
    expirations: z.array(z.string()),
    strikes: z.array(z.number()).optional(),
  })
  .passthrough()

/**
 * Ticker search from the Market Data Plugin. Only `symbol` is guaranteed — the
 * vendor omits the descriptive fields for thinly-listed names, and the picker
 * has to render those rows anyway.
 */
export const TickerHitSchema = z.object({ symbol: z.string() }).passthrough()

export const TickerSearchResponseSchema = z.array(TickerHitSchema)

/**
 * One corporate action as the plugin stores it.
 *
 * `amount` is per share for a dividend and null for a split; `ratio_from` /
 * `ratio_to` are the other way round. `description` carries the vendor's own
 * annotation — a payment frequency for a dividend ("4", "12"), an adjustment
 * type for a split — and is passed through rather than parsed.
 */
export const CorporateActionSchema = z
  .object({
    symbol: z.string(),
    action_type: z.string(),
    ex_date: z.string().nullable(),
    record_date: z.string().nullable(),
    payment_date: z.string().nullable(),
    ratio_from: z.number().nullable(),
    ratio_to: z.number().nullable(),
    amount: z.number().nullable(),
    currency: z.string().nullable(),
  })
  .passthrough()

export const CorporateActionsResponseSchema = z
  .object({
    ok: z.boolean(),
    symbol: z.string(),
    rows: z.array(CorporateActionSchema),
    count: z.number(),
  })
  .passthrough()

/**
 * One option contract's daily OHLCV, and one underlying's.
 *
 * These are what let Review read a trade's own path rather than only its two
 * ends. Same boundary as the snapshots above — a third-party ingest on its own
 * release chain — and the same treatment: the shape is checked, the numbers are
 * nullable where the vendor genuinely leaves them out, and a bar that fails to
 * parse drops rather than becoming a zero on a P&L curve.
 */
export const OptionDailyBarSchema = z
  .object({
    option_ticker: z.string(),
    bar_date: z.string(),
    open: z.number().nullable(),
    high: z.number().nullable(),
    low: z.number().nullable(),
    close: z.number().nullable(),
  })
  .passthrough()

export const OptionDailyResponseSchema = z
  .object({
    ok: z.boolean(),
    rows: z.array(OptionDailyBarSchema),
  })
  .passthrough()

export const StockDailyBarSchema = z
  .object({
    symbol: z.string(),
    bar_time: z.string(),
    close: z.number().nullable(),
  })
  .passthrough()

export const StockDailyResponseSchema = z
  .object({
    ok: z.boolean(),
    data: z.record(z.string(), z.array(StockDailyBarSchema)),
  })
  .passthrough()
