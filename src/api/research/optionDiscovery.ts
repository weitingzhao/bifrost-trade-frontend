import type {
  OptionExpirationsResult,
  OptionSnapshotRow,
  OptionSnapshotsPgResult,
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
  MassiveJobPollResult,
  MassiveStatusResponse,
} from '@/types/optionDiscovery'
import { withValidation } from '@/lib/apiValidation'
import {
  OptionExpirationsResponseSchema,
  OptionSnapshotsPgResponseSchema,
} from '@/lib/schemas/optionDiscovery'

import { marketDataPluginUrl, researchUrl } from '@/lib/devApiUrl'

const MASSIVE_DISABLED =
  'Massive Trade API removed — use Market Data Plugin (Ops Console / Plugin API)'

/** Plugin health as Discovery "status" stand-in (configured when reachable). */
export async function fetchMassiveStatus(): Promise<MassiveStatusResponse> {
  try {
    const r = await fetch(marketDataPluginUrl('/health'))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    const ok = r.ok && (j.status === 'ok' || j.status === 'degraded')
    return {
      configured: ok,
      tier: typeof j.service === 'string' ? String(j.service) : 'market-data-plugin',
      delay_notice: ok
        ? 'Market Data Plugin (Polygon ingest via platform proxy)'
        : MASSIVE_DISABLED,
      trades_enabled: ok,
      daily_full_backfill_years: 0,
    }
  } catch {
    return {
      configured: false,
      tier: 'unavailable',
      delay_notice: MASSIVE_DISABLED,
      trades_enabled: false,
      daily_full_backfill_years: 0,
    }
  }
}

/** Massive sync may return job_ids[] without job_id (fan-out). */
export function resolveMassiveSyncJobId(sync: {
  job_id?: string
  job_ids?: string[]
}): string | undefined {
  if (sync.job_id) return sync.job_id
  return sync.job_ids?.[0]
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

function dteFromExpiry(expiry: string, asOf?: string | null): number {
  const exp = expiry.trim().slice(0, 10)
  const base = (asOf || new Date().toISOString()).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exp) || !/^\d{4}-\d{2}-\d{2}$/.test(base)) return 0
  const ms = Date.parse(`${exp}T12:00:00Z`) - Date.parse(`${base}T12:00:00Z`)
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.round(ms / 86_400_000))
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
    `${researchUrl('/research/option-expirations')}?symbol=${encodeURIComponent(s)}&provider=${encodeURIComponent(provider)}${exp}`,
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
  const r = await fetch(`${researchUrl('/research/option-snapshots')}?${q.toString()}`)
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
  return {
    ok: false,
    trade_date: params.tradeDate?.trim() || undefined,
    symbols: {},
    error: MASSIVE_DISABLED,
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
  void kind
  void payload
  void options
  return { ok: false, error: MASSIVE_DISABLED, message: MASSIVE_DISABLED }
}

export async function fetchMassiveJob(jobId: string): Promise<{
  ok: boolean
  error?: string
  job?: MassiveJobDetail
}> {
  void jobId
  return { ok: false, error: MASSIVE_DISABLED }
}

export async function pollMassiveJobUntilDone(
  jobId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<MassiveJobPollResult> {
  void jobId
  void options
  return { ok: false, error: MASSIVE_DISABLED }
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
  const r = await fetch(`${marketDataPluginUrl('/market/analytics/max-pain/compute')}?${q.toString()}`)
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok || j.ok === false) {
    const detail =
      typeof j.detail === 'string'
        ? j.detail
        : typeof j.error === 'string'
          ? j.error
          : `HTTP ${r.status}`
    return { ok: false, error: detail }
  }
  const pts = Array.isArray(j.points)
    ? j.points
    : Array.isArray(j.pain_by_strike)
      ? j.pain_by_strike
      : []
  return {
    ok: true,
    symbol: typeof j.symbol === 'string' ? j.symbol : sym,
    expiry: typeof j.expiry === 'string' ? j.expiry : undefined,
    trade_date: typeof j.trade_date === 'string' ? j.trade_date : undefined,
    max_pain_strike: typeof j.max_pain_strike === 'number' ? j.max_pain_strike : undefined,
    min_pain_value:
      typeof j.total_pain_at_strike === 'number'
        ? j.total_pain_at_strike
        : typeof j.min_pain_value === 'number'
          ? j.min_pain_value
          : undefined,
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
    oi_basis: typeof j.oi_basis === 'string' ? j.oi_basis : typeof j.source === 'string' ? j.source : undefined,
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
  const r = await fetch(
    `${marketDataPluginUrl('/market/analytics/max-pain/compute/history')}?${q.toString()}`,
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok || j.ok === false) {
    const detail =
      typeof j.detail === 'string'
        ? j.detail
        : typeof j.error === 'string'
          ? j.error
          : `HTTP ${r.status}`
    return { ok: false, error: detail, series: [] }
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
  const r = await fetch(`${researchUrl('/research/iv-term-structure')}?${params}`)
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
  void expirations
  void source
  void lookbackDays
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return { ok: false, symbol: '', points: [], error: 'symbol is required' }
  const r = await fetch(
    `${marketDataPluginUrl('/market/analytics/atm-iv/term')}?symbol=${encodeURIComponent(sym)}`,
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    const detail =
      typeof j.detail === 'string'
        ? j.detail
        : typeof j.error === 'string'
          ? j.error
          : `HTTP ${r.status}`
    return { ok: false, symbol: sym, points: [], error: detail }
  }
  const tradeDate = typeof j.trade_date === 'string' ? j.trade_date : null
  const term = Array.isArray(j.term) ? j.term : []
  const numOrNull = (v: unknown): number | null => {
    if (v == null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const pts: IvVolatilityConePoint[] = term.map((p: Record<string, unknown>) => {
    const expiration = String(p.expiry ?? p.expiration ?? '')
    const atm = numOrNull(p.atm_iv)
    return {
      expiration,
      dte_days: dteFromExpiry(expiration, tradeDate),
      atm_iv: atm,
      iv_call: null,
      iv_put: null,
      strike: numOrNull(p.atm_strike ?? p.strike),
      iv_p10: null,
      iv_p50: atm,
      iv_p90: null,
      iv_min: null,
      iv_max: null,
      sample_days: 0,
      iv_hist_mean: null,
      iv_hist_stdev: null,
      iv_hist_min: null,
      iv_hist_max: null,
      iv_hist_plus_1sd: null,
      iv_hist_minus_1sd: null,
      iv_hist_plus_2sd: null,
      iv_hist_minus_2sd: null,
    }
  })
  return {
    ok: pts.length > 0,
    symbol: typeof j.symbol === 'string' ? j.symbol : sym,
    points: pts,
    error: pts.length === 0 ? 'No atm-iv term rows' : undefined,
  }
}

export async function fetchGreeksCoverage(
  symbol: string,
  expiration?: string,
  source: 'massive' | 'ib' = 'massive',
): Promise<GreeksCoverageResponse> {
  void source
  const s = (symbol || '').trim()
  if (!s) return { ok: false, error: 'symbol is required' }
  const q = new URLSearchParams({ symbol: s })
  const r = await fetch(`${marketDataPluginUrl('/market/coverage/greeks')}?${q.toString()}`)
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok || j.ok === false) {
    return {
      ok: false,
      error:
        typeof j.detail === 'string'
          ? j.detail
          : typeof j.error === 'string'
            ? j.error
            : `HTTP ${r.status}`,
    }
  }
  const rows = Array.isArray(j.rows) ? j.rows : []
  const row =
    (rows.find(
      (x: Record<string, unknown>) => String(x.symbol ?? '').toUpperCase() === s.toUpperCase(),
    ) as Record<string, unknown> | undefined) ??
    (rows[0] as Record<string, unknown> | undefined)
  if (!row) {
    return {
      ok: true,
      symbol: s,
      expiration: expiration?.trim() || undefined,
      source: 'plugin',
      total: 0,
      coverage: {},
      freshness: { oldest_ts: null, newest_ts: null, stale_rows: 0 },
    }
  }
  const total = Number(row.total_contracts ?? 0)
  const withIv = Number(row.with_iv ?? 0)
  const withDelta = Number(row.with_delta ?? 0)
  const withFull = Number(row.with_full_greeks ?? 0)
  const newest =
    row.newest_ts != null
      ? typeof row.newest_ts === 'string'
        ? row.newest_ts
        : String(row.newest_ts)
      : null
  return {
    ok: true,
    symbol: typeof row.symbol === 'string' ? row.symbol : s,
    expiration: expiration?.trim() || undefined,
    source: 'plugin',
    total,
    coverage: {
      iv: withIv,
      delta: withDelta,
      full_greeks: withFull,
    },
    freshness: {
      oldest_ts: null,
      newest_ts: newest,
      stale_rows: 0,
    },
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
  const r = await fetch(`${researchUrl('/research/option-contract/liquidity-summary')}?${q.toString()}`)
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
  const r = await fetch(`${researchUrl('/research/option-contract/relative-value')}?${q.toString()}`)
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
  const r = await fetch(
    marketDataPluginUrl(`/market/trades-quotes/last-trade/${encodeURIComponent(ot)}`),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    return {
      ok: false,
      error:
        typeof j.detail === 'string'
          ? j.detail
          : typeof j.error === 'string'
            ? j.error
            : `HTTP ${r.status}`,
    }
  }
  const results =
    j.results != null && typeof j.results === 'object' && !Array.isArray(j.results)
      ? (j.results as Record<string, unknown>)
      : j.status != null
        ? j
        : undefined
  return {
    ok: true,
    results,
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
  const qs = q.toString()
  const r = await fetch(
    marketDataPluginUrl(
      `/market/trades-quotes/quotes/${encodeURIComponent(ot)}${qs ? `?${qs}` : ''}`,
    ),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) {
    return {
      ok: false,
      error:
        typeof j.detail === 'string'
          ? j.detail
          : typeof j.error === 'string'
            ? j.error
            : `HTTP ${r.status}`,
    }
  }
  return {
    ok: true,
    results: Array.isArray(j.results) ? (j.results as Record<string, unknown>[]) : undefined,
    count: typeof j.count === 'number' ? j.count : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}
