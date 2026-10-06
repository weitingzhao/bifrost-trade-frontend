/**
 * Signal Decay › Indicator & Pine signals (design Rev .158 B4): one row per
 * signal and side, read at one horizon over one basket. Edge = the signal's
 * win rate − the same names' baseline over every session; a cross-section,
 * not a decay curve.
 *
 * Two sources, and since research 0.175.0 two bases: Pine signal-stats is
 * method v2 (next-open entry, one signal per horizon, net of a one-way cost,
 * a 90% interval) while the indicator endpoint is still same-close and gross.
 * A row reads whatever its own response carries. Two bases never share one
 * ranking (design Rev .160 Q2): each source is its own group with its basis in
 * a subhead, and the groups fold back into one table once both are on the same
 * method — read from the responses, never from a version guess.
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

export function cellOf(
  stats: StatsLike | undefined,
  h: number
): Omit<
  WinRateRow,
  'key' | 'chartSignal' | 'name' | 'source' | 'sourceLabel' | 'side' | 'state' | 'error'
> {
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

/** A row read on method v2 (research 0.175.0 signal-stats). */
export function isV2(r: Pick<WinRateRow, 'method'>): boolean {
  return (r.method?.version ?? 0) >= 2
}

/** Noise last, then the largest edge first; unread rows at the bottom. */
export function sortRows(rows: readonly WinRateRow[]): WinRateRow[] {
  const rank = (r: WinRateRow) => (r.state !== 'ok' ? 2 : r.sample === 'noise' ? 1 : 0)
  return [...rows].sort((a, b) => rank(a) - rank(b) || (b.edge ?? -9) - (a.edge ?? -9))
}

function sign(v: number): string {
  return v > 0 ? '+' : v < 0 ? '−' : ''
}

/** `+4 pt` · `−3 pt` · `0 pt`, from a 0–1 difference. */
export function fmtPt(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const p = Math.round(v * 100)
  return `${sign(p)}${Math.abs(p)} pt`
}

/** One decimal, signed, no unit: `+1.2` · `−0.4` (v2 edges and their interval). */
export function fmtPt1(v: number): string {
  const p = Math.round(v * 1000) / 10
  return `${sign(p)}${Math.abs(p).toFixed(1)}`
}

/** The Edge cell: a v2 edge keeps one decimal, a v1 edge whole points. */
export function edgeText(r: Pick<WinRateRow, 'edge' | 'method'>): string {
  if (r.edge == null || !Number.isFinite(r.edge)) return '—'
  return isV2(r) ? `${fmtPt1(r.edge)} pt` : fmtPt(r.edge)
}

/** The second line under Edge: `90% +1.2 to +13.9`, or null. */
export function ciText(r: Pick<WinRateRow, 'edgeCi'>): string | null {
  return r.edgeCi ? `90% ${fmtPt1(r.edgeCi[0])} to ${fmtPt1(r.edgeCi[1])}` : null
}

function costBps(m: PineStatsMethod | null | undefined): string {
  const c = m?.cost_bps_one_way
  return c == null ? 'costs' : `${Number.isInteger(c) ? c : c.toFixed(1)} bps one way`
}

/** The n cell's hover. */
export function nTitle(r: Pick<WinRateRow, 'n' | 'nRaw' | 'method'>): string {
  if (r.n == null) return ''
  return isV2(r) ? `${r.n} after one-per-horizon dedupe · ${r.nRaw ?? r.n} raw` : `${r.n} signals`
}

/** The Edge cell's hover: how the interval was drawn, or why there is none. */
export function edgeTitle(r: Pick<WinRateRow, 'edgeCi' | 'ciMethod' | 'method'>): string {
  if (!isV2(r)) return 'Old basis: no interval'
  if (!r.edgeCi) return 'No interval under 5 signals'
  const by =
    r.ciMethod === 'cluster_bootstrap_symbol'
      ? 'symbol'
      : r.ciMethod === 'iid_signal'
        ? 'signal (fewer than 5 names — narrower than by symbol)'
        : 'signal'
  const draws = r.method?.ci?.draws
  return `90% bootstrap interval${draws ? `, ${draws.toLocaleString('en-US')} draws` : ''}, resampled by ${by} · net of ${costBps(r.method).replace(' one way', '')}`
}

export interface RowGroup {
  key: SignalSource
  /** Null when the table is one group — no subhead. */
  head: { title: string; method: string; basis: string } | null
  rows: WinRateRow[]
}

function basisOf(
  source: SignalSource,
  v2: boolean,
  m: PineStatsMethod | null,
  mixed: boolean
): string {
  if (v2) return `next-open entry · one signal per horizon · ${costBps(m)} · 90% interval`
  const old = 'same-session close · no costs · no interval'
  return mixed
    ? `${old} — not comparable with the ${source === 'pine' ? 'Indicator' : 'Pine'} rows`
    : old
}

/**
 * Rows into groups. While the two sources are on different methods each is
 * its own group under a basis subhead, ranked within itself; once they share a
 * method (or only one source is shown) it is one ranked table with no subhead.
 */
export function groupRows(rows: readonly WinRateRow[]): RowGroup[] {
  const by = (s: SignalSource) => rows.filter((r) => r.source === s)
  const pine = by('pine')
  const ind = by('indicator')
  const v2Of = (rs: readonly WinRateRow[]) => rs.some((r) => r.state === 'ok' && isV2(r))
  const methodOf = (rs: readonly WinRateRow[]) =>
    rs.find((r) => r.state === 'ok' && isV2(r))?.method ?? null
  const mixed = pine.length > 0 && ind.length > 0 && v2Of(pine) !== v2Of(ind)
  if (!mixed)
    return rows.length
      ? [{ key: pine.length ? 'pine' : 'indicator', head: null, rows: sortRows(rows) }]
      : []
  const g = (key: SignalSource, rs: readonly WinRateRow[]): RowGroup => {
    const v2 = v2Of(rs)
    return {
      key,
      head: {
        title: key === 'pine' ? 'Pine' : 'Indicators',
        method: v2 ? 'method v2' : 'method v1',
        basis: basisOf(key, v2, methodOf(rs), true),
      },
      rows: sortRows(rs),
    }
  }
  return [g('pine', pine), g('indicator', ind)]
}

/**
 * The footer's basis sentence (design Rev .160 Q2): two bases → two sentences
 * and a warning not to rank one against the other; only v2 → its basis; only
 * v1 → the prototype's original words.
 */
export function basisNote(rows: readonly WinRateRow[]): string {
  const read = rows.filter((r) => r.state === 'ok')
  const v2 = read.filter(isV2)
  const v1 = read.filter((r) => !isV2(r))
  if (v2.length === 0) return 'Descriptive: no significance test, no costs.'
  const m = v2[0].method
  const v2Basis = `entry at the next open, one signal per horizon, net of ${costBps(m)}, with a 90% bootstrap interval`
  if (v1.length === 0)
    return `${v2Basis.charAt(0).toUpperCase()}${v2Basis.slice(1)} (none under 5 signals).`
  const name = (rs: readonly WinRateRow[]) =>
    rs.every((r) => r.source === 'pine')
      ? 'Pine'
      : rs.every((r) => r.source === 'indicator')
        ? 'Indicator'
        : 'Some'
  return `${name(v2)} rows: ${v2Basis}. ${name(v1)} rows are still on the old basis (same-session close, no costs, no interval), so do not rank one group against the other.`
}
