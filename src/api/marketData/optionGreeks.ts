/**
 * Vendor option Greeks from the market-data warehouse.
 *
 * Owner decision, 2026-09-05: the Trade domain reads Greeks from the Golden
 * Source rather than re-deriving them. The reasons were measured — the warehouse
 * already carries iv/delta/gamma/theta/vega for all twelve underlyings in the
 * book, refreshed daily, while the Trade side's own path implies vol from option
 * mids that a STK-only ingest filter guarantees are never written.
 *
 * This is a read across the domain boundary and stays one: nothing here writes,
 * and every value carries the timestamp it was captured at, because these are
 * end-of-day figures standing next to live prices and the difference has to be
 * visible rather than assumed.
 */
import { marketDataPluginUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { ChainExpirationsResponseSchema, OptionSnapshotsResponseSchema } from '@/lib/schemas/marketData'

export interface VendorGreeksRow {
  option_ticker: string
  underlying: string
  snapshot_ts: string | null
  iv: number | null
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  open_interest: number | null
  day_close: number | null
  /** The session's traded contracts; on the row though not in the schema's required set. */
  day_volume?: number | null
}

const validateSnapshots = withValidation<OptionSnapshotsResponse>(
  OptionSnapshotsResponseSchema,
  'market-data/options/snapshots',
)

export interface OptionSnapshotsResponse {
  symbol: string
  expiration: string | null
  rows: VendorGreeksRow[]
  count: number
  source: string
}

/**
 * One underlying's chain for one expiry.
 *
 * Scoped by expiry on purpose: a full chain runs to thousands of contracts and
 * the page only ever needs the handful of expiries it actually holds.
 */
export async function fetchOptionSnapshots(
  symbol: string,
  expiry: string,
  limit = 2000,
): Promise<OptionSnapshotsResponse> {
  const digits = expiry.replace(/\D/g, '')
  const iso =
    digits.length >= 8
      ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
      : expiry
  const qs = new URLSearchParams({ symbol, expiration: iso, limit: String(limit) })
  const res = await fetch(marketDataPluginUrl(`/market/options/snapshots?${qs}`))
  if (!res.ok) throw new Error(`market-data /options/snapshots: ${res.status}`)
  const j = validateSnapshots(await res.json()) as Partial<OptionSnapshotsResponse>
  return {
    symbol: j.symbol ?? symbol,
    expiration: j.expiration ?? iso,
    rows: Array.isArray(j.rows) ? j.rows : [],
    count: typeof j.count === 'number' ? j.count : 0,
    source: j.source ?? 'market.option_snapshot',
  }
}

const validateExpirations = withValidation<{ symbol: string; expirations: string[] }>(
  ChainExpirationsResponseSchema,
  'market-data/options/expirations',
)

/**
 * The expiries the plugin's catalogue lists for one underlying, soonest first.
 *
 * Read from the plugin rather than through `/research/option-expirations`,
 * which answers 404 on DEV (measured 2026-09-23). The catalogue keeps expiries
 * it has seen, so the past is dropped here against `today`.
 */
export async function fetchChainExpirations(symbol: string, today: string): Promise<string[]> {
  const qs = new URLSearchParams({ symbol })
  const res = await fetch(marketDataPluginUrl(`/market/options/expirations?${qs}`))
  if (!res.ok) throw new Error(`market-data /options/expirations: ${res.status}`)
  const j = validateExpirations(await res.json()) as { expirations?: unknown }
  const list = Array.isArray(j.expirations) ? j.expirations.filter((e): e is string => typeof e === 'string') : []
  return [...new Set(list.map((e) => e.slice(0, 10)))].filter((e) => e >= today).sort()
}
