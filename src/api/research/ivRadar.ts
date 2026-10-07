import { marketDataPluginUrl, researchEngineUrl } from '@/lib/devApiUrl'
import type { IvPercentileRow } from '@/types/ivRadar'
import { numOrNull } from '@/lib/researchParseHelpers'
import { withValidation } from '@/lib/apiValidation'
import { HttpError, requestJson } from '@/lib/http'
import {
  IvPercentileRowSchema,
} from '@/lib/schemas/researchData'

/**
 * parseRow coerces and drops unusable rows, which keeps the UI alive but says
 * nothing when the contract moves. The schema is the half that speaks up: it
 * warns in dev on drift, then hands the row to parseRow either way.
 */
const validateIvRow = withValidation<Record<string, unknown>>(
  IvPercentileRowSchema,
  'research/iv-percentile',
)

function parseRow(raw: Record<string, unknown>): IvPercentileRow | null {
  const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim().toUpperCase() : ''
  if (!symbol) return null
  return {
    symbol,
    trade_date: typeof raw.trade_date === 'string' ? raw.trade_date : null,
    iv_current: numOrNull(raw.iv_current),
    iv_percentile_1y: numOrNull(raw.iv_percentile_1y),
    iv_rank_1y: numOrNull(raw.iv_rank_1y),
    lookback_days: numOrNull(raw.lookback_days),
    computed_at: typeof raw.computed_at === 'string' ? raw.computed_at : null,
  }
}

/**
 * Latest IV percentile/rank row for one underlying via market-data plugin proxy.
 * Returns null when the plugin has no row (404 / empty) — never fabricates IV.
 */
export async function fetchIvPercentile(symbol: string): Promise<IvPercentileRow | null> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return null
  const q = new URLSearchParams({ symbol: sym })
  let j: Record<string, unknown>
  try {
    j = await requestJson<Record<string, unknown>>(`${marketDataPluginUrl('/market/analytics/iv-percentile')}?${q.toString()}`, {
      label: 'Market Data Plugin /market/analytics/iv-percentile',
    })
  } catch (e) {
    // No rows for the symbol is a 404 on the plugin — an answer, not a failure.
    if (e instanceof HttpError && e.status === 404) return null
    throw e
  }
  const rows = Array.isArray(j.rows) ? j.rows : []
  if (rows.length === 0) return null
  // API orders trade_date DESC — take the latest
  return parseRow(validateIvRow(rows[0]))
}

/** Bounded-concurrency map for symbol lists (Wave A — no batch API required). */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = items.length
  if (n === 0) return []
  const limit = Math.max(1, Math.min(concurrency, n))
  const results: R[] = new Array(n)
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= n) return
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

/**
 * One name's IV percentile read, in three states (TD-233, CLAUDE.md §5):
 * - `row` — the plugin answered with a row;
 * - `absent` — the plugin answered that it has none (404 / empty rows): real
 *   absence, the only state a page may call "no data";
 * - `error` — the read failed (5xx, timeout, network, a bad body): unknown,
 *   which a page must say as a failed read, never as "no data".
 */
export type IvLookup =
  | { status: 'row'; row: IvPercentileRow }
  | { status: 'absent' }
  | { status: 'error'; message: string }

/** The row when there is one; null for both absent and failed (they differ in `status`). */
export function ivLookupRow(l: IvLookup | undefined): IvPercentileRow | null {
  return l?.status === 'row' ? l.row : null
}

/** Read one name into an `IvLookup`; a failure stays a failure, it is not turned into absence. */
export async function lookupIvPercentile(symbol: string): Promise<IvLookup> {
  try {
    const row = await fetchIvPercentile(symbol)
    return row ? { status: 'row', row } : { status: 'absent' }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Latest IV rows for many symbols, one `IvLookup` each. One name's failure does
 * not blank the others, and it is not reported as that name having no data.
 */
export async function fetchIvPercentileForSymbols(
  symbols: readonly string[],
  concurrency = 4,
): Promise<Map<string, IvLookup>> {
  const uniq = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))]
  const rows = await mapPool(uniq, concurrency, async sym => [sym, await lookupIvPercentile(sym)] as const)
  return new Map(rows)
}

/**
 * Last N trading days of IV Rank for sparkline (Research Engine options analytics).
 * Ordered ascending by trade_date for charting.
 */
export async function fetchIvRankHistory(
  symbol: string,
  lookbackDays = 90,
): Promise<IvPercentileRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({
    symbol: sym,
    lookback_days: String(lookbackDays),
  })
  let j: Record<string, unknown> | null
  try {
    j = await requestJson<Record<string, unknown> | null>(
      `${researchEngineUrl('/analytics/options/iv-percentile')}?${q.toString()}`,
      { label: 'Research Engine /analytics/options/iv-percentile' },
    )
  } catch (e) {
    // No rows for the symbol is a 404 — an answer, not a failure.
    if (e instanceof HttpError && e.status === 404) return []
    throw e
  }
  const rows = Array.isArray(j?.rows) ? j.rows : []
  const parsed = rows
    .map((raw) => parseRow(raw as Record<string, unknown>))
    .filter((row): row is IvPercentileRow => row != null)
  return parsed.sort((a, b) => (a.trade_date ?? '').localeCompare(b.trade_date ?? ''))
}

