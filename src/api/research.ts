import { postControlShutdown } from '@/api/apiControl'
import type {
  ScreenerFilters,
  ScreenerResponse,
  FetchGreeksParams,
  GreeksResponse,
  SepaPhase1Request,
  SepaFundamentalsRequest,
  SepaResponse,
  DataReadinessSummary,
  TickerOverview,
  FundamentalConditionsData,
  TechnicalConditionsData,
  FundRawData,
  SymbolStatementsData,
  SymbolOptionPcrData,
} from '@/types/research'
import type { MassiveCeleryBeatScheduleResponse } from '@/types/ops'

const BASE = import.meta.env.VITE_API_RESEARCH as string
const MASSIVE_BASE = import.meta.env.VITE_API_MASSIVE as string

export async function fetchScreenerResults(filters: ScreenerFilters): Promise<ScreenerResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(`${BASE}/research/screener`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`POST /research/screener: ${res.status}`)
    return res.json() as Promise<ScreenerResponse>
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
    if (params.right) qs.set('right', params.right)
    if (params.limit != null) qs.set('limit', String(params.limit))
    const res = await fetch(`${BASE}/research/greeks?${qs}`)
    const j = await res.json().catch(() => ({})) as Record<string, unknown>
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
  try {
    const res = await fetch(`${BASE}/research/greeks/available-dates?symbol=${encodeURIComponent(s)}`)
    const j = await res.json().catch(() => ({})) as Record<string, unknown>
    if (Array.isArray(j)) return j as string[]
    if (Array.isArray(j.dates)) return j.dates as string[]
    return []
  } catch {
    return []
  }
}

export async function fetchSepaPhase1(req: SepaPhase1Request): Promise<SepaResponse> {
  const res = await fetch(`${BASE}/research/screening/sepa/phase1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`POST /research/screening/sepa/phase1: ${res.status}`)
  return res.json() as Promise<SepaResponse>
}

export async function fetchSepaFundamentals(req: SepaFundamentalsRequest): Promise<SepaResponse> {
  const res = await fetch(`${BASE}/research/screening/sepa/fundamentals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`POST /research/screening/sepa/fundamentals: ${res.status}`)
  return res.json() as Promise<SepaResponse>
}

export async function fetchDataReadinessSummary(): Promise<DataReadinessSummary> {
  const res = await fetch(`${BASE}/research/data/readiness/summary`)
  if (!res.ok) throw new Error(`GET /research/data/readiness/summary: ${res.status}`)
  return res.json() as Promise<DataReadinessSummary>
}

export async function fetchTickerOverview(symbol: string): Promise<TickerOverview> {
  const sym = symbol.trim().toUpperCase()
  const res = await fetch(`${BASE}/research/data/ticker-overview/${encodeURIComponent(sym)}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GET /research/data/ticker-overview: ${res.status} — ${detail}`)
  }
  return res.json() as Promise<TickerOverview>
}

export async function fetchSymbolFundamentalConditions(symbol: string): Promise<FundamentalConditionsData> {
  const sym = symbol.trim().toUpperCase()
  const res = await fetch(`${BASE}/research/data/readiness/fundamental-conditions?symbol=${encodeURIComponent(sym)}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GET /research/data/readiness/fundamental-conditions: ${res.status} — ${detail}`)
  }
  return res.json() as Promise<FundamentalConditionsData>
}

export async function fetchSymbolTechnicalConditions(symbol: string): Promise<TechnicalConditionsData> {
  const sym = symbol.trim().toUpperCase()
  const res = await fetch(`${BASE}/research/data/readiness/symbol-technical-conditions?symbol=${encodeURIComponent(sym)}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GET /research/data/readiness/symbol-technical-conditions: ${res.status} — ${detail}`)
  }
  return res.json() as Promise<TechnicalConditionsData>
}

export async function fetchSymbolFundRawData(symbol: string): Promise<FundRawData> {
  const sym = symbol.trim().toUpperCase()
  const res = await fetch(`${BASE}/research/data/readiness/symbol-fundamental-raw-data?symbol=${encodeURIComponent(sym)}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GET /research/data/readiness/symbol-fundamental-raw-data: ${res.status} — ${detail}`)
  }
  return res.json() as Promise<FundRawData>
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
  const res = await fetch(`${BASE}/research/data/readiness/symbol-statements?symbol=${encodeURIComponent(sym)}`)
  const j = await res.json().catch(() => ({}))
  if (!res.ok) return { ...empty, error: typeof j.error === 'string' ? j.error : `HTTP ${res.status}` }
  return j as SymbolStatementsData
}

export async function fetchSymbolOptionPcr(
  symbol: string,
  lookbackDays = 365,
): Promise<SymbolOptionPcrData> {
  const sym = symbol.trim().toUpperCase()
  const empty: SymbolOptionPcrData = { ok: false, trend: [], chain_by_expiry: [] }
  if (!sym) return { ...empty, error: 'symbol is required' }
  const res = await fetch(
    `${BASE}/research/data/readiness/symbol-option-pcr?symbol=${encodeURIComponent(sym)}&lookback_days=${lookbackDays}`,
  )
  const j = await res.json().catch(() => ({}))
  if (!res.ok) return { ...empty, error: typeof j.error === 'string' ? j.error : `HTTP ${res.status}` }
  return j as SymbolOptionPcrData
}

// ── Celery Beat schedule (Massive API) ────────────────────────────────────────

export async function fetchMassiveCeleryBeatSchedule(): Promise<MassiveCeleryBeatScheduleResponse> {
  const r = await fetch(`${MASSIVE_BASE}/research/massive/celery-beat-schedule`)
  const j = await r.json().catch(() => ({})) as Record<string, unknown>
  if (!r.ok) {
    return {
      ok: false,
      error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}`,
    }
  }
  return j as unknown as MassiveCeleryBeatScheduleResponse
}

const STRATEGY_BASE = import.meta.env.VITE_API_STRATEGY as string
const MARKET_BASE = import.meta.env.VITE_API_MARKET as string

export async function postResearchShutdown(
  serviceOrigin?: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = (serviceOrigin ?? BASE).replace(/\/$/, '')
  return postControlShutdown(`${base}/shutdown`)
}

export async function postStrategyShutdown(
  serviceOrigin?: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = (serviceOrigin ?? STRATEGY_BASE).replace(/\/$/, '')
  return postControlShutdown(`${base}/strategy/shutdown`)
}

export async function postMarketShutdown(
  serviceOrigin?: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = (serviceOrigin ?? MARKET_BASE).replace(/\/$/, '')
  return postControlShutdown(`${base}/market/shutdown`)
}
