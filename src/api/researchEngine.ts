/**
 * Research Engine API (port 8795) — accessed via platform-api proxy.
 *
 * All Wave 3–6 engine endpoints (terrain, forecast, GEX, momentum,
 * IV surface, order flow, event radar, settlement).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

async function get<T = unknown>(path: string): Promise<T> {
  const res = await fetch(researchEngineUrl(path))
  const ct = res.headers.get('content-type') ?? ''
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    // HTML (gateway SPA fallback / missing proxy) is a config failure — surface clearly.
    if (text.trimStart().startsWith('<!') || ct.includes('text/html')) {
      throw new Error(
        `Research Engine unreachable (got HTML instead of JSON). ` +
          `Ensure research-api :8795 is running and VITE_API_RESEARCH_ENGINE is set.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  if (!ct.includes('application/json') && !ct.includes('+json')) {
    const text = await res.text().catch(() => '')
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine returned HTML. Check Vite proxy / VITE_API_RESEARCH_ENGINE.`,
      )
    }
  }
  return res.json() as Promise<T>
}

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(researchEngineUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json()
}

// --- Terrain ---

export interface TerrainData {
  symbol: string
  trade_date: string
  pin_score: number
  trend_release: number
  vol_squeeze: number
  tail_risk: number
  expected_close: number
  gamma_zone_low: number
  gamma_zone_high: number
  regime: string
  spot: number
  inputs_json: Record<string, unknown>
  computed_at: string
}

export interface TerrainIntraday extends TerrainData {
  asof_ts: string
  prob_rangy: number
  prob_bull: number
  prob_bear: number
  prob_squeeze: number
}

export async function fetchTerrain(symbol: string, date?: string) {
  const qs = date ? `?symbol=${symbol}&trade_date=${date}` : `?symbol=${symbol}`
  const path = `/research/forecast/terrain${qs}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    // No computed terrain yet — page shows empty state, not a hard failure.
    return null
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ terrain: TerrainData; symbol: string; trade_date: string }>
}

export async function fetchTerrainIntraday(symbol: string, date?: string) {
  const qs = date ? `?symbol=${symbol}&date=${date}` : `?symbol=${symbol}`
  const path = `/research/terrain/intraday${qs}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    return { rows: [] as TerrainIntraday[], count: 0, symbol, trade_date: date ?? '' }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<{
    rows: TerrainIntraday[]
    count: number
    symbol: string
    trade_date: string
  }>
}

// --- Forecast Sessions ---

export interface ForecastSession {
  session_id: string
  symbol: string
  trade_date: string
  regime: string
  spot: number
  prob_rangy: number
  prob_bull: number
  prob_bear: number
  prob_squeeze: number
  expected_close: number
  structures_json: unknown
  narrative: string
  llm_provider: string
  advisory: string
  computed_at: string
}

export interface ForecastHourly {
  session_id: string
  symbol: string
  trade_date: string
  hour_et: number
  path_call: string
  level_low: number
  level_high: number
  level_target: number
  confidence: number
  notes: string
  computed_at: string
}

export function fetchForecastSessions(symbol?: string, date?: string) {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (date) params.set('trade_date', date)
  return get<{ rows: ForecastSession[]; count: number }>(
    `/research/forecast/sessions?${params}`,
  )
}

export function fetchForecastSessionDetail(sessionId: string) {
  return get<{
    session: ForecastSession & { terrain_json: unknown }
    hourly: ForecastHourly[]
    count_hourly: number
  }>(`/research/forecast/sessions/${sessionId}`)
}

// --- GEX ---

export interface GexIntraday {
  symbol: string
  trade_date: string
  asof_ts: string
  spot: number
  total_net_gex: number
  zero_gamma: number
  major_call_wall: number
  major_put_wall: number
  levels_json: { strike: number; call_gex: number; put_gex: number; net_gex: number }[]
  computed_at: string
}

export async function fetchGexIntraday(symbol: string, date?: string) {
  const qs = date ? `?symbol=${symbol}&date=${date}` : `?symbol=${symbol}`
  const path = `/research/gex/intraday${qs}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    return { rows: [] as GexIntraday[], count: 0, symbol, trade_date: date ?? '' }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<{
    rows: GexIntraday[]
    count: number
    symbol: string
    trade_date: string
  }>
}

export function fetchGexLevels(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  return get<{ rows: unknown[]; count: number }>(`/research/gex/levels?${params}`)
}

export function fetchGexDistribution(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  return get<{ rows: unknown[]; count: number }>(`/research/gex/distribution?${params}`)
}

// --- Momentum ---

export interface MomentumScore {
  symbol: string
  trade_date: string
  score: number
  grade: string
  path: string
  z_sdt: number
  z_v: number
  accept_vwap: number
  z_ofi: number
  h_52w: number
  o_plus: number
  a_factor: number
  r_sec: number
  crash: number
  factors_json: Record<string, unknown>
  computed_at: string
}

export function fetchMomentumRadar(opts?: {
  symbol?: string
  trade_date?: string
  grade?: string
  path?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  if (opts?.symbol) params.set('symbol', opts.symbol)
  if (opts?.trade_date) params.set('trade_date', opts.trade_date)
  if (opts?.grade) params.set('grade', opts.grade)
  if (opts?.path) params.set('path', opts.path)
  if (opts?.limit) params.set('limit', String(opts.limit))
  return get<{ rows: MomentumScore[]; count: number; symbol: string; trade_date: string }>(
    `/research/momentum/radar?${params}`,
  )
}

// --- IV / Volatility ---

export interface VolatilitySmileRow {
  symbol: string
  trade_date: string
  expiry: string
  spot: number
  fit_model: string
  smile_params: Record<string, unknown> | null
  rmse: number | null
  n_points: number | null
  computed_at: string
}

export interface AtmIvRow {
  symbol: string
  trade_date: string
  expiry: string
  atm_strike: number
  atm_iv: number
  underlying_price: number | null
  iv_source: string | null
  computed_at: string | null
}

export async function fetchVolatilitySmile(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  const path = `/research/volatility/smile?${params}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    return { rows: [] as VolatilitySmileRow[], count: 0, symbol, trade_date: date ?? null }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<{
    rows: VolatilitySmileRow[]
    count: number
    symbol: string
    trade_date: string | null
  }>
}

/** ATM IV from Research options analytics (`/analytics/options/atm-iv`). */
export async function fetchAtmIv(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  const path = `/analytics/options/atm-iv?${params}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    return { rows: [] as AtmIvRow[], count: 0, symbol, trade_date: date ?? null }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<{
    rows: AtmIvRow[]
    count: number
    symbol: string | null
    trade_date: string | null
  }>
}

export function fetchVolatilitySurface(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  return get<{ rows: unknown[]; surface_points: unknown[]; count: number }>(
    `/research/volatility/surface?${params}`,
  )
}

// --- Order Flow ---

export interface OrderSentiment {
  symbol: string
  trade_date: string
  call_notional: number
  put_notional: number
  sentiment_score: number
  call_volume: number
  put_volume: number
  call_oi: number
  put_oi: number
  pcr_volume: number
  pcr_oi: number
  expiry_concentration: number
  strike_concentration: number
  data_source: string
  notes: string
  computed_at: string
}

export interface MultiLegTrade {
  symbol: string
  trade_date: string
  cluster_id: string
  strategy_guess: string
  legs: unknown
  total_notional: number
  confidence: number
  data_source: string
  notes: string
  computed_at: string
}

export function fetchOrderSentiment(symbol?: string, date?: string) {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (date) params.set('trade_date', date)
  return get<{ rows: OrderSentiment[]; count: number }>(`/research/flow/sentiment?${params}`)
}

export function fetchMultiLegTrades(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('trade_date', date)
  return get<{ rows: MultiLegTrade[]; count: number }>(`/research/flow/multi-leg?${params}`)
}

// --- Event Radar ---

export interface EventRadarRow {
  event_id: string
  batch_id: string
  collected_at: string
  source: string
  subject: string
  event_summary: string
  affected_symbols: string
  direction: number
  certainty: number
  sentiment: number
  theme: string
  importance: number
  dropped: boolean
  drop_reason: string
  raw_text: string
  computed_at: string
}

export function fetchEventRadarEvents(opts?: {
  batch_id?: string
  limit?: number
  include_dropped?: boolean
}) {
  const params = new URLSearchParams()
  if (opts?.batch_id) params.set('batch_id', opts.batch_id)
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.include_dropped) params.set('include_dropped', 'true')
  return get<{ rows: EventRadarRow[]; count: number }>(
    `/research/event-radar/events?${params}`,
  )
}

export function runEventRadarPipeline(payload: string, source?: string) {
  return post<Record<string, unknown>>('/research/event-radar/run', {
    payload,
    source: source ?? 'console',
  })
}

export function fetchEventBatches() {
  return get<{ rows: { batch_id: string; collected_at: string; kept_count: number; dropped_count: number; total_count: number }[]; count: number }>(
    '/research/events/batches',
  )
}

export function fetchEventThemes() {
  return get<{ rows: { theme: string; count: number; direction_avg: number; sentiment_avg: number }[]; count: number }>(
    '/research/events/themes',
  )
}

export function fetchEventCalendar() {
  return get<{ rows: EventRadarRow[]; count: number }>('/research/events/calendar')
}

// --- Settlement / Backtest ---

export interface ForecastSettlement {
  settlement_id: string
  session_id: string
  symbol: string
  trade_date: string
  expected_close: number
  actual_close: number
  close_miss: number
  close_miss_pct: number
  path_hit: boolean
  path_hit_count: number
  path_total: number
  notes: string
  computed_at: string
}

export function fetchSettlements(symbol?: string, sessionId?: string) {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (sessionId) params.set('session_id', sessionId)
  return get<{ rows: ForecastSettlement[]; count: number }>(
    `/research/backtest/settlement?${params}`,
  )
}

export function fetchBacktestResults(symbol: string, start?: string, end?: string) {
  const params = new URLSearchParams({ symbol })
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  return get<Record<string, unknown>>(`/research/backtest/results?${params}`)
}

export function triggerSettlement(sessionId: string, body: {
  symbol: string
  trade_date: string
  expected_close: number
  actual_close: number
  hourly?: unknown[]
}) {
  return post<Record<string, unknown>>('/research/backtest/settle', {
    session_id: sessionId,
    ...body,
  })
}

// --- SEPA (Wave B fusion) ---

export interface SepaScoreRow {
  symbol: string
  trade_date: string
  fundamental_score: number
  trend_template_score: number
  momentum_score: number
  structure_score: number
  sepa_score: number
  grade: 'A+' | 'A' | 'B' | 'C' | 'D'
  stage: 'STAGE_1' | 'STAGE_2A' | 'STAGE_2B' | 'STAGE_2C' | 'STAGE_3' | 'STAGE_4'
  path: 'SETUP' | 'PIVOT' | 'EXTENDED' | 'WATCH' | 'AVOID'
  trend_template_pass: boolean
  fundamental_pass: boolean
  latest_close: number | null
  sma_50: number | null
  sma_150: number | null
  sma_200: number | null
  high_52w: number | null
  low_52w: number | null
  iv_percentile: number | null
  pcr_oi: number | null
  fund_pass_count: number
  tech_pass_count: number
  factors_json: Record<string, unknown>
  computed_at: string
}

export interface SepaDailyResponse {
  rows: SepaScoreRow[]
  count: number
  symbol: string | null
  trade_date: string | null
  filters: {
    stage: string | null
    path: string | null
    grade: string | null
    min_score: number | null
  }
}

export interface SepaCandidatesResponse {
  trade_date: string | null
  candidates: SepaScoreRow[]
  count: number
}

export async function fetchSepaDaily(opts?: {
  symbol?: string
  trade_date?: string
  stage?: string
  path?: string
  grade?: string
  min_score?: number
  limit?: number
}) {
  const params = new URLSearchParams()
  if (opts?.symbol) params.set('symbol', opts.symbol)
  if (opts?.trade_date) params.set('trade_date', opts.trade_date)
  if (opts?.stage) params.set('stage', opts.stage)
  if (opts?.path) params.set('path', opts.path)
  if (opts?.grade) params.set('grade', opts.grade)
  if (opts?.min_score !== undefined) params.set('min_score', String(opts.min_score))
  if (opts?.limit) params.set('limit', String(opts.limit))
  const path = `/research/sepa/daily?${params}`
  const res = await fetch(researchEngineUrl(path))
  // Older research-api builds may lack fusion routes; empty is honest, not a hard fail.
  if (res.status === 404) {
    return {
      rows: [] as SepaScoreRow[],
      count: 0,
      symbol: opts?.symbol ?? null,
      trade_date: opts?.trade_date ?? null,
      filters: {
        stage: opts?.stage ?? null,
        path: opts?.path ?? null,
        grade: opts?.grade ?? null,
        min_score: opts?.min_score ?? null,
      },
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<SepaDailyResponse>
}

export async function fetchSepaCandidates(opts?: { trade_date?: string; top?: number }) {
  const params = new URLSearchParams()
  if (opts?.trade_date) params.set('trade_date', opts.trade_date)
  if (opts?.top) params.set('top', String(opts.top))
  const path = `/research/sepa/candidates?${params}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404) {
    return {
      trade_date: opts?.trade_date ?? null,
      candidates: [] as SepaScoreRow[],
      count: 0,
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (text.trimStart().startsWith('<!')) {
      throw new Error(
        `Research Engine unreachable (got HTML). Start research-api :8795 and set VITE_API_RESEARCH_ENGINE.`,
      )
    }
    throw new Error(`Research Engine ${res.status}: ${text}`)
  }
  return res.json() as Promise<SepaCandidatesResponse>
}
