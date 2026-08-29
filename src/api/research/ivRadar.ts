import { marketDataPluginUrl, researchEngineUrl } from '@/lib/devApiUrl'
import type { IvPercentileRow } from '@/types/ivRadar'

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

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
  const r = await fetch(`${marketDataPluginUrl('/market/analytics/iv-percentile')}?${q.toString()}`)
  if (r.status === 404) return null
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    const detail =
      typeof j.detail === 'string'
        ? j.detail
        : typeof j.error === 'string'
          ? j.error
          : `HTTP ${r.status}`
    throw new Error(detail)
  }
  const rows = Array.isArray(j.rows) ? j.rows : []
  if (rows.length === 0) return null
  // API orders trade_date DESC — take the latest
  return parseRow(rows[0] as Record<string, unknown>)
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

/** Fetch latest IV rows for many symbols; missing symbols stay null (no fabricate). */
export async function fetchIvPercentileForSymbols(
  symbols: readonly string[],
  concurrency = 4,
): Promise<Map<string, IvPercentileRow | null>> {
  const uniq = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean))]
  const rows = await mapPool(uniq, concurrency, async sym => {
    try {
      return [sym, await fetchIvPercentile(sym)] as const
    } catch {
      // Treat hard errors as no data for that symbol so one failure does not blank the radar
      return [sym, null] as const
    }
  })
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
  const r = await fetch(
    `${researchEngineUrl('/analytics/options/iv-percentile')}?${q.toString()}`,
  )
  if (r.status === 404) return []
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    const detail =
      typeof j.detail === 'string'
        ? j.detail
        : typeof j.error === 'string'
          ? j.error
          : `HTTP ${r.status}`
    throw new Error(detail)
  }
  const rows = Array.isArray(j.rows) ? j.rows : []
  const parsed = rows
    .map((raw) => parseRow(raw as Record<string, unknown>))
    .filter((row): row is IvPercentileRow => row != null)
  return parsed.sort((a, b) => (a.trade_date ?? '').localeCompare(b.trade_date ?? ''))
}

