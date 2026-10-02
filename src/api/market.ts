import type {
  QuoteItem,
  QuotesResponse,
  BenchmarkResponse,
  WatchlistResponse,
  BarsResponse,
  BarStatsResponse,
} from '@/types/market'
import { withValidation } from '@/lib/apiValidation'
import { QuotesResponseSchema, WatchlistResponseSchema } from '@/lib/schemas/market'
import { openSseWithBackoff } from '@/lib/sse'
import { marketUrl } from '@/lib/devApiUrl'
import { tradeFetch } from '@/lib/tradeFetch'
import { listItems, requestJson } from '@/lib/http'

const validateQuotes = withValidation<QuotesResponse>(QuotesResponseSchema, 'market/quotes')
const validateWatchlist = withValidation<WatchlistResponse>(WatchlistResponseSchema, 'market/watchlist')

export async function fetchQuotes(
  symbols: string[],
  contractKeys: string[] = []
): Promise<QuotesResponse> {
  const params = new URLSearchParams()
  if (symbols.length > 0) params.set('symbols', symbols.join(','))
  if (contractKeys.length > 0) params.set('contract_keys', contractKeys.join(','))
  const res = await tradeFetch(marketUrl(`/quotes?${params}`))
  if (!res.ok) throw new Error(`Market /quotes: ${res.status}`)
  return validateQuotes(await res.json())
}

export interface QuotesCleanupResponse {
  removed: string[]
  kept: string[]
}

/** Unsubscribe stale on-demand STK symbols not in keepSymbols (Wave 2 cleanup). */
export async function postQuotesCleanup(keepSymbols: string[]): Promise<QuotesCleanupResponse> {
  const res = await tradeFetch(marketUrl('/quotes/cleanup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keep_symbols: keepSymbols }),
  })
  if (!res.ok) throw new Error(`Market /quotes/cleanup: ${res.status}`)
  const data = (await res.json()) as Partial<QuotesCleanupResponse>
  return {
    removed: Array.isArray(data.removed) ? data.removed : [],
    kept: Array.isArray(data.kept) ? data.kept : [],
  }
}

export interface QuotesRefreshOptionsResponse {
  registered: number
  contract_keys: string[]
}

/** Register OPT contract_keys for Gateway on-demand cache (soft-fail on 404). */
export async function postQuotesRefreshOptions(
  contractKeys: string[],
): Promise<QuotesRefreshOptionsResponse | null> {
  const res = await tradeFetch(marketUrl('/quotes/refresh-options'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contract_keys: contractKeys }),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Market /quotes/refresh-options: ${res.status}`)
  const data = (await res.json()) as Partial<QuotesRefreshOptionsResponse>
  return {
    registered: typeof data.registered === 'number' ? data.registered : 0,
    contract_keys: Array.isArray(data.contract_keys) ? data.contract_keys : [],
  }
}

export async function fetchBenchmarks(symbols: string[]): Promise<BenchmarkResponse> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  const res = await tradeFetch(marketUrl(`/bars/benchmark?${params}`))
  if (!res.ok) throw new Error(`Market /bars/benchmark: ${res.status}`)
  return res.json() as Promise<BenchmarkResponse>
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const raw = await requestJson<Record<string, unknown>>(marketUrl('/watchlist'))
  return validateWatchlist({ ...raw, items: listItems(raw) })
}

export async function fetchBarStats(symbol: string): Promise<BarStatsResponse> {
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  const res = await tradeFetch(marketUrl(`/bars/stats?${params}`))
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
  const res = await tradeFetch(marketUrl(`/bars?${params}`))
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
  const res = await tradeFetch(marketUrl(`/bars?${q}`))
  if (!res.ok) throw new Error(`Market /bars (option): ${res.status}`)
  return res.json() as Promise<BarsResponse>
}

export function postWatchlistItem(item: {
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
  // A refusal throws with the server's reason: a real status from api 0.2.2,
  // 200 `{ ok: false, error }` before it.
  return requestJson(marketUrl('/watchlist'), { method: 'POST', body: item })
}

export function deleteWatchlistItem(contractKey: string): Promise<{ ok: boolean; error?: string }> {
  return requestJson(marketUrl(`/watchlist?contract_key=${encodeURIComponent(contractKey)}`), { method: 'DELETE' })
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
  return openSseWithBackoff(marketUrl('/quotes/stream'), (raw) => {
    const q = parseQuoteFromSSE(raw)
    if (q) onQuote(q)
  })
}

/** NYSE (or another exchange's) holidays and early closes, from the market service. */
export interface MarketHolidayRow {
  exchange: string
  holiday_date: string
  label: string | null
  name?: string | null
  status?: string | null
  /** Set on an `early-close` row: the session's own hours, as UTC instants. */
  open_time?: string | null
  close_time?: string | null
  source?: string | null
}

export async function fetchMarketHolidays(
  year?: number,
  exchange?: string,
): Promise<MarketHolidayRow[]> {
  const params = new URLSearchParams()
  if (year != null) params.set('year', String(year))
  if (exchange?.trim()) params.set('exchange', exchange.trim())
  const res = await tradeFetch(marketUrl(`/market/holidays?${params}`))
  if (!res.ok) throw new Error(`Market /holidays: ${res.status}`)
  return res.json()
}
