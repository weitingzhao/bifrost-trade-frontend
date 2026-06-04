import type {
  QuoteItem,
  QuotesResponse,
  BenchmarkResponse,
  WatchlistResponse,
  OpenOrder,
  BarsResponse,
  BarStatsResponse,
} from '@/types/market'
import type { BarsCoverageResponse } from '@/types/barsCoverage'
import { withValidation } from '@/lib/apiValidation'
import { QuotesResponseSchema, WatchlistResponseSchema } from '@/lib/schemas/market'
import { openSseWithBackoff } from '@/lib/sse'

const BASE = import.meta.env.VITE_API_MARKET as string

const validateQuotes = withValidation<QuotesResponse>(QuotesResponseSchema, 'market/quotes')
const validateWatchlist = withValidation<WatchlistResponse>(WatchlistResponseSchema, 'market/watchlist')

export async function fetchQuotes(
  symbols: string[],
  contractKeys: string[] = []
): Promise<QuotesResponse> {
  const params = new URLSearchParams()
  if (symbols.length > 0) params.set('symbols', symbols.join(','))
  if (contractKeys.length > 0) params.set('contract_keys', contractKeys.join(','))
  const res = await fetch(`${BASE}/quotes?${params}`)
  if (!res.ok) throw new Error(`Market /quotes: ${res.status}`)
  return validateQuotes(await res.json())
}

export async function fetchBenchmarks(symbols: string[]): Promise<BenchmarkResponse> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  const res = await fetch(`${BASE}/bars/benchmark?${params}`)
  if (!res.ok) throw new Error(`Market /bars/benchmark: ${res.status}`)
  return res.json() as Promise<BenchmarkResponse>
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const res = await fetch(`${BASE}/watchlist`)
  if (!res.ok) throw new Error(`Market /watchlist: ${res.status}`)
  return validateWatchlist(await res.json())
}

export interface WatchlistEodRefreshPreviewItem {
  symbol: string
  period: string
  mode?: string
  latest_ts?: number | null
  fetch_start_ts: number
  fetch_end_ts: number
  override_days?: number | null
  api_interval_sec?: number
  override_records?: {
    count: number
    times: number[]
    first_ts?: number | null
    last_ts?: number | null
  }
  gap_to_fill?: {
    start_ts: number
    end_ts: number
    has_gap: boolean
    span_seconds: number
  }
  ib_request_plan?: Array<{
    symbol: string
    period: string
    barSizeSetting: string
    durationStr: string
    endDateTime: string
    seg_start_ts: number
    seg_end_ts: number
  }>
}

export interface WatchlistEodRefreshPreviewResponse {
  ok: boolean
  error?: string
  message?: string
  preview_only?: boolean
  ready_to_enqueue?: boolean
  symbols_count?: number
  queued_jobs_if_confirmed?: number
  override_days?: number
  api_interval_sec?: number
  periods?: string[]
  symbols?: string[]
  items?: WatchlistEodRefreshPreviewItem[]
  total_override_records?: number
  total_request_chunks?: number
  failed_count?: number
  failures?: Array<{ symbol: string; period: string; error: string }>
}

export async function postWatchlistEodRefresh(
  options?: { override_days?: number; is_test?: boolean; api_interval_sec?: number },
): Promise<{
  ok: boolean
  error?: string
  message?: string
  queued_count?: number
  failed_count?: number
  symbols_count?: number
}> {
  const params = new URLSearchParams()
  if (options?.override_days != null) params.set('override_days', String(options.override_days))
  if (options?.is_test === true) params.set('is_test', '1')
  if (options?.api_interval_sec != null) params.set('api_interval_sec', String(options.api_interval_sec))
  const res = await fetch(`${BASE}/bars/watchlist/eod-refresh?${params}`, { method: 'POST' })
  const j = await res.json().catch(() => ({}))
  return {
    ok: j.ok === true,
    error: j.error,
    message: j.message,
    queued_count: j.queued_count ?? 0,
    failed_count: j.failed_count ?? 0,
    symbols_count: j.symbols_count ?? 0,
  }
}

export async function fetchWatchlistEodRefreshPreview(
  options?: { override_days?: number; api_interval_sec?: number },
): Promise<WatchlistEodRefreshPreviewResponse> {
  const params = new URLSearchParams()
  if (options?.override_days != null) params.set('override_days', String(options.override_days))
  if (options?.api_interval_sec != null) params.set('api_interval_sec', String(options.api_interval_sec))
  const res = await fetch(`${BASE}/bars/watchlist/eod-refresh/preview?${params}`, { method: 'POST' })
  const j = await res.json().catch(() => ({}))
  return {
    ok: j.ok === true,
    error: j.error,
    message: j.message,
    preview_only: j.preview_only,
    ready_to_enqueue: j.ready_to_enqueue,
    symbols_count: j.symbols_count ?? 0,
    queued_jobs_if_confirmed: j.queued_jobs_if_confirmed ?? 0,
    override_days: j.override_days,
    api_interval_sec: j.api_interval_sec,
    periods: j.periods ?? [],
    symbols: j.symbols ?? [],
    items: j.items ?? [],
    total_override_records: j.total_override_records ?? 0,
    total_request_chunks: j.total_request_chunks ?? 0,
    failed_count: j.failed_count ?? 0,
    failures: j.failures ?? [],
  }
}

export async function postIndicesRefresh(options?: { symbol?: string; days?: number }): Promise<{
  ok: boolean
  updated: string[]
  errors: string[]
}> {
  const params = new URLSearchParams()
  if (options?.symbol?.trim()) params.set('symbol', options.symbol.trim())
  if (options?.days != null && options.days > 0) params.set('days', String(options.days))
  const res = await fetch(`${BASE}/indices/refresh?${params}`, { method: 'POST' })
  const j = await res.json().catch(() => ({}))
  return {
    ok: j.ok === true,
    updated: Array.isArray(j.updated) ? j.updated : [],
    errors: Array.isArray(j.errors) ? j.errors : [],
  }
}

export async function deleteBarsForSymbol(
  symbol: string,
  periods?: string[],
): Promise<{
  ok: boolean
  error?: string
  deleted_day?: number
  deleted_min?: number
  message?: string
}> {
  const params = new URLSearchParams({ symbol: symbol.trim() })
  const init: RequestInit = { method: 'DELETE' }
  if (periods && periods.length > 0) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify({ periods })
  }
  const res = await fetch(`${BASE}/bars/symbol?${params}`, init)
  const j = await res.json().catch(() => ({}))
  return {
    ok: j.ok === true,
    error: j.error,
    deleted_day: j.deleted_day,
    deleted_min: j.deleted_min,
    message: j.message,
  }
}

export async function postBarsBackfill(
  symbol: string,
  period: string,
  options?: {
    years?: number
    days?: number
    override_days?: number
    span_hours?: number
    queue?: boolean
    is_test?: boolean
    api_interval_sec?: number
  },
): Promise<{ ok: boolean; error?: string; count?: number; message?: string; job_id?: string }> {
  const params = new URLSearchParams({ symbol: symbol.trim(), period })
  if (options?.years != null) params.set('years', String(options.years))
  if (options?.days != null) params.set('days', String(options.days))
  if (options?.override_days != null) params.set('override_days', String(options.override_days))
  if (options?.span_hours != null) params.set('span_hours', String(options.span_hours))
  if (options?.queue !== false) params.set('queue', '1')
  if (options?.is_test === true) params.set('is_test', '1')
  if (options?.api_interval_sec != null) params.set('api_interval_sec', String(options.api_interval_sec))
  const res = await fetch(`${BASE}/bars/backfill?${params}`, { method: 'POST' })
  const j = await res.json().catch(() => ({}))
  return {
    ok: j.ok === true,
    error: j.error,
    count: j.count ?? 0,
    message: j.message,
    job_id: j.job_id,
  }
}

export async function fetchBarsCoverage(symbols?: string[]): Promise<BarsCoverageResponse> {
  const params = new URLSearchParams()
  if (symbols && symbols.length > 0) params.set('symbols', symbols.join(','))
  const res = await fetch(`${BASE}/bars/coverage?${params}`)
  if (!res.ok) throw new Error(`Market /bars/coverage: ${res.status}`)
  return res.json() as Promise<BarsCoverageResponse>
}

export async function fetchMarketTradingDay(
  dateStr?: string,
): Promise<{ date: string; is_trading_day: boolean }> {
  const params = new URLSearchParams()
  if (dateStr?.trim()) params.set('date', dateStr.trim().slice(0, 10))
  const res = await fetch(`${BASE}/market/trading-day?${params}`)
  if (!res.ok) throw new Error(`Market /market/trading-day: ${res.status}`)
  return res.json() as Promise<{ date: string; is_trading_day: boolean }>
}

export async function fetchBarStats(symbol: string): Promise<BarStatsResponse> {
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  const res = await fetch(`${BASE}/bars/stats?${params}`)
  if (!res.ok) throw new Error(`Market /bars/stats: ${res.status}`)
  return res.json() as Promise<BarStatsResponse>
}

export async function fetchBars(
  symbol: string,
  period = '1 D',
  limit = 100,
): Promise<BarsResponse> {
  const params = new URLSearchParams({
    symbol,
    period,
    limit: String(limit),
  })
  const res = await fetch(`${BASE}/bars?${params}`)
  if (!res.ok) throw new Error(`Market /bars: ${res.status}`)
  return res.json() as Promise<BarsResponse>
}

export async function fetchOptionBars(params: {
  symbol: string
  expiry: string
  strike: number
  option_right: string
  period?: string
  limit?: number
  source?: string
}): Promise<BarsResponse> {
  const q = new URLSearchParams({
    asset: 'option',
    symbol: params.symbol,
    expiry: params.expiry,
    strike: String(params.strike),
    option_right: params.option_right,
    period: params.period ?? '1 D',
    limit: String(params.limit ?? 100),
    source: params.source ?? 'massive',
  })
  const res = await fetch(`${BASE}/bars?${q}`)
  if (!res.ok) throw new Error(`Market /bars (option): ${res.status}`)
  return res.json() as Promise<BarsResponse>
}

export async function postWatchlistItem(item: {
  contract_key: string
  symbol?: string
  sec_type?: string
  expiry?: string
  strike?: number
  option_right?: string
  display_label?: string
  optionable?: boolean | null
  source?: string
  category_id?: number | null
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  })
  if (!res.ok) throw new Error(`Market POST /watchlist: ${res.status}`)
  return res.json()
}

export async function deleteWatchlistItem(contractKey: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/watchlist?contract_key=${encodeURIComponent(contractKey)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Market DELETE /watchlist: ${res.status}`)
  return res.json()
}

function parseQuoteFromSSE(raw: string): QuoteItem | null {
  try {
    const d = JSON.parse(raw)
    return {
      symbol: d.symbol ?? undefined,
      contract_key: d.contract_key ?? undefined,
      last: d.last ?? null,
      bid: d.bid ?? null,
      ask: d.ask ?? null,
      mid: d.mid ?? null,
      ts: d.ts ?? undefined,
      timestamp: d.ts ?? undefined,
      change: d.change ?? null,
      sec_type: d.sec_type ?? null,
      expiry: d.expiry ?? null,
      strike: d.strike ?? null,
      option_right: d.option_right ?? null,
    }
  } catch {
    return null
  }
}

export function subscribeQuotes(onQuote: (q: QuoteItem) => void): () => void {
  return openSseWithBackoff(`${BASE}/quotes/stream`, (raw) => {
    const q = parseQuoteFromSSE(raw)
    if (q) onQuote(q)
  })
}

const MONITOR_BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchOpenOrders(): Promise<OpenOrder[]> {
  const res = await fetch(`${MONITOR_BASE}/open-orders`)
  if (!res.ok) throw new Error(`Monitor /open-orders: ${res.status}`)
  const data = await res.json()
  const result = data.open_orders ?? data.orders ?? data.items ?? data
  return Array.isArray(result) ? result : []
}
