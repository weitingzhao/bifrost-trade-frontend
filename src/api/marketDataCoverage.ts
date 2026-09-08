/**
 * Watchlist coverage, from the Market Data Plugin.
 *
 * The Trade frontend once asked the Massive REST API for a per-symbol matrix of
 * eighteen tables. That API was retired (P7) and the question moved to the
 * plugin, which answers it in a different and much smaller shape: an inventory,
 * a set of quality checks, a per-symbol option row, and a table census. The
 * components written for the old shape were never rewired and their
 * `WatchlistDbCoverageSymbolRow` has no source anywhere — these types are
 * modelled on what the plugin actually returns.
 *
 * Reached through the Trade gateway (`/api/plugin/market-data`), which is how
 * this frontend is configured to see the plugin in DEV and PROD alike.
 */
import { z } from 'zod'
import { withValidation } from '@/lib/apiValidation'
import { marketDataPluginUrl } from '@/lib/devApiUrl'

const BASE = '/market/coverage'

/**
 * The plugin ships on its own chain, so these guard the envelope rather than
 * the contents: `.passthrough()` everywhere, every field it might not send
 * optional. A drift warns in dev and passes through in production, which is the
 * house rule — a blank panel is worse than a field this page does not know.
 */
async function getJson<T>(path: string, validate: (d: unknown) => T, signal?: AbortSignal): Promise<T> {
  const res = await fetch(marketDataPluginUrl(`${BASE}${path}`), { signal })
  if (!res.ok) throw new Error(`Market Data Plugin ${path}: HTTP ${res.status}`)
  return validate(await res.json())
}

const num = z.number().nullable().optional()
const str = z.string().nullable().optional()

const InventorySchema = z
  .object({
    ok: z.boolean(),
    scope: str,
    watchlist_symbols: z.array(z.string()).optional(),
    stock_daily: z.object({ symbols: num, total_rows: num, min_date: str, max_date: str }).passthrough().nullable().optional(),
    stock_min: z.object({}).passthrough().nullable().optional(),
    option: z.object({}).passthrough().nullable().optional(),
    analytics: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .passthrough()

const QualitySchema = z
  .object({
    ok: z.boolean(),
    summary: str,
    watchlist_source_count: num,
    checks: z.array(z.object({ check: z.string(), ok: z.boolean() }).passthrough()).optional(),
  })
  .passthrough()

const WatchlistSchema = z
  .object({
    ok: z.boolean(),
    source: str,
    symbols_count: num,
    symbols: z
      .array(z.object({ symbol: z.string(), contract_count: num, expiries: num, newest_contract_ts: str }).passthrough())
      .optional(),
  })
  .passthrough()

const DbSummarySchema = z
  .object({
    ok: z.boolean(),
    source: str,
    counts: z.record(z.string(), z.number()).optional(),
    freshness: z.array(z.object({ dimension: z.string() }).passthrough()).optional(),
    generated_at: str,
  })
  .passthrough()

export interface CoverageInventory {
  ok: boolean
  scope?: string
  watchlist_symbols?: string[]
  stock_daily?: { symbols?: number; total_rows?: number; min_date?: string | null; max_date?: string | null } | null
  stock_min?: { symbols?: number; total_rows?: number } | null
  option?: {
    underlyings?: number
    total_contracts?: number
    total_expiries?: number
    snapshot_symbols?: number
    snapshot_latest?: string | null
    oi_symbols?: number
    oi_latest?: string | null
  } | null
  analytics?: Record<string, { symbols?: number; days?: number; latest?: string | null } | null> | null
}

export interface CoverageQualityCheck {
  check: string
  ok: boolean
  [k: string]: unknown
}

export interface CoverageQuality {
  ok: boolean
  /** "PASS" / "FAIL" — the plugin's own verdict over the checks below. */
  summary?: string
  watchlist_source_count?: number
  checks?: CoverageQualityCheck[]
}

export interface CoverageWatchlistRow {
  symbol: string
  contract_count?: number | null
  expiries?: number | null
  newest_contract_ts?: string | null
}

export interface CoverageWatchlist {
  ok: boolean
  source?: string
  symbols_count?: number
  symbols?: CoverageWatchlistRow[]
}

export interface CoverageFreshnessRow {
  dimension: string
  last_run_at?: string | null
  rows_written?: number | null
  status?: string | null
  updated_at?: string | null
}

export interface CoverageDbSummary {
  ok: boolean
  source?: string
  counts?: Record<string, number>
  freshness?: CoverageFreshnessRow[]
  generated_at?: string | null
}

const vInventory = withValidation<CoverageInventory>(InventorySchema, 'market-data/coverage/inventory')
const vQuality = withValidation<CoverageQuality>(QualitySchema, 'market-data/coverage/quality-score')
const vWatchlist = withValidation<CoverageWatchlist>(WatchlistSchema, 'market-data/coverage/watchlist')
const vDbSummary = withValidation<CoverageDbSummary>(DbSummarySchema, 'market-data/coverage/db-summary')

export const fetchCoverageInventory = (signal?: AbortSignal) => getJson('/inventory', vInventory, signal)
export const fetchCoverageQuality = (signal?: AbortSignal) => getJson('/quality-score', vQuality, signal)
export const fetchCoverageWatchlist = (signal?: AbortSignal) => getJson('/watchlist', vWatchlist, signal)
export const fetchCoverageDbSummary = (signal?: AbortSignal) => getJson('/db-summary', vDbSummary, signal)
