import { tradeResearchUrl } from '@/lib/devApiUrl'
import type {
  ScreenerFilters,
  ScreenerResponse,
  FetchGreeksParams,
  GreeksResponse,
  TickerOverview,
  FundamentalConditionsData,
  TechnicalConditionsData,
  FundRawData,
  SymbolStatementsData,
  SymbolOptionPcrData,
} from '@/types/research'
import { withValidation } from '@/lib/apiValidation'
import {
  GreeksResponseSchema,
  ScreenerResponseSchema,
  TickerOverviewSchema,
} from '@/lib/schemas/researchData'
import { httpFailure, requestJson } from '@/lib/http'

const validateScreener = withValidation<ScreenerResponse>(
  ScreenerResponseSchema,
  'research/screener',
)
const validateGreeksShape = withValidation<unknown>(GreeksResponseSchema, 'research/greeks')
const validateTickerOverview = withValidation<TickerOverview>(
  TickerOverviewSchema,
  'research/data/ticker-overview',
)

export async function fetchScreenerResults(filters: ScreenerFilters): Promise<ScreenerResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  const url = tradeResearchUrl('/research/screener')
  const body = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== null && v !== undefined),
  )
  try {
    const j = await requestJson<ScreenerResponse>(url, {
      method: 'POST',
      body,
      signal: controller.signal,
      label: 'POST /research/screener',
    })
    return validateScreener({ ...j, groups: j.groups ?? [] })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchGreeks(params: FetchGreeksParams): Promise<GreeksResponse> {
  const s = (params.symbol || '').trim().toUpperCase()
  const defaultRate = params.risk_free_rate ?? 0.045
  if (!s) {
    return {
      ok: false,
      symbol: '',
      trade_date: params.trade_date,
      stock_price: null,
      risk_free_rate: defaultRate,
      count: 0,
      rows: [],
      error: 'symbol is required',
    }
  }
  try {
    const qs = new URLSearchParams({ symbol: s, trade_date: params.trade_date })
    if (params.risk_free_rate != null) qs.set('risk_free_rate', String(params.risk_free_rate))
    if (params.expiry) qs.set('expiry', params.expiry)
    if (params.right) qs.set('option_right', params.right)
    if (params.limit != null) qs.set('limit', String(params.limit))
    // api 0.5.0: a refusal is its status with `{ detail }` (TD-16); it lands in the catch below.
    const raw = await requestJson<unknown>(tradeResearchUrl(`/research/greeks?${qs}`), { label: 'GET /research/greeks' })
    // The coercion below already keeps the UI safe; the schema is here to say
    // so in dev when the shape moves, which the coercion never does.
    const j = validateGreeksShape(raw) as Record<string, unknown>
    return {
      ok: Boolean(j.ok),
      symbol: typeof j.symbol === 'string' ? j.symbol : s,
      trade_date: typeof j.trade_date === 'string' ? j.trade_date : params.trade_date,
      stock_price: typeof j.stock_price === 'number' ? j.stock_price : null,
      risk_free_rate: typeof j.risk_free_rate === 'number' ? j.risk_free_rate : defaultRate,
      count: typeof j.count === 'number' ? j.count : 0,
      rows: Array.isArray(j.rows) ? (j.rows as GreeksResponse['rows']) : [],
      error: j.error != null ? String(j.error) : undefined,
    }
  } catch (e) {
    return {
      ok: false,
      symbol: s,
      trade_date: params.trade_date,
      stock_price: null,
      risk_free_rate: defaultRate,
      count: 0,
      rows: [],
      error: e instanceof Error ? e.message : 'fetch failed',
    }
  }
}

export async function fetchGreeksAvailableDates(symbol: string): Promise<string[]> {
  const s = (symbol || '').trim().toUpperCase()
  if (!s) return []
  // A failure throws (TD-50 batch 4, Owner 10-03): "no dates" is only what the server says.
  const j = await requestJson<Record<string, unknown> | string[]>(
    tradeResearchUrl(`/research/greeks/available-dates?symbol=${encodeURIComponent(s)}`),
    { label: 'GET /research/greeks/available-dates' },
  )
  if (Array.isArray(j)) return j
  if (Array.isArray(j.dates)) return j.dates as string[]
  return []
}

export async function fetchTickerOverview(symbol: string): Promise<TickerOverview> {
  const sym = symbol.trim().toUpperCase()
  return requestJson(tradeResearchUrl(`/research/data/ticker-overview/${encodeURIComponent(sym)}`), {
    label: 'GET /research/data/ticker-overview',
  }).then(validateTickerOverview)
}

export async function fetchSymbolFundamentalConditions(symbol: string): Promise<FundamentalConditionsData> {
  const sym = symbol.trim().toUpperCase()
  return requestJson<FundamentalConditionsData>(
    tradeResearchUrl(`/research/data/readiness/fundamental-conditions?symbol=${encodeURIComponent(sym)}`),
    { label: 'GET /research/data/readiness/fundamental-conditions' },
  )
}

export async function fetchSymbolTechnicalConditions(symbol: string): Promise<TechnicalConditionsData> {
  const sym = symbol.trim().toUpperCase()
  return requestJson<TechnicalConditionsData>(
    tradeResearchUrl(`/research/data/readiness/symbol-technical-conditions?symbol=${encodeURIComponent(sym)}`),
    { label: 'GET /research/data/readiness/symbol-technical-conditions' },
  )
}

export async function fetchSymbolFundRawData(symbol: string): Promise<FundRawData> {
  const sym = symbol.trim().toUpperCase()
  return requestJson<FundRawData>(
    tradeResearchUrl(`/research/data/readiness/symbol-fundamental-raw-data?symbol=${encodeURIComponent(sym)}`),
    { label: 'GET /research/data/readiness/symbol-fundamental-raw-data' },
  )
}

export async function fetchSymbolStatements(symbol: string): Promise<SymbolStatementsData> {
  const sym = symbol.trim().toUpperCase()
  const empty: SymbolStatementsData = {
    ok: false,
    balance_sheets: [],
    cash_flows: [],
    ratios: [],
    short_interest: [],
    short_volume: [],
  }
  if (!sym) return { ...empty, error: 'symbol is required' }
  try {
    return await requestJson<SymbolStatementsData>(
      tradeResearchUrl(`/research/data/readiness/symbol-statements?symbol=${encodeURIComponent(sym)}`),
      { label: 'GET /research/data/readiness/symbol-statements' },
    )
  } catch (e) {
    // A refusal is the empty sheet with the server's reason; a network error still throws.
    return { ...empty, error: httpFailure(e) }
  }
}

export async function fetchSymbolOptionPcr(
  symbol: string,
  lookbackDays = 365,
): Promise<SymbolOptionPcrData> {
  const sym = symbol.trim().toUpperCase()
  const empty: SymbolOptionPcrData = { ok: false, trend: [], chain_by_expiry: [] }
  if (!sym) return { ...empty, error: 'symbol is required' }
  const url = tradeResearchUrl(
    `/research/data/readiness/symbol-option-pcr?symbol=${encodeURIComponent(sym)}&lookback_days=${lookbackDays}`,
  )
  try {
    return await requestJson<SymbolOptionPcrData>(url, { label: 'GET /research/data/readiness/symbol-option-pcr' })
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : 'Network error' }
  }
}

