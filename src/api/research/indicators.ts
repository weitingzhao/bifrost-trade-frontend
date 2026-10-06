/**
 * Standard indicators computed by Research (W6).
 *
 * `GET /research/indicators/series` returns one symbol's adjusted daily bars
 * with RSI, MACD, Bollinger and EMAs plus the sessions each requested crossing
 * signal fired; `GET /research/indicators/signal-stats` returns how the stock
 * moved N sessions after a signal next to every session. The same signals are
 * the `indicator_signal` entry event of the simulator and the event backtest.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'
import { withValidation } from '@/lib/apiValidation'
import { IndicatorSeriesSchema, SignalStatsSchema } from '@/lib/schemas/researchData'

export type IndicatorSignalId =
  | 'macd_cross_up'
  | 'macd_cross_down'
  | 'macd_zero_up'
  | 'macd_zero_down'
  | 'rsi_cross_up'
  | 'rsi_cross_down'
  | 'bb_lower_break'
  | 'bb_lower_reclaim'
  | 'bb_upper_break'
  | 'ema_cross_up'
  | 'ema_cross_down'
  | 'close_ema_cross_up'
  | 'close_ema_cross_down'

export interface IndicatorSignalDef {
  id: IndicatorSignalId
  label: string
  direction: 'up' | 'down'
  defaults: Record<string, number>
}

/** Mirrors `engines/indicators/compute.py` SIGNALS (`GET /research/indicators/signals`). */
export const INDICATOR_SIGNALS: readonly IndicatorSignalDef[] = [
  { id: 'macd_cross_up', label: 'MACD crosses above signal', direction: 'up', defaults: { fast: 12, slow: 26, signal: 9 } },
  { id: 'macd_cross_down', label: 'MACD crosses below signal', direction: 'down', defaults: { fast: 12, slow: 26, signal: 9 } },
  { id: 'macd_zero_up', label: 'MACD crosses above zero', direction: 'up', defaults: { fast: 12, slow: 26, signal: 9 } },
  { id: 'macd_zero_down', label: 'MACD crosses below zero', direction: 'down', defaults: { fast: 12, slow: 26, signal: 9 } },
  { id: 'rsi_cross_up', label: 'RSI crosses up through level', direction: 'up', defaults: { period: 14, level: 30 } },
  { id: 'rsi_cross_down', label: 'RSI crosses down through level', direction: 'down', defaults: { period: 14, level: 70 } },
  { id: 'bb_lower_break', label: 'Close breaks below lower band', direction: 'down', defaults: { period: 20, mult: 2 } },
  { id: 'bb_lower_reclaim', label: 'Close reclaims lower band', direction: 'up', defaults: { period: 20, mult: 2 } },
  { id: 'bb_upper_break', label: 'Close breaks above upper band', direction: 'up', defaults: { period: 20, mult: 2 } },
  { id: 'ema_cross_up', label: 'Fast EMA crosses above slow EMA', direction: 'up', defaults: { fast: 20, slow: 50 } },
  { id: 'ema_cross_down', label: 'Fast EMA crosses below slow EMA', direction: 'down', defaults: { fast: 20, slow: 50 } },
  { id: 'close_ema_cross_up', label: 'Close crosses above EMA', direction: 'up', defaults: { length: 50 } },
  { id: 'close_ema_cross_down', label: 'Close crosses below EMA', direction: 'down', defaults: { length: 50 } },
]

export function indicatorSignal(id: string | null | undefined): IndicatorSignalDef | undefined {
  return INDICATOR_SIGNALS.find((s) => s.id === id)
}

/** Short tag for a signal and its non-default parameters, e.g. `RSI ↑ 25`. */
export function signalShortLabel(id: string, params?: Record<string, unknown>): string {
  const def = indicatorSignal(id)
  if (!def) return id
  const arrow = def.direction === 'up' ? '↑' : '↓'
  const head = id.startsWith('close_ema')
    ? 'Close/EMA'
    : id.startsWith('macd_zero')
      ? 'MACD/0'
      : id.startsWith('bb_')
        ? `BB ${id.includes('lower') ? 'lower' : 'upper'}`
        : id.split('_')[0].toUpperCase()
  const changed = Object.entries(def.defaults)
    .filter(([k, v]) => params?.[k] != null && Number(params[k]) !== v)
    .map(([k]) => `${k} ${params?.[k]}`)
  return [`${head} ${arrow}`, ...changed].join(' · ')
}

const validateSeries = withValidation<IndicatorSeriesResponse>(
  IndicatorSeriesSchema,
  'research/indicators/series'
)
const validateStats = withValidation<SignalStatsResponse>(
  SignalStatsSchema,
  'research/indicators/signal-stats'
)

export interface IndicatorBar {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number
  volume: number | null
  rsi: number | null
  macd: number | null
  macd_signal: number | null
  macd_hist: number | null
  bb_mid: number | null
  bb_upper: number | null
  bb_lower: number | null
  ema: Record<string, number | null>
}

export interface IndicatorMarker {
  date: string
  signal: IndicatorSignalId
  label: string
  direction: 'up' | 'down'
  close: number
}

export interface IndicatorSeriesResponse {
  symbol: string
  start: string
  end: string
  params: Record<string, unknown>
  price_basis: string
  bars: IndicatorBar[]
  markers: IndicatorMarker[]
}

export async function fetchIndicatorSeries(params: {
  symbol: string
  start?: string
  end?: string
  signals?: string[]
}): Promise<IndicatorSeriesResponse> {
  const q = new URLSearchParams({ symbol: params.symbol })
  if (params.start) q.set('start', params.start)
  if (params.end) q.set('end', params.end)
  if (params.signals?.length) q.set('signals', params.signals.join(','))
  return validateSeries(
    await requestJson<IndicatorSeriesResponse>(
      `${researchEngineUrl('/research/indicators/series')}?${q}`,
      { envelope: 'research', label: 'Indicator series API' }
    )
  )
}

export interface SignalMeasure {
  n: number
  win_rate: number | null
  hit_rate: number | null
  avg_return: number | null
  median_return: number | null
}

export interface SignalStatsResponse {
  signal: { id: IndicatorSignalId; label: string; direction: 'up' | 'down'; params: Record<string, number> }
  window: { start: string; end: string }
  move_threshold: number
  signals: number
  sample_note: 'noise' | 'thin' | 'ok'
  by_horizon: Record<string, { signal: SignalMeasure; baseline: SignalMeasure; win_rate_edge: number | null }>
  per_symbol: Record<string, { signals: number; by_horizon: Record<string, SignalMeasure> }>
  recent: Array<{ symbol: string; date: string; close: number } & Record<string, number | string | null>>
  symbols: string[]
  errors: string[]
}

export async function fetchSignalStats(params: {
  signal: string
  symbols: string[]
  params?: Record<string, number>
  start?: string
  end?: string
  horizons?: number[]
  moveThreshold?: number
}): Promise<SignalStatsResponse> {
  const q = new URLSearchParams({ signal: params.signal, symbols: params.symbols.join(',') })
  if (params.params && Object.keys(params.params).length) q.set('params', JSON.stringify(params.params))
  if (params.start) q.set('start', params.start)
  if (params.end) q.set('end', params.end)
  if (params.horizons?.length) q.set('horizons', params.horizons.join(','))
  if (params.moveThreshold != null) q.set('move_threshold', String(params.moveThreshold))
  return validateStats(
    await requestJson<SignalStatsResponse>(
      `${researchEngineUrl('/research/indicators/signal-stats')}?${q}`,
      { envelope: 'research', label: 'Indicator signal stats API' }
    )
  )
}
