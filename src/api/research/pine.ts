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
import { withValidation } from '@/lib/apiValidation'
import {
  PineCheckResponseSchema,
  PineContextResponseSchema,
  PineScriptRowSchema,
  PineScriptsResponseSchema,
  PineSignalStatsSchema,
  PineSignalsResponseSchema,
} from '@/lib/schemas/researchData'

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

/** Research's script-id rule (`library.py`): 2–48 of a–z, 0–9, _ starting with a letter. */
export const PINE_SCRIPT_ID = /^[a-z][a-z0-9_]{1,47}$/

/** A script the daily build runs, as the Screener chips and the chart picker name it. */
export interface PineLibraryEntry {
  id: string
  label: string
  origin: PineScriptRow['origin']
}

const BUILTIN_ENTRIES: readonly PineLibraryEntry[] = PINE_BUILTINS.map((b) => ({ ...b, origin: 'bifrost' }))

/**
 * The active scripts in reading order: the built-ins in their fixed order under
 * their short labels, then pasted scripts under their own names, in the order
 * the library lists them. With no library yet (loading, or Research did not
 * answer) the built-ins stand in, which is what every surface showed before
 * it read the library.
 */
export function pineLibraryEntries(rows: readonly PineScriptRow[] | undefined): readonly PineLibraryEntry[] {
  if (!rows) return BUILTIN_ENTRIES
  const active = rows.filter((r) => r.is_active)
  const ids = new Set(active.map((r) => r.id))
  const builtins = BUILTIN_ENTRIES.filter((b) => ids.has(b.id))
  const known = new Set(builtins.map((b) => b.id))
  return [
    ...builtins,
    ...active
      .filter((r) => !known.has(r.id))
      .map((r) => ({ id: r.id, label: r.name.trim() || r.id, origin: r.origin })),
  ]
}

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
  /** research 0.183.0: the numeric plot() titles, in source order (not buy / sell). */
  plots?: string[]
  /** research 0.183.0: overlay=true — the plots are prices, drawn on the price pane. */
  overlay?: boolean
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

/** A 90% interval, or null when the sample is too small for one. */
export type Ci90 = [number, number] | null

/**
 * One horizon of signal-stats. The first three fields are the original
 * (0.173.0) shape; everything after is the method-v2 addition (research
 * 0.175.0, "Make Pine backtests honest"), absent on older servers. On v2 the
 * original names carry the strict values — next-open entry, deduped, net of
 * cost — and the `_gross` twins keep the old reading.
 */
export interface PineHorizonStats {
  signal: PineMeasure & { win_rate_gross?: number | null; avg_return_gross?: number | null }
  baseline: PineMeasure & { win_rate_gross?: number | null; avg_return_gross?: number | null }
  win_rate_edge: number | null
  /** Signals before the cooldown dedupe; `signal.n` is after. */
  n_raw?: number
  sample_note?: 'noise' | 'thin' | 'ok'
  clusters?: number
  delisted_exits?: number
  avg_return_edge?: number | null
  ci90?: { win_rate?: Ci90; avg_return?: Ci90; win_rate_edge?: Ci90; avg_return_edge?: Ci90 }
}

/** How a v2 server measured (absent before 0.175.0). */
export interface PineStatsMethod {
  version: number
  entry?: string
  entry_fallback?: string
  exit?: string
  cost_bps_one_way?: number
  cooldown?: string
  baseline?: string
  ci?: { level?: number; method?: string; draws?: number }
}

export interface PineSignalStats {
  script: string
  side: PineSide
  window: { start: string; end: string }
  symbols: string[]
  move_threshold: number
  signals: number
  sample_note: 'noise' | 'thin' | 'ok'
  by_horizon: Record<string, PineHorizonStats>
  method?: PineStatsMethod
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

const validateScripts = withValidation<{ scripts: PineScriptRow[]; count: number }>(PineScriptsResponseSchema, 'research/pine/scripts')
const validateScript = withValidation<PineScriptRow>(PineScriptRowSchema, 'research/pine/scripts/{id}')
const validateCheck = withValidation<PineCheckResult>(
  PineCheckResponseSchema,
  'research/pine/check',
)
const validateSignals = withValidation<PineSignalsResponse>(PineSignalsResponseSchema, 'research/pine/signals')
const validateStats = withValidation<PineSignalStats>(PineSignalStatsSchema, 'research/pine/signal-stats')

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
  return validateScripts(await get('/research/pine/scripts', new URLSearchParams(withSource ? { with_source: 'true' } : {})))
}

export async function fetchPineScript(id: string): Promise<PineScriptRow> {
  return validateScript(await get(`/research/pine/scripts/${encodeURIComponent(id)}`))
}

export async function savePineScript(id: string, input: PineScriptInput): Promise<PineScriptRow> {
  return validateScript(await send(`/research/pine/scripts/${encodeURIComponent(id)}`, 'PUT', input))
}

export interface PineCheckResult {
  symbol: string
  bars: number
  marks: { date: string; side: PineSide; close: number | null }[]
  /** research 0.183.0, when `plots` was asked: each plot's [session, value | null], oldest first. */
  series?: Record<string, [string, number | null][]>
  /**
   * research 0.195.0: the option context series the script reads, and the first
   * session the nightly build stores its signals (null: none in this window).
   */
  context?: { series: string[]; warm_from: string | null }
}

/** One option context series a script reads with `request.security("NAME", timeframe.period, close)` (S6). */
export interface PineContextSeries {
  name: string
  /** `symbol`: the script's own symbol's series; `market`: the same for every symbol. */
  kind: 'symbol' | 'market'
  unit: string
  description: string
  /** First session with a value (measured 2026-10-06). */
  history_from: string
  note: string
  pine: string
}

export interface PineContextCatalog {
  series: PineContextSeries[]
  /** timeframe, missing_day, warm_up, as_of — one sentence each. */
  rules: Record<string, string>
}

const validateContext = withValidation<PineContextCatalog>(PineContextResponseSchema, 'research/pine/context')

/** The option context series (research 0.195.0); an older Research answers 404. */
export async function fetchPineContext(): Promise<PineContextCatalog> {
  return validateContext(await get('/research/pine/context'))
}

/**
 * Run a pasted `source`, or a library `script` by id (research 0.183.0), over
 * one symbol — nothing is stored. `plots` asks for those numeric plots' values.
 */
export async function checkPineScript(
  input: ({ source: string; script?: never } | { script: string; source?: never }) & {
    symbol: string
    days?: number
    plots?: string[]
  },
): Promise<PineCheckResult> {
  return validateCheck(await send('/research/pine/check', 'POST', input))
}

/**
 * The plots of a script that are prices — its numeric plots when it draws on
 * the price pane (`overlay=true`). An oscillator's plots (ADX, WaveTrend) are
 * not. Empty when Research predates 0.183.0, which sends neither field.
 */
export function pricePlots(row: Pick<PineScriptRow, 'plots' | 'overlay'> | undefined): string[] {
  return row?.overlay ? [...(row.plots ?? [])] : []
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
  return validateSignals(await get('/research/pine/signals', q))
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
  return validateStats(await get('/research/pine/signal-stats', q))
}
