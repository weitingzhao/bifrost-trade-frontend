import type {
  ScreenerFilters,
  ScreenerResponse,
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

export async function fetchGreeks(
  symbol: string,
  tradeDate: string,
  expiration?: string,
): Promise<GreeksResponse> {
  const qs = new URLSearchParams({ symbol, trade_date: tradeDate })
  if (expiration) qs.set('expiration', expiration)
  const res = await fetch(`${BASE}/research/greeks?${qs}`)
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GET /research/greeks: ${res.status} — ${detail}`)
  }
  return res.json() as Promise<GreeksResponse>
}

export async function fetchGreeksAvailableDates(symbol: string): Promise<string[]> {
  const res = await fetch(`${BASE}/research/greeks/available-dates?symbol=${encodeURIComponent(symbol)}`)
  if (!res.ok) throw new Error(`GET /research/greeks/available-dates: ${res.status}`)
  return res.json() as Promise<string[]>
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
