import { massiveUrl } from '@/lib/devApiUrl'
import type { DbCoverageSummaryResponse } from '@/types/watchlistDbCoverage'
import type {
  BarQualityDetailResponse,
  OptionBarsContractsGapResult,
  OptionContractsReferenceGapResult,
  OptionDayFillEligibilityRow,
  OptionMinFillEligibilityRow,
  OptionSnapshotsContractsGapResult,
  WatchlistDbCoverageResponse,
} from '@/types/watchlistDbCoverage'

async function parseJson<T>(r: Response): Promise<T> {
  return r.json().catch(() => ({})) as Promise<T>
}

export type {
  DbCoverageSummaryRow,
  DbCoverageSummaryResponse,
} from '@/types/watchlistDbCoverage'

export async function fetchDbCoverageSummary(): Promise<DbCoverageSummaryResponse> {
  const r = await fetch(massiveUrl('/research/massive/db-coverage-summary'))
  const j = await parseJson<DbCoverageSummaryResponse & { error?: string }>(r)
  if (!r.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  }
  if (j.ok === false) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : 'Request failed' }
  }
  return j
}

export async function fetchWatchlistDbCoverage(): Promise<WatchlistDbCoverageResponse> {
  const r = await fetch(massiveUrl('/research/massive/watchlist-db-coverage'))
  const j = await parseJson<WatchlistDbCoverageResponse & { error?: string }>(r)
  if (!r.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  }
  return j
}

export type OptionContractsReferenceGapRequestOptions = {
  max_expiries?: number
  max_pages_per_expiry?: number
}

export async function postOptionContractsReferenceGapBatch(
  symbols: string[],
  options?: OptionContractsReferenceGapRequestOptions,
): Promise<{
  ok: boolean
  error?: string
  results?: Record<string, OptionContractsReferenceGapResult>
}> {
  const uniq = [...new Set(symbols.map(x => (x || '').trim().toUpperCase()).filter(Boolean))]
  if (uniq.length === 0) return { ok: false, error: 'symbols is required' }
  const body: Record<string, unknown> = { symbols: uniq }
  if (options?.max_expiries != null) body.max_expiries = options.max_expiries
  if (options?.max_pages_per_expiry != null) body.max_pages_per_expiry = options.max_pages_per_expiry
  const r = await fetch(massiveUrl('/research/massive/option-contracts-reference-gap/batch'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await parseJson<{ ok: boolean; error?: string; results?: Record<string, OptionContractsReferenceGapResult> }>(r)
  if (!r.ok) return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  return j
}

export async function fetchOptionSnapshotsContractsGap(
  symbol: string,
): Promise<OptionSnapshotsContractsGapResult> {
  const s = (symbol || '').trim().toUpperCase()
  if (!s) return { ok: false, error: 'symbol is required' }
  const r = await fetch(
    massiveUrl(`/research/massive/option-snapshots-contracts-gap?symbol=${encodeURIComponent(s)}`),
  )
  const j = await parseJson<OptionSnapshotsContractsGapResult & { error?: string }>(r)
  if (!r.ok) return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  return j
}

export async function postOptionBarsContractsGapBatch(
  symbols: string[],
  table: 'option_day' | 'option_min',
  period?: string,
): Promise<{ ok: boolean; error?: string; results?: Record<string, OptionBarsContractsGapResult> }> {
  const uniq = [...new Set(symbols.map(x => (x || '').trim().toUpperCase()).filter(Boolean))]
  if (uniq.length === 0) return { ok: false, error: 'symbols is required' }
  const r = await fetch(massiveUrl('/research/massive/option-bars-contracts-gap/batch'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: uniq, table, ...(period ? { period } : {}) }),
  })
  const j = await parseJson<{
    ok: boolean
    error?: string
    results?: Record<string, OptionBarsContractsGapResult>
  }>(r)
  if (!r.ok) return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  return j
}

export async function postOptionMinFillEligibility(
  symbols: string[],
  period: string,
  lookbackDays?: number,
): Promise<{
  ok: boolean
  error?: string
  results?: Record<string, OptionMinFillEligibilityRow>
}> {
  const uniq = [...new Set(symbols.map(x => (x || '').trim().toUpperCase()).filter(Boolean))]
  if (uniq.length === 0) return { ok: false, error: 'symbols is required' }
  const body: Record<string, unknown> = { symbols: uniq, period: (period || '').trim() }
  if (lookbackDays != null && lookbackDays > 0) body.lookback_days = lookbackDays
  const r = await fetch(massiveUrl('/research/massive/option-min-fill-eligibility'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await parseJson<{
    ok: boolean
    error?: string
    results?: Record<string, OptionMinFillEligibilityRow>
  }>(r)
  if (!r.ok) return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  return j
}

export async function postOptionDayFillEligibility(
  symbols: string[],
  columnLookbackDays?: number,
): Promise<{
  ok: boolean
  error?: string
  results?: Record<string, OptionDayFillEligibilityRow>
}> {
  const uniq = [...new Set(symbols.map(x => (x || '').trim().toUpperCase()).filter(Boolean))]
  if (uniq.length === 0) return { ok: false, error: 'symbols is required' }
  const body: Record<string, unknown> = { symbols: uniq }
  if (columnLookbackDays != null && columnLookbackDays > 0) body.column_lookback_days = columnLookbackDays
  const r = await fetch(massiveUrl('/research/massive/option-day-fill-eligibility'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const j = await parseJson<{
    ok: boolean
    error?: string
    results?: Record<string, OptionDayFillEligibilityRow>
  }>(r)
  if (!r.ok) return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  return j
}

export async function fetchBarQualityDetail(
  symbol: string,
  table: 'option_day' | 'option_min',
  period?: string,
  days?: number,
): Promise<BarQualityDetailResponse> {
  const s = (symbol || '').trim().toUpperCase()
  if (!s) {
    return {
      ok: false,
      symbol: '',
      table,
      latest_date: null,
      daily: [],
      expiries: [],
      periods: [],
      error: 'symbol is required',
    }
  }
  const q = new URLSearchParams({ symbol: s, table })
  if (period) q.set('period', period)
  if (days) q.set('days', String(days))
  const r = await fetch(massiveUrl(`/research/massive/bar-quality-detail?${q}`))
  const j = await parseJson<BarQualityDetailResponse & { error?: string }>(r)
  if (!r.ok) {
    return {
      ok: false,
      symbol: s,
      table,
      latest_date: null,
      daily: [],
      expiries: [],
      periods: [],
      error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}`,
    }
  }
  return j
}
