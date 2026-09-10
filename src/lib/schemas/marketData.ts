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
 * Ticker search from the Market Data Plugin. Only `symbol` is guaranteed — the
 * vendor omits the descriptive fields for thinly-listed names, and the picker
 * has to render those rows anyway.
 */
export const TickerHitSchema = z.object({ symbol: z.string() }).passthrough()

export const TickerSearchResponseSchema = z.array(TickerHitSchema)
