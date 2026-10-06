/**
 * Signal Decay › Indicator & Pine signals (design Rev .158 B4): one row per
 * signal and side, read at one horizon over one basket. Edge = the signal's
 * win rate − the same names' baseline over every session; a cross-section,
 * not a decay curve.
 *
 * Two sources, and since research 0.175.0 two bases: Pine signal-stats is
 * method v2 (next-open entry, cooldown dedupe, net of a one-way cost, a 90%
 * interval) while the indicator endpoint is still same-close and gross. A row
 * reads whatever its own response carries; the footer says which basis each
 * source is on, from the fields that arrived — never from a version guess.
 */
import type { Ci90, PineStatsMethod } from '@/api/research/pine'

export type SignalSource = 'indicator' | 'pine'
export type SampleNote = 'noise' | 'thin' | 'ok'

export interface HorizonCell {
  signal: { n: number; win_rate: number | null }
  baseline: { n: number; win_rate: number | null }
  win_rate_edge: number | null
  n_raw?: number
  sample_note?: SampleNote
  ci90?: { win_rate_edge?: Ci90 }
  /** How the interval was drawn: by symbol (≥ 5 names), by signal (fewer), or null (n < 5). */
  ci_method?: string | null
}

export interface StatsLike {
  signals: number
  sample_note: string
  by_horizon: Record<string, HorizonCell>
  method?: PineStatsMethod
}

export interface WinRateRow {
  key: string
  /** `ind:<id>` / `pine:<id>` — the Symbol chart's `?signal=`. */
  chartSignal: string
  name: string
  source: SignalSource
  /** `indicator`, `pine`, `pine · mine`, `pine · community`. */
  sourceLabel: string
  side: 'buy' | 'sell'
  state: 'loading' | 'failed' | 'ok'
  error: string | null
  n: number | null
  /** Before the cooldown dedupe, when the server deduped. */
  nRaw: number | null
  win: number | null
  base: number | null
  edge: number | null
  edgeCi: Ci90
  /** `cluster_bootstrap_symbol` · `iid_signal` · null. */
  ciMethod: string | null
  sample: SampleNote | null
  /** The response's method, when it says one (v2). */
  method: PineStatsMethod | null
}

export function cellOf(stats: StatsLike | undefined, h: number): Omit<WinRateRow, 'key' | 'chartSignal' | 'name' | 'source' | 'sourceLabel' | 'side' | 'state' | 'error'> {
  const c = stats?.by_horizon?.[String(h)]
  const sample = (c?.sample_note ?? stats?.sample_note ?? null) as SampleNote | null
  return {
    n: c?.signal.n ?? null,
    nRaw: c?.n_raw ?? null,
    win: c?.signal.win_rate ?? null,
    base: c?.baseline.win_rate ?? null,
    edge: c?.win_rate_edge ?? null,
    edgeCi: c?.ci90?.win_rate_edge ?? null,
    ciMethod: c?.ci_method ?? null,
    sample: sample === 'noise' || sample === 'thin' || sample === 'ok' ? sample : null,
    method: stats?.method ?? null,
  }
}

/** Noise last, then the largest edge first; unread rows at the bottom. */
export function sortRows(rows: readonly WinRateRow[]): WinRateRow[] {
  const rank = (r: WinRateRow) => (r.state !== 'ok' ? 2 : r.sample === 'noise' ? 1 : 0)
  return [...rows].sort((a, b) => rank(a) - rank(b) || (b.edge ?? -9) - (a.edge ?? -9))
}

/** `+4 pt` · `−3 pt` · `0 pt`, from a 0–1 difference. */
export function fmtPt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const p = Math.round(v * 100)
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)} pt`
}

/**
 * The footer's basis sentence, from the methods the rows actually carry.
 * Before v2 nothing is netted or tested, and the design's own words hold.
 */
export function basisNote(rows: readonly WinRateRow[]): string {
  const read = rows.filter((r) => r.state === 'ok')
  const v2 = read.filter((r) => (r.method?.version ?? 0) >= 2)
  const v1 = read.filter((r) => (r.method?.version ?? 0) < 2)
  if (v2.length === 0) return 'Descriptive: no significance test, no costs.'
  const m = v2[0].method!
  const cost = m.cost_bps_one_way != null ? `net of ${m.cost_bps_one_way} bps a side` : 'net of costs'
  const ci = m.ci?.level != null ? `${Math.round(m.ci.level * 100)}% interval` : 'an interval'
  const v2Sources = [...new Set(v2.map((r) => r.source))]
  const v1Sources = [...new Set(v1.map((r) => r.source))]
  const name = (s: SignalSource[]) => s.map((x) => (x === 'pine' ? 'Pine' : 'Indicator')).join(' and ')
  const head = `${name(v2Sources)} rows: entered at the next open, overlapping signals deduped, ${cost}, ${ci} under the edge.`
  return v1Sources.length
    ? `${head} ${name(v1Sources)} rows are still descriptive — same-session close, no costs, no interval — so the two are not on one basis.`
    : head
}

/** The edge interval's hover: which resampling drew it — by signal is narrower than by symbol. */
export function ciTitle(method: string | null): string {
  if (method === 'cluster_bootstrap_symbol') return '90% interval of the edge · resampled by symbol'
  if (method === 'iid_signal')
    return '90% interval of the edge · resampled by signal, because the basket has fewer than 5 names — narrower than a by-symbol interval would be'
  return '90% interval of the edge'
}
