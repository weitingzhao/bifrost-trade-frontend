/**
 * Pine script library and signals (research 0.173.0, W6).
 *
 * Scripts run in Research's pine-runner (its own process); each library script
 * plots `buy` / `sell`, and the daily build stores the sessions they fired in
 * `features.stock_signal_pine_daily`. The same signals are the `pine_signal`
 * entry event of the simulator and the event backtest.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'

export type PineSide = 'buy' | 'sell'

/** The built-in library (bifrost-research engines/pine/library), short labels for chips and pickers. */
export const PINE_BUILTINS: readonly { id: string; label: string }[] = [
  { id: 'supertrend', label: 'Supertrend' },
  { id: 'squeeze_momentum', label: 'Squeeze' },
  { id: 'wavetrend', label: 'WaveTrend' },
  { id: 'donchian_breakout', label: 'Donchian' },
  { id: 'chandelier_exit', label: 'Chandelier' },
  { id: 'adx_trend', label: 'DMI·ADX' },
  { id: 'stoch_rsi', label: 'Stoch RSI' },
  { id: 'ichimoku_tk', label: 'Ichimoku TK' },
]

export interface PineScriptRow {
  id: string
  name: string
  version: number
  origin: 'bifrost' | 'community' | 'user'
  license: string | null
  source_url: string | null
  notes: string | null
  is_active: boolean
  signals: PineSide[]
  source?: string
  buy_signals?: number
  sell_signals?: number
  last_signal?: string | null
}

export interface PineSignalRow {
  script: string
  symbol: string
  date: string
  side: PineSide
  close: number | null
}

export interface PineSignalsResponse {
  on?: string | null
  from?: string
  within_sessions?: number
  symbol?: string
  rows: PineSignalRow[]
  count: number
}

export interface PineMeasure {
  n: number
  win_rate: number | null
  hit_rate: number | null
  avg_return: number | null
}

export interface PineSignalStats {
  script: string
  side: PineSide
  window: { start: string; end: string }
  symbols: string[]
  move_threshold: number
  signals: number
  sample_note: 'noise' | 'thin' | 'ok'
  by_horizon: Record<string, { signal: PineMeasure; baseline: PineMeasure; win_rate_edge: number | null }>
}

export interface PineScriptInput {
  name: string
  source: string
  origin?: 'community' | 'user'
  license?: string | null
  source_url?: string | null
  notes?: string | null
  is_active?: boolean
}

function get<T>(path: string, q?: URLSearchParams): Promise<T> {
  return requestJson<T>(`${researchEngineUrl(path)}${q && q.toString() ? `?${q}` : ''}`, {
    envelope: 'research',
    label: 'Pine API',
  })
}

function send<T>(path: string, method: 'PUT' | 'POST', body: unknown): Promise<T> {
  return requestJson<T>(researchEngineUrl(path), {
    method,
    body,
    headers: getResearchAuthHeaders(),
    envelope: 'research',
    label: 'Pine API',
  })
}

export async function fetchPineScripts(withSource = false): Promise<{ scripts: PineScriptRow[]; count: number }> {
  return get('/research/pine/scripts', new URLSearchParams(withSource ? { with_source: 'true' } : {}))
}

export async function fetchPineScript(id: string): Promise<PineScriptRow> {
  return get(`/research/pine/scripts/${encodeURIComponent(id)}`)
}

export async function savePineScript(id: string, input: PineScriptInput): Promise<PineScriptRow> {
  return send(`/research/pine/scripts/${encodeURIComponent(id)}`, 'PUT', input)
}

export async function checkPineScript(input: {
  source: string
  symbol: string
  days?: number
}): Promise<{ symbol: string; bars: number; marks: { date: string; side: PineSide; close: number | null }[] }> {
  return send('/research/pine/check', 'POST', input)
}

export async function fetchPineSignals(params: {
  scripts?: string[]
  side?: PineSide | 'any'
  on?: string
  withinSessions?: number
  symbol?: string
  start?: string
  end?: string
}): Promise<PineSignalsResponse> {
  const q = new URLSearchParams()
  if (params.scripts?.length) q.set('script', params.scripts.join(','))
  if (params.side) q.set('side', params.side)
  if (params.on) q.set('on', params.on)
  if (params.withinSessions) q.set('within_sessions', String(params.withinSessions))
  if (params.symbol) q.set('symbol', params.symbol)
  if (params.start) q.set('start', params.start)
  if (params.end) q.set('end', params.end)
  return get('/research/pine/signals', q)
}

export async function fetchPineSignalStats(params: {
  script: string
  side: PineSide
  symbols?: string[]
  horizons?: number[]
}): Promise<PineSignalStats> {
  const q = new URLSearchParams({ script: params.script, side: params.side })
  if (params.symbols?.length) q.set('symbols', params.symbols.join(','))
  if (params.horizons?.length) q.set('horizons', params.horizons.join(','))
  return get('/research/pine/signal-stats', q)
}
