import type {
  OptionExpirationsResult,
  OptionSnapshotRow,
  OptionSnapshotsPgResult,
  MassiveStatusResponse,
  MassiveDailyChecklistDims,
  MaxPainComputeResponse,
  MaxPainHistoryPoint,
  IvTermStructureResponse,
  IvTermStructurePoint,
  IvVolatilityConeResponse,
  IvVolatilityConePoint,
  GreeksCoverageResponse,
  LiquiditySummaryResponse,
  RelativeValueResponse,
  MassiveJobDetail,
} from '@/types/optionDiscovery'
import { withValidation } from '@/lib/apiValidation'
import {
  OptionExpirationsResponseSchema,
  OptionSnapshotsPgResponseSchema,
  MassiveStatusResponseSchema,
  MassiveDailyChecklistResponseSchema,
  GreeksCoverageResponseSchema,
} from '@/lib/schemas/optionDiscovery'

const RESEARCH_BASE = import.meta.env.VITE_API_RESEARCH as string
const MASSIVE_BASE = import.meta.env.VITE_API_MASSIVE as string
const OPS_BASE = import.meta.env.VITE_API_OPS as string

function massiveUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const b = MASSIVE_BASE.replace(/\/$/, '')
    if (!b) return normalizedPath
    try {
      if (new URL(b).origin !== window.location.origin) return normalizedPath
    } catch {
      /* fall through */
    }
  }
  return `${MASSIVE_BASE.replace(/\/$/, '')}${normalizedPath}`
}

function mapSnapshotRow(row: Record<string, unknown>): OptionSnapshotRow {
  return {
    strike: Number(row.strike),
    right: String(row.right ?? ''),
    snapshot_ts: typeof row.snapshot_ts === 'string' ? row.snapshot_ts : null,
    mark: row.mark != null && Number.isFinite(Number(row.mark)) ? Number(row.mark) : null,
    bid: row.bid != null && Number.isFinite(Number(row.bid)) ? Number(row.bid) : null,
    ask: row.ask != null && Number.isFinite(Number(row.ask)) ? Number(row.ask) : null,
    last: row.last != null && Number.isFinite(Number(row.last)) ? Number(row.last) : null,
    mid: row.mid != null && Number.isFinite(Number(row.mid)) ? Number(row.mid) : null,
    iv: row.iv != null && Number.isFinite(Number(row.iv)) ? Number(row.iv) : null,
    delta: row.delta != null && Number.isFinite(Number(row.delta)) ? Number(row.delta) : null,
    gamma: row.gamma != null && Number.isFinite(Number(row.gamma)) ? Number(row.gamma) : null,
    theta: row.theta != null && Number.isFinite(Number(row.theta)) ? Number(row.theta) : null,
    vega: row.vega != null && Number.isFinite(Number(row.vega)) ? Number(row.vega) : null,
    open_interest:
      row.open_interest != null && Number.isFinite(Number(row.open_interest))
        ? Number(row.open_interest)
        : null,
    underlying_ticker: typeof row.underlying_ticker === 'string' ? row.underlying_ticker : null,
    day_open: row.day_open != null && Number.isFinite(Number(row.day_open)) ? Number(row.day_open) : null,
    day_high: row.day_high != null && Number.isFinite(Number(row.day_high)) ? Number(row.day_high) : null,
    day_low: row.day_low != null && Number.isFinite(Number(row.day_low)) ? Number(row.day_low) : null,
    day_close: row.day_close != null && Number.isFinite(Number(row.day_close)) ? Number(row.day_close) : null,
    day_previous_close:
      row.day_previous_close != null && Number.isFinite(Number(row.day_previous_close))
        ? Number(row.day_previous_close)
        : null,
    day_change:
      row.day_change != null && Number.isFinite(Number(row.day_change)) ? Number(row.day_change) : null,
    day_change_percent:
      row.day_change_percent != null && Number.isFinite(Number(row.day_change_percent))
        ? Number(row.day_change_percent)
        : null,
    day_volume:
      row.day_volume != null && Number.isFinite(Number(row.day_volume)) ? Number(row.day_volume) : null,
    day_vwap: row.day_vwap != null && Number.isFinite(Number(row.day_vwap)) ? Number(row.day_vwap) : null,
    day_last_updated: typeof row.day_last_updated === 'string' ? row.day_last_updated : null,
    day_last_updated_day:
      typeof row.day_last_updated_day === 'string' ? row.day_last_updated_day : null,
  }
}

export async function fetchOptionExpirations(
  symbol: string,
  provider: 'auto' | 'ib' | 'massive' = 'massive',
  options?: { expiration?: string },
): Promise<OptionExpirationsResult> {
  const s = (symbol || '').trim()
  if (!s) return { symbol: '', expirations: [], error: 'symbol is required' }
  const exp = options?.expiration ? `&expiration=${encodeURIComponent(options.expiration)}` : ''
  const r = await fetch(
    `${RESEARCH_BASE}/research/option-expirations?symbol=${encodeURIComponent(s)}&provider=${encodeURIComponent(provider)}${exp}`,
  )
  const j = await r.json().catch(() => ({}))
  withValidation(OptionExpirationsResponseSchema, 'fetchOptionExpirations')(j)
  const strikes: number[] | undefined = Array.isArray(j.strikes)
    ? (j.strikes.filter((x: unknown) => typeof x === 'number' && Number.isFinite(x)) as number[])
    : undefined
  const last_price =
    j.last_price != null && Number.isFinite(Number(j.last_price)) ? Number(j.last_price) : undefined
  return {
    symbol: j.symbol ?? s,
    expirations: Array.isArray(j.expirations) ? j.expirations : [],
    ...(strikes !== undefined ? { strikes } : {}),
    ...(last_price !== undefined ? { last_price } : {}),
    error: j.error,
    provider: typeof j.provider === 'string' ? j.provider : undefined,
  }
}

export async function fetchOptionSnapshotsPg(
  symbol: string,
  expiration: string,
  strikesCsv?: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<OptionSnapshotsPgResult> {
  const s = (symbol || '').trim()
  const e = (expiration || '').trim()
  const q = new URLSearchParams({ symbol: s, expiration: e, source })
  if (strikesCsv?.trim()) q.set('strikes', strikesCsv.trim())
  const r = await fetch(`${RESEARCH_BASE}/research/option-snapshots?${q.toString()}`)
  const j = await r.json().catch(() => ({}))
  withValidation(OptionSnapshotsPgResponseSchema, 'fetchOptionSnapshotsPg')(j)
  const rows: OptionSnapshotRow[] = Array.isArray(j.rows)
    ? j.rows.map((row: Record<string, unknown>) => mapSnapshotRow(row))
    : []
  return {
    symbol: j.symbol ?? s,
    expiration: j.expiration ?? e,
    ...(j.underlying_price != null && Number.isFinite(Number(j.underlying_price))
      ? { underlying_price: Number(j.underlying_price) }
      : {}),
    rows,
    error: typeof j.error === 'string' ? j.error : undefined,
    warning: typeof j.warning === 'string' ? j.warning : undefined,
  }
}

export async function fetchMassiveStatus(): Promise<MassiveStatusResponse> {
  const r = await fetch(massiveUrl('/research/massive/status'))
  const j = await r.json().catch(() => ({}))
  withValidation(MassiveStatusResponseSchema, 'fetchMassiveStatus')(j)
  const years = Number(j.daily_full_backfill_years)
  return {
    configured: Boolean(j.configured),
    tier: typeof j.tier === 'string' ? j.tier : 'starter',
    delay_notice: typeof j.delay_notice === 'string' ? j.delay_notice : '',
    trades_enabled: Boolean(j.trades_enabled),
    daily_full_backfill_years: Number.isFinite(years) && years > 0 ? years : 5,
  }
}

export async function fetchMassiveDailyChecklist(params: {
  symbols: string[]
  tradeDate?: string
}): Promise<{
  ok: boolean
  trade_date?: string
  symbols?: Record<string, MassiveDailyChecklistDims>
  error?: string
}> {
  const syms = [...new Set((params.symbols || []).map(s => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 80)
  if (syms.length === 0) return { ok: false, error: 'symbols is required' }
  const q = new URLSearchParams({ symbols: syms.join(',') })
  if (params.tradeDate?.trim()) q.set('trade_date', params.tradeDate.trim())
  const r = await fetch(massiveUrl(`/research/massive/daily-checklist?${q.toString()}`))
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : `HTTP ${r.status}` }
  }
  withValidation(MassiveDailyChecklistResponseSchema, 'fetchMassiveDailyChecklist')(j)
  return {
    ok: true,
    trade_date: typeof j.trade_date === 'string' ? j.trade_date : undefined,
    symbols: j.symbols && typeof j.symbols === 'object' ? (j.symbols as Record<string, MassiveDailyChecklistDims>) : {},
  }
}

export async function postMassiveSync(
  kind: string,
  payload: Record<string, unknown>,
  options?: { priority?: 'high'; signal?: AbortSignal },
): Promise<{
  ok: boolean
  job_id?: string
  job_ids?: string[]
  error?: string
  message?: string
  deduplicated?: boolean
}> {
  const r = await fetch(massiveUrl('/research/massive/sync'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      payload,
      ...(options?.priority === 'high' ? { priority: 'high' } : {}),
    }),
    signal: options?.signal,
  })
  const j = await r.json().catch(() => ({}))
  if (r.status === 403) {
    return { ok: false, message: typeof j.message === 'string' ? j.message : 'Forbidden' }
  }
  const rawIds = j.job_ids
  const job_ids =
    Array.isArray(rawIds) && rawIds.length > 0
      ? rawIds.map((x: unknown) => String(x)).filter(Boolean)
      : undefined
  return {
    ok: Boolean(j.ok),
    job_id: typeof j.job_id === 'string' ? j.job_id : undefined,
    job_ids,
    error: typeof j.error === 'string' ? j.error : undefined,
    message: typeof j.message === 'string' ? j.message : undefined,
    deduplicated: typeof j.deduplicated === 'boolean' ? j.deduplicated : undefined,
  }
}

export async function fetchMassiveJob(jobId: string): Promise<{
  ok: boolean
  error?: string
  job?: MassiveJobDetail
}> {
  const r = await fetch(`${OPS_BASE}/ops/research/massive/jobs/${encodeURIComponent(jobId)}`)
  const j = await r.json().catch(() => ({}))
  if (!j.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : 'Unknown error' }
  }
  const job = j.job as Record<string, unknown> | undefined
  if (!job) return { ok: true }
  return {
    ok: true,
    job: {
      job_id: String(job.job_id ?? ''),
      kind: typeof job.kind === 'string' ? job.kind : undefined,
      status: typeof job.status === 'string' ? job.status : undefined,
      result: job.result,
      created_ts: typeof job.created_ts === 'number' ? job.created_ts : undefined,
      updated_ts: typeof job.updated_ts === 'number' ? job.updated_ts : undefined,
    },
  }
}

export async function fetchMaxPainCompute(params: {
  symbol: string
  expiry: string
  tradeDate?: string
}): Promise<MaxPainComputeResponse> {
  const sym = (params.symbol || '').trim().toUpperCase()
  const exp = (params.expiry || '').trim()
  if (!sym || !exp) return { ok: false, error: 'symbol and expiry are required' }
  const q = new URLSearchParams({ symbol: sym, expiry: exp })
  if (params.tradeDate?.trim()) q.set('trade_date', params.tradeDate.trim())
  const r = await fetch(`${RESEARCH_BASE}/research/max-pain/compute?${q.toString()}`)
  const j = await r.json().catch(() => ({}))
  if (!j.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : 'Request failed' }
  }
  const pts = Array.isArray(j.pain_by_strike) ? j.pain_by_strike : []
  return {
    ok: true,
    symbol: typeof j.symbol === 'string' ? j.symbol : sym,
    expiry: typeof j.expiry === 'string' ? j.expiry : undefined,
    trade_date: typeof j.trade_date === 'string' ? j.trade_date : undefined,
    max_pain_strike: typeof j.max_pain_strike === 'number' ? j.max_pain_strike : undefined,
    min_pain_value: typeof j.min_pain_value === 'number' ? j.min_pain_value : undefined,
    total_oi: typeof j.total_oi === 'number' ? j.total_oi : undefined,
    underlying_close:
      j.underlying_close != null && Number.isFinite(Number(j.underlying_close))
        ? Number(j.underlying_close)
        : null,
    distance_to_max_pain_pct:
      j.distance_to_max_pain_pct != null && Number.isFinite(Number(j.distance_to_max_pain_pct))
        ? Number(j.distance_to_max_pain_pct)
        : null,
    pain_by_strike: pts.map((p: Record<string, unknown>) => ({
      strike: Number(p.strike),
      pain: Number(p.pain),
      pain_call: Number(p.pain_call ?? 0),
      pain_put: Number(p.pain_put ?? 0),
      call_oi: Number(p.call_oi ?? 0),
      put_oi: Number(p.put_oi ?? 0),
    })),
    recent_corporate_action: Boolean(j.recent_corporate_action),
    oi_basis: typeof j.oi_basis === 'string' ? j.oi_basis : undefined,
  }
}

export async function fetchMaxPainComputeHistory(params: {
  symbol: string
  expiry: string
  lookbackDays?: number
}): Promise<{ ok: boolean; error?: string; expiry?: string; series: MaxPainHistoryPoint[] }> {
  const sym = (params.symbol || '').trim().toUpperCase()
  const exp = (params.expiry || '').trim()
  if (!sym || !exp) return { ok: false, error: 'symbol and expiry are required', series: [] }
  const q = new URLSearchParams({ symbol: sym, expiry: exp })
  if (params.lookbackDays != null && params.lookbackDays > 0) q.set('lookback_days', String(params.lookbackDays))
  const r = await fetch(`${RESEARCH_BASE}/research/max-pain/compute/history?${q.toString()}`)
  const j = await r.json().catch(() => ({}))
  if (!j.ok) {
    return { ok: false, error: typeof j.error === 'string' ? j.error : 'Request failed', series: [] }
  }
  const raw = Array.isArray(j.series) ? j.series : []
  return {
    ok: true,
    expiry: typeof j.expiry === 'string' ? j.expiry : undefined,
    series: raw.map((row: Record<string, unknown>) => ({
      trade_date: String(row.trade_date ?? ''),
      max_pain_strike: Number(row.max_pain_strike),
      total_oi: Number(row.total_oi ?? 0),
      underlying_close:
        row.underlying_close != null && Number.isFinite(Number(row.underlying_close))
          ? Number(row.underlying_close)
          : null,
    })),
  }
}

export async function fetchIvTermStructure(
  symbol: string,
  expirations: string[],
  source = 'massive',
): Promise<IvTermStructureResponse> {
  const params = new URLSearchParams({
    symbol,
    expirations: expirations.join(','),
    source,
  })
  const r = await fetch(`${RESEARCH_BASE}/research/iv-term-structure?${params}`)
  const j = await r.json().catch(() => ({}))
  const pts: IvTermStructurePoint[] = Array.isArray(j.points)
    ? j.points.map((p: Record<string, unknown>) => ({
        expiration: String(p.expiration ?? ''),
        dte_days: Number(p.dte_days ?? 0),
        atm_iv: p.atm_iv != null ? Number(p.atm_iv) : null,
        iv_call: p.iv_call != null ? Number(p.iv_call) : null,
        iv_put: p.iv_put != null ? Number(p.iv_put) : null,
        strike: p.strike != null ? Number(p.strike) : undefined,
      }))
    : []
  const errMsg = (() => {
    if (j.error != null && String(j.error).trim() !== '') return String(j.error)
    if (!r.ok) return `HTTP ${r.status}`
    return undefined
  })()
  return {
    ok: Boolean(j.ok) && r.ok,
    symbol: j.symbol ?? symbol,
    underlying_price: j.underlying_price != null ? Number(j.underlying_price) : undefined,
    points: pts,
    error: errMsg,
  }
}

export async function fetchIvVolatilityCone(
  symbol: string,
  expirations: string[],
  source = 'massive',
  lookbackDays = 90,
): Promise<IvVolatilityConeResponse> {
  const params = new URLSearchParams({
    symbol,
    expirations: expirations.join(','),
    source,
    lookback_days: String(lookbackDays),
  })
  const r = await fetch(`${RESEARCH_BASE}/research/iv-volatility-cone?${params}`)
  const j = await r.json().catch(() => ({}))
  const numOrNull = (v: unknown): number | null => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const pts: IvVolatilityConePoint[] = Array.isArray(j.points)
    ? j.points.map((p: Record<string, unknown>) => ({
        expiration: String(p.expiration ?? ''),
        dte_days: Number(p.dte_days ?? 0),
        atm_iv: numOrNull(p.atm_iv),
        iv_call: numOrNull(p.iv_call),
        iv_put: numOrNull(p.iv_put),
        strike: numOrNull(p.strike),
        iv_p10: numOrNull(p.iv_p10),
        iv_p50: numOrNull(p.iv_p50),
        iv_p90: numOrNull(p.iv_p90),
        iv_min: numOrNull(p.iv_min),
        iv_max: numOrNull(p.iv_max),
        sample_days: Number(p.sample_days ?? 0),
        iv_hist_mean: numOrNull(p.iv_hist_mean),
        iv_hist_stdev: numOrNull(p.iv_hist_stdev),
        iv_hist_min: numOrNull(p.iv_hist_min),
        iv_hist_max: numOrNull(p.iv_hist_max),
        iv_hist_plus_1sd: numOrNull(p.iv_hist_plus_1sd),
        iv_hist_minus_1sd: numOrNull(p.iv_hist_minus_1sd),
        iv_hist_plus_2sd: numOrNull(p.iv_hist_plus_2sd),
        iv_hist_minus_2sd: numOrNull(p.iv_hist_minus_2sd),
      }))
    : []
  return {
    ok: Boolean(j.ok) && r.ok,
    symbol: j.symbol ?? symbol,
    points: pts,
    error: typeof j.error === 'string' ? j.error : !r.ok ? `HTTP ${r.status}` : undefined,
  }
}

export async function fetchGreeksCoverage(
  symbol: string,
  expiration?: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<GreeksCoverageResponse> {
  const s = (symbol || '').trim()
  if (!s) return { ok: false, error: 'symbol is required' }
  const q = new URLSearchParams({ symbol: s, source })
  if (expiration?.trim()) q.set('expiration', expiration.trim())
  const r = await fetch(massiveUrl(`/research/massive/greeks-coverage?${q.toString()}`))
  const j = await r.json().catch(() => ({}))
  withValidation(GreeksCoverageResponseSchema, 'fetchGreeksCoverage')(j)
  return {
    ok: Boolean(j.ok),
    symbol: typeof j.symbol === 'string' ? j.symbol : undefined,
    expiration: typeof j.expiration === 'string' ? j.expiration : undefined,
    source: typeof j.source === 'string' ? j.source : undefined,
    total: typeof j.total === 'number' ? j.total : undefined,
    coverage: typeof j.coverage === 'object' && j.coverage != null ? j.coverage : undefined,
    freshness: typeof j.freshness === 'object' && j.freshness != null ? j.freshness : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchLiquiditySummary(
  symbol: string,
  expiration: string,
  strike: number,
  right: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<LiquiditySummaryResponse> {
  const q = new URLSearchParams({
    symbol: (symbol || '').trim(),
    expiration: (expiration || '').trim(),
    strike: String(strike),
    right: (right || '').trim(),
    source,
  })
  const r = await fetch(`${RESEARCH_BASE}/research/option-contract/liquidity-summary?${q.toString()}`)
  const j = await r.json().catch(() => ({}))
  return {
    ok: Boolean(j.ok),
    symbol: j.symbol,
    expiration: j.expiration,
    strike: j.strike,
    right: j.right,
    source: j.source,
    spread_pct: j.spread_pct ?? null,
    spread_percentile: j.spread_percentile ?? null,
    oi: j.oi ?? null,
    oi_percentile: j.oi_percentile ?? null,
    contracts_compared: j.contracts_compared,
    snapshot_ts: j.snapshot_ts ?? null,
    error: j.error,
  }
}

export async function fetchRelativeValue(
  symbol: string,
  expiration: string,
  strike: number,
  right: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<RelativeValueResponse> {
  const q = new URLSearchParams({
    symbol: (symbol || '').trim(),
    expiration: (expiration || '').trim(),
    strike: String(strike),
    right: (right || '').trim(),
    source,
  })
  const r = await fetch(`${RESEARCH_BASE}/research/option-contract/relative-value?${q.toString()}`)
  const j = await r.json().catch(() => ({}))
  return {
    ok: Boolean(j.ok),
    label: j.label ?? null,
    iv_zscore: j.iv_zscore ?? null,
    this_iv: j.this_iv ?? null,
    avg_iv: j.avg_iv ?? null,
    std_iv: j.std_iv ?? null,
    contracts_compared: j.contracts_compared,
    iv_curve: Array.isArray(j.iv_curve) ? j.iv_curve : undefined,
    error: j.error,
  }
}

export async function fetchMassiveLastTrade(ticker: string): Promise<{
  ok: boolean
  results?: Record<string, unknown>
  error?: string
}> {
  const ot = (ticker || '').trim()
  if (!ot) return { ok: false, error: 'options_ticker is required' }
  const r = await fetch(massiveUrl(`/research/massive/trades-quotes/last-trade/${encodeURIComponent(ot)}`))
  const j = await r.json().catch(() => ({}))
  return {
    ok: Boolean(j.ok),
    results: j.results as Record<string, unknown> | undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchMassiveHistQuotes(
  ticker: string,
  options?: { limit?: number },
): Promise<{ ok: boolean; results?: Record<string, unknown>[]; count?: number; error?: string }> {
  const ot = (ticker || '').trim()
  if (!ot) return { ok: false, error: 'options_ticker is required' }
  const q = new URLSearchParams()
  if (options?.limit != null) q.set('limit', String(options.limit))
  const r = await fetch(
    massiveUrl(`/research/massive/trades-quotes/quotes/${encodeURIComponent(ot)}?${q.toString()}`),
  )
  const j = await r.json().catch(() => ({}))
  return {
    ok: Boolean(j.ok),
    results: Array.isArray(j.results) ? j.results : undefined,
    count: typeof j.count === 'number' ? j.count : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export { pollMassiveJobUntilDone } from '@/utils/massiveJobPoll'
