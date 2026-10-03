import type {
  QuoteItem,
  QuotesResponse,
  BenchmarkResponse,
  WatchlistResponse,
  WatchlistItem,
  BarsResponse,
  BarStatsResponse,
} from '@/types/market'
import { withValidation } from '@/lib/apiValidation'
import { QuotesResponseSchema, WatchlistResponseSchema } from '@/lib/schemas/market'
import { openSseWithBackoff } from '@/lib/sse'
import { marketUrl } from '@/lib/devApiUrl'
import { HttpError, listItems, requestDelete, requestJson, type DeleteOutcome } from '@/lib/http'
import type { WatchlistBody } from '@/types/requestBodies'

const validateQuotes = withValidation<QuotesResponse>(QuotesResponseSchema, 'market/quotes')
const validateWatchlist = withValidation<WatchlistResponse>(WatchlistResponseSchema, 'market/watchlist')

export async function fetchQuotes(
  symbols: string[],
  contractKeys: string[] = []
): Promise<QuotesResponse> {
  const params = new URLSearchParams()
  if (symbols.length > 0) params.set('symbols', symbols.join(','))
  if (contractKeys.length > 0) params.set('contract_keys', contractKeys.join(','))
  return validateQuotes(await requestJson(marketUrl(`/quotes?${params}`), { label: `Market /quotes` }))
}

export interface QuotesCleanupResponse {
  removed: string[]
  kept: string[]
}

/** Unsubscribe stale on-demand STK symbols not in keepSymbols (Wave 2 cleanup). */
export async function postQuotesCleanup(keepSymbols: string[]): Promise<QuotesCleanupResponse> {
  const data = await requestJson<Partial<QuotesCleanupResponse>>(marketUrl('/quotes/cleanup'), {
    method: 'POST',
    body: { keep_symbols: keepSymbols },
    label: 'Market /quotes/cleanup',
  })
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
  let data: Partial<QuotesRefreshOptionsResponse>
  try {
    data = await requestJson<Partial<QuotesRefreshOptionsResponse>>(marketUrl('/quotes/refresh-options'), {
      method: 'POST',
      body: { contract_keys: contractKeys },
      label: 'Market /quotes/refresh-options',
    })
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return null
    throw e
  }
  return {
    registered: typeof data.registered === 'number' ? data.registered : 0,
    contract_keys: Array.isArray(data.contract_keys) ? data.contract_keys : [],
  }
}

export async function fetchBenchmarks(symbols: string[]): Promise<BenchmarkResponse> {
  const params = new URLSearchParams({ symbols: symbols.join(',') })
  return requestJson<BenchmarkResponse>(marketUrl(`/bars/benchmark?${params}`), { label: `Market /bars/benchmark` })
}

export async function fetchWatchlist(): Promise<WatchlistResponse> {
  const raw = await requestJson<Record<string, unknown>>(marketUrl('/watchlist'))
  return validateWatchlist({ ...raw, items: listItems(raw) })
}

export async function fetchBarStats(symbol: string): Promise<BarStatsResponse> {
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  return requestJson<BarStatsResponse>(marketUrl(`/bars/stats?${params}`), { label: `Market /bars/stats` })
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
  return requestJson<BarsResponse>(marketUrl(`/bars?${params}`), { label: `Market /bars` })
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
  return requestJson<BarsResponse>(marketUrl(`/bars?${q}`), { label: `Market /bars (option)` })
}

/** `WatchlistBody` (api 0.3.1): strict types, `strike` a number. */
export function postWatchlistItem(item: WatchlistBody): Promise<{ ok: boolean; error?: string }> {
  // A refusal throws with the server's reason: a real status from api 0.2.2,
  // 200 `{ ok: false, error }` before it. From api 0.3.0 a contract already on
  // the list changes only the fields sent here; nothing else is reset.
  return requestJson(marketUrl('/watchlist'), { method: 'POST', body: item })
}

/** The fields PATCH /watchlist/{contract_key} changes; `null` clears (`category_id: null` = the None list). */
export interface WatchlistItemPatch {
  category_id?: number | null
  optionable?: boolean
  display_label?: string | null
}

/**
 * Change the fields sent on a watched contract (api 0.3.0). Never inserts:
 * a contract not on the list is 404 with the reason. Answers the row.
 */
export function patchWatchlistItem(contractKey: string, patch: WatchlistItemPatch): Promise<WatchlistItem> {
  return requestJson(marketUrl(`/watchlist/${encodeURIComponent(contractKey)}`), { method: 'PATCH', body: patch })
}

/** A contract already off the list resolves as `deleted: 'gone'`. */
export function deleteWatchlistItem(contractKey: string): Promise<DeleteOutcome> {
  return requestDelete(marketUrl(`/watchlist?contract_key=${encodeURIComponent(contractKey)}`))
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
  return requestJson(marketUrl(`/market/holidays?${params}`), { label: `Market /holidays` })
}
