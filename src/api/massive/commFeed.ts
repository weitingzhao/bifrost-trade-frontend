import { massiveUrl } from '@/lib/devApiUrl'

export interface TechnicalIndicatorParams {
  ticker: string
  indicator: 'sma' | 'ema' | 'rsi' | 'macd'
  timespan?: string
  window?: number
  series_type?: string
  adjusted?: boolean
  order?: string
  limit?: number
  short_window?: number
  long_window?: number
  signal_window?: number
}

export interface TechnicalIndicatorResponse {
  ok: boolean
  indicator?: string
  ticker?: string
  count?: number
  results?: {
    values?: Record<string, unknown>[]
    underlying?: Record<string, unknown>
    [key: string]: unknown
  }
  error?: string
}

export interface MassiveMarketHolidaysResponse {
  ok: boolean
  massive_holidays: Record<string, unknown>[]
  massive_count?: number
  local_holidays: Record<string, unknown>[]
  local_count?: number
  comparison?: {
    in_massive_only: string[]
    in_local_only: string[]
    in_both: string[]
  }
  error?: string
}

export async function fetchTechnicalIndicator(
  params: TechnicalIndicatorParams,
): Promise<TechnicalIndicatorResponse> {
  const { ticker, indicator, ...rest } = params
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const r = await fetch(
    massiveUrl(`/research/massive/technical-indicators/${indicator}/${encodeURIComponent(ticker)}?${q.toString()}`),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    indicator: typeof j.indicator === 'string' ? j.indicator : undefined,
    ticker: typeof j.ticker === 'string' ? j.ticker : undefined,
    count: Number.isFinite(Number(j.count)) ? Number(j.count) : undefined,
    results: j.results as TechnicalIndicatorResponse['results'],
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchMassiveMarketConditions(opts?: {
  asset_class?: string
  data_type?: string
  limit?: number
}): Promise<{ ok: boolean; results: Record<string, unknown>[]; count?: number; error?: string }> {
  const q = new URLSearchParams()
  if (opts?.asset_class) q.set('asset_class', opts.asset_class)
  if (opts?.data_type) q.set('data_type', opts.data_type)
  if (opts?.limit) q.set('limit', String(opts.limit))
  const r = await fetch(massiveUrl(`/research/massive/market-ops/conditions?${q.toString()}`))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    results: Array.isArray(j.results) ? (j.results as Record<string, unknown>[]) : [],
    count: Number.isFinite(Number(j.count)) ? Number(j.count) : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchMassiveMarketExchanges(opts?: {
  asset_class?: string
  locale?: string
}): Promise<{ ok: boolean; results: Record<string, unknown>[]; count?: number; error?: string }> {
  const q = new URLSearchParams()
  if (opts?.asset_class) q.set('asset_class', opts.asset_class)
  if (opts?.locale) q.set('locale', opts.locale)
  const r = await fetch(massiveUrl(`/research/massive/market-ops/exchanges?${q.toString()}`))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    results: Array.isArray(j.results) ? (j.results as Record<string, unknown>[]) : [],
    count: Number.isFinite(Number(j.count)) ? Number(j.count) : undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchMassiveMarketHolidays(): Promise<MassiveMarketHolidaysResponse> {
  const r = await fetch(massiveUrl('/research/massive/market-ops/holidays'))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    massive_holidays: Array.isArray(j.massive_holidays) ? (j.massive_holidays as Record<string, unknown>[]) : [],
    massive_count: Number.isFinite(Number(j.massive_count)) ? Number(j.massive_count) : undefined,
    local_holidays: Array.isArray(j.local_holidays) ? (j.local_holidays as Record<string, unknown>[]) : [],
    local_count: Number.isFinite(Number(j.local_count)) ? Number(j.local_count) : undefined,
    comparison: j.comparison as MassiveMarketHolidaysResponse['comparison'],
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}

export async function fetchMassiveMarketStatus(): Promise<{
  ok: boolean
  status?: Record<string, unknown>
  error?: string
}> {
  const r = await fetch(massiveUrl('/research/massive/market-ops/status'))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return {
    ok: Boolean(j.ok),
    status: j.status as Record<string, unknown> | undefined,
    error: typeof j.error === 'string' ? j.error : undefined,
  }
}
