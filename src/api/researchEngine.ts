/**
 * Research Engine API (port 8795) — accessed via platform-api proxy.
 *
 * All Wave 3–6 engine endpoints (terrain, forecast, GEX, momentum,
 * IV surface, order flow, event radar, settlement).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import type { LampColor } from '@/lib/researchFreshness'
import type { IvPercentileRow } from '@/types/ivRadar'

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

/** Compact regime timeline point (no invented history — only real API rows). */
export interface TerrainRegimePoint {
  trade_date: string
  regime: string
}

/**
 * Up to `limit` recent daily terrain regimes for a symbol.
 * There is no dedicated history endpoint — probes prior calendar weekdays
 * via `fetchTerrain(symbol, date)`. Returns only dates that actually exist.
 */
export async function fetchRecentTerrainRegimes(
  symbol: string,
  opts?: { limit?: number; lookbackCalendarDays?: number },
): Promise<TerrainRegimePoint[]> {
  const limit = opts?.limit ?? 5
  const lookback = opts?.lookbackCalendarDays ?? 12
  const latest = await fetchTerrain(symbol)
  if (!latest?.terrain) return []

  const byDate = new Map<string, string>()
  const push = (t: TerrainData) => {
    const d = String(t.trade_date).slice(0, 10)
    if (!d || byDate.has(d)) return
    byDate.set(d, t.regime)
  }
  push(latest.terrain)

  if (byDate.size < limit) {
    const base = new Date(`${String(latest.terrain.trade_date).slice(0, 10)}T12:00:00`)
    const priorDates: string[] = []
    for (let i = 1; i <= lookback && priorDates.length < limit - 1; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue
      priorDates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      )
    }
    const rows = await Promise.all(priorDates.map((d) => fetchTerrain(symbol, d)))
    for (const row of rows) {
      if (row?.terrain) push(row.terrain)
    }
  }

  return [...byDate.entries()]
    .map(([trade_date, regime]) => ({ trade_date, regime }))
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    .slice(-limit)
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
  levels_json: {
    strike: number
    call_gex: number
    put_gex: number
    net_gex: number
    call_gex_vol?: number
    put_gex_vol?: number
    volume_net_gex?: number
  }[]
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
  event_date?: string | null
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
  return get<{
    rows: {
      theme: string
      count: number
      direction_avg: number
      sentiment_avg: number
      bull_count?: number
      bear_count?: number
      neutral_count?: number
    }[]
    count: number
  }>('/research/events/themes')
}

export interface MacroEventRow {
  macro_id: string
  event_date: string
  indicator: string
  actual_value?: number | null
  expected_value?: number | null
  prior_value?: number | null
  unit?: string | null
  gap_pct?: number | null
  forward_flag?: boolean
  source?: string
  notes?: string
}

export function fetchMacroGap(limit = 30) {
  return get<{ rows: MacroEventRow[]; count: number }>(
    `/research/event-radar/macro/gap?limit=${limit}`,
  )
}

export function fetchMacroForward(days = 7) {
  return get<{ rows: MacroEventRow[]; count: number; days: number }>(
    `/research/event-radar/macro/forward?days=${days}`,
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
  stats_json?: Record<string, unknown>
  hourly_json?: unknown
  hourly_realized?: { hour_et: number; close: number }[] | null
  direction_hit?: boolean
  path_shape?: string
  close_zone?: string
  lean_miss?: boolean
}

export function fetchSettlements(symbol?: string, sessionId?: string) {
  const params = new URLSearchParams()
  if (symbol) params.set('symbol', symbol)
  if (sessionId) params.set('session_id', sessionId)
  return get<{ rows: ForecastSettlement[]; count: number }>(
    `/research/backtest/settlement?${params}`,
  )
}

export interface ForecastHitRateSummary {
  symbol: string
  lookback_days: number
  session_count: number
  path_hit_rate: number | null
  avg_close_miss_pct: number | null
  direction_hit_rate: number | null
  rows: ForecastSettlement[]
}

export function fetchForecastHitRate(symbol: string, lookbackDays = 30) {
  const params = new URLSearchParams({
    symbol: symbol.trim().toUpperCase(),
    lookback_days: String(lookbackDays),
  })
  return get<ForecastHitRateSummary>(`/research/forecast/hit-rate?${params}`)
}

export function fetchTerrainHistory(symbol: string, limit = 30) {
  const params = new URLSearchParams({
    symbol: symbol.trim().toUpperCase(),
    limit: String(limit),
  })
  return get<{ symbol: string; rows: TerrainData[]; count: number }>(
    `/research/forecast/terrain/history?${params}`,
  )
}

export interface PlaybookTriggerRow {
  symbol: string
  trade_date: string
  scenario_key: string
  trigger_at: string
  satisfied: boolean
  condition_snapshot: Record<string, unknown> | null
  computed_at: string | null
}

export function fetchPlaybookTriggers(symbol: string, date?: string) {
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() })
  if (date) params.set('date', date)
  return get<{ symbol: string; rows: PlaybookTriggerRow[]; count: number }>(
    `/research/playbook/triggers?${params}`,
  )
}

export interface PlaybookHitRateSummary {
  symbol: string
  window_days: number
  horizon: number
  trigger_count: number
  evaluated_count: number
  hit_count: number
  hit_rate: number | null
  by_scenario: Record<string, { n: number; hits: number; rate: number | null }>
  rows: Array<{
    trigger_at: string
    trade_date: string
    scenario_key: string
    fwd_return: number | null
    hit: boolean | null
  }>
}

export function fetchPlaybookHitRate(symbol: string, windowDays = 30, horizon = 5) {
  const params = new URLSearchParams({
    symbol: symbol.trim().toUpperCase(),
    window_days: String(windowDays),
    horizon: String(horizon),
  })
  return get<PlaybookHitRateSummary>(`/research/playbook/hit-rate?${params}`)
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
  // Model/Feature Store path — grade/stage/path/sepa_score (dashboard /sepa/daily is screener-wide).
  const path = `/research/sepa/model/daily?${params}`
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
  // SETUP/PIVOT short-list from features.stock_signal_sepa_daily (not screener-wide ranks).
  const path = `/research/sepa/model/candidates?${params}`
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

// --- Daily Brief Synth (Wave R8) ---

export class DailyBriefSynthUnavailableError extends Error {
  readonly status: number

  constructor(status: number, message?: string) {
    super(message ?? `Daily Brief synth unavailable (${status})`)
    this.name = 'DailyBriefSynthUnavailableError'
    this.status = status
  }
}

export function isDailyBriefSynthUnavailable(err: unknown): boolean {
  return err instanceof DailyBriefSynthUnavailableError
}

export interface SynthVerdictSegment {
  label: string
  text: string
  lamp: LampColor
  to?: string
  meta?: string | null
}

export interface DailyBriefSynthCard {
  present: boolean
  verdict: string
  detail?: Record<string, unknown> | null
  settlement?: ForecastSettlement | null
  candidates?: SepaScoreRow[]
  sample_symbols?: string[]
  count?: number
  rows?: EventRadarRow[]
}

export interface DailyBriefSynth {
  symbol: string
  trade_date: string
  verdict: {
    narrative: SynthVerdictSegment
    risk: SynthVerdictSegment
    opportunity: SynthVerdictSegment
    action_hint: { label: string; to: string }
  }
  freshness: Record<string, LampColor>
  cards: {
    terrain: DailyBriefSynthCard
    gex: DailyBriefSynthCard
    forecast: DailyBriefSynthCard
    sepa: DailyBriefSynthCard
    momentum: DailyBriefSynthCard
    iv: DailyBriefSynthCard
    events: DailyBriefSynthCard
    sentiment: DailyBriefSynthCard
  }
  regime_context: Record<string, unknown> | null
}

export async function fetchDailyBriefSynth(symbol: string, date?: string): Promise<DailyBriefSynth> {
  const params = new URLSearchParams({ symbol })
  if (date) params.set('date', date)
  const path = `/research/daily-brief/synth?${params}`
  const res = await fetch(researchEngineUrl(path))
  if (res.status === 404 || res.status === 503) {
    throw new DailyBriefSynthUnavailableError(res.status)
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
  return res.json() as Promise<DailyBriefSynth>
}

/** Map synth API verdict to FE DailyVerdict shape (no client-side rules). */
export function mapSynthVerdict(synth: DailyBriefSynth): {
  narrative: SynthVerdictSegment
  risk: SynthVerdictSegment
  opportunity: SynthVerdictSegment
  actionHint: { label: string; to: string }
} {
  return {
    narrative: synth.verdict.narrative,
    risk: synth.verdict.risk,
    opportunity: synth.verdict.opportunity,
    actionHint: synth.verdict.action_hint,
  }
}

/** Extract typed card details from synth response for BriefCard rendering. */
export function synthTerrainDetail(synth: DailyBriefSynth): TerrainData | null {
  const d = synth.cards.terrain.detail
  return d ? (d as unknown as TerrainData) : null
}

export function synthGexDetail(synth: DailyBriefSynth): GexIntraday | null {
  const d = synth.cards.gex.detail
  return d ? (d as unknown as GexIntraday) : null
}

export function synthForecastDetail(synth: DailyBriefSynth): ForecastSession | null {
  const d = synth.cards.forecast.detail
  return d ? (d as unknown as ForecastSession) : null
}

export function synthSettlement(synth: DailyBriefSynth): ForecastSettlement | null {
  return synth.cards.forecast.settlement ?? null
}

export function synthIvDetail(synth: DailyBriefSynth): IvPercentileRow | null {
  const d = synth.cards.iv.detail
  return d ? (d as unknown as IvPercentileRow) : null
}
