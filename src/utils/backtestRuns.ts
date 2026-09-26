/**
 * The Backtest page's and run-result card's shared arithmetic (design `Research Backtest.dc.html`, route
 * rev 2026-09-22.6): run confidence levels, the equity and per-event
 * histogram drawn from real event trades only, tolerant readers for the
 * walk-forward and benchmark payloads the server actually writes, and the
 * settlement roll-up.
 *
 * The walk-forward reader was written against the engine's own shape
 * (`{windows: [{is_start.., oos: {sharpe_annual..}}], aggregate: {...}}`,
 * engines/backtest/walk_forward.py) — the previous card's types described a
 * payload the server never sent, unnoticed because no persisted run carries
 * one (0 of 43 on DEV).
 */
import type { EventRun } from '@/api/research/backtestEvent'
import type { ForecastSettlement } from '@/api/researchEngine'

/* ── run confidence (the design's 5 / 30 thresholds) ─────────────────────── */

export type ConfidenceLevel = 'noise' | 'thin' | 'usable'

export function runConfidence(n: number): {
  level: ConfidenceLevel
  variant: 'danger' | 'warning' | 'success'
  label: string
  note: string
} {
  if (n < 5)
    return {
      level: 'noise',
      variant: 'danger',
      label: `${n} events · noise`,
      note: 'Too few to read a rate; treat every figure as anecdote.',
    }
  if (n < 30)
    return {
      level: 'thin',
      variant: 'warning',
      label: `${n} events · thin`,
      note: 'Coloured, but the tag travels with every export.',
    }
  return {
    level: 'usable',
    variant: 'success',
    label: `${n} events · usable`,
    note: 'One template, one event definition — not a portfolio.',
  }
}

/* ── equity and histogram, from real event trades only ───────────────────── */

export interface EquitySeries {
  /** Cumulative P&L per event, in trade order (oldest first). */
  cums: number[]
  /** Drawdown from the running peak, ≤ 0, aligned with cums. */
  dds: number[]
  maxDd: number
  last: number
}

/** Events sorted by exit; the design draws trade order, not calendar gaps. */
export function equityFrom(runs: readonly EventRun[]): EquitySeries | null {
  if (runs.length === 0) return null
  const ordered = [...runs].sort((a, b) =>
    (a.exit_ts || a.event_date).localeCompare(b.exit_ts || b.event_date)
  )
  let cum = 0
  let peak = 0
  const cums: number[] = []
  const dds: number[] = []
  for (const r of ordered) {
    cum += r.pnl
    peak = Math.max(peak, cum)
    cums.push(cum)
    dds.push(cum - peak)
  }
  return { cums, dds, maxDd: Math.min(...dds), last: cum }
}

export interface HistBin {
  count: number
  lo: number
  hi: number
}

export interface Histogram {
  bins: HistBin[]
  maxCount: number
  median: number
  lo: number
  hi: number
  /** 0–100, where the zero line falls across the bins. */
  zeroPct: number
  medianPct: number
}

export function histogramFrom(runs: readonly EventRun[], nBins = 12): Histogram | null {
  if (runs.length === 0) return null
  const pnls = runs.map((r) => r.pnl)
  const lo = Math.min(...pnls)
  const hi = Math.max(...pnls)
  const width = (hi - lo) / nBins || 1
  const bins: HistBin[] = Array.from({ length: nBins }, (_, i) => ({
    count: 0,
    lo: lo + i * width,
    hi: lo + (i + 1) * width,
  }))
  for (const v of pnls) {
    bins[Math.min(nBins - 1, Math.max(0, Math.floor((v - lo) / width)))].count += 1
  }
  const sorted = [...pnls].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const span = hi - lo || 1
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  return {
    bins,
    maxCount: Math.max(...bins.map((b) => b.count)),
    median,
    lo,
    hi,
    zeroPct: clamp(((0 - lo) / span) * 100),
    medianPct: clamp(((median - lo) / span) * 100),
  }
}

/* ── tolerant readers for the persisted payloads ─────────────────────────── */

function asNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export interface WfWindow {
  isStart: string | null
  isEnd: string | null
  oosStart: string | null
  oosEnd: string | null
  isN: number | null
  oosN: number | null
  oosSharpe: number | null
  oosTotal: number | null
  oosWin: number | null
}

export interface WalkForward {
  windows: WfWindow[]
  nWindows: number
  avgSharpe: number | null
  medianSharpe: number | null
  avgTotal: number | null
  avgWin: number | null
}

/** The engine's own payload: {windows: [...], aggregate: {...}}. */
export function parseWalkForward(raw: unknown): WalkForward | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rawWindows = Array.isArray(r.windows) ? r.windows : []
  const windows: WfWindow[] = rawWindows
    .filter((w): w is Record<string, unknown> => Boolean(w) && typeof w === 'object')
    .map((w) => {
      const oos = (w.oos ?? {}) as Record<string, unknown>
      return {
        isStart: str(w.is_start),
        isEnd: str(w.is_end),
        oosStart: str(w.oos_start),
        oosEnd: str(w.oos_end),
        isN: asNum(w.is_n),
        oosN: asNum(w.oos_n),
        oosSharpe: asNum(oos.sharpe_annual),
        oosTotal: asNum(oos.total_return),
        oosWin: asNum(oos.win_rate),
      }
    })
  if (windows.length === 0) return null
  const agg = (r.aggregate ?? {}) as Record<string, unknown>
  return {
    windows,
    nWindows: asNum(agg.n_windows) ?? windows.length,
    avgSharpe: asNum(agg.avg_sharpe_annual),
    medianSharpe: asNum(agg.median_sharpe_annual),
    avgTotal: asNum(agg.avg_total_return),
    avgWin: asNum(agg.avg_win_rate),
  }
}

export interface BenchmarkRead {
  totalReturn: number | null
  sharpe: number | null
  maxDd: number | null
  cagr: number | null
  n: number | null
  startDate: string | null
  endDate: string | null
}

/** engines/backtest/benchmark.py — spy_buy_hold over the P&L proxy series. */
export function parseBenchmark(raw: unknown): BenchmarkRead | null {
  if (!raw || typeof raw !== 'object') return null
  const spy = (raw as Record<string, unknown>).spy_buy_hold
  if (!spy || typeof spy !== 'object') return null
  const s = spy as Record<string, unknown>
  const out: BenchmarkRead = {
    totalReturn: asNum(s.total_return),
    sharpe: asNum(s.sharpe_annual),
    maxDd: asNum(s.max_drawdown),
    cagr: asNum(s.cagr),
    n: asNum(s.n),
    startDate: str(s.start_date),
    endDate: str(s.end_date),
  }
  return out.n != null && out.n > 0 ? out : null
}

/* ── settlement roll-up ──────────────────────────────────────────────────── */

export interface SettleAgg {
  sessions: number
  within3: number
  within3Pct: number | null
  meanAbsMissPct: number | null
  pathHits: number
  pathHitPct: number | null
  /** Rows left out: research stamped them `stats_json.input_fault` (0.127.0). */
  inputFaults: number
}

export function settleAgg(all: readonly ForecastSettlement[]): SettleAgg {
  // A settlement drawn from an input fault measures that input, not the
  // forecast; research leaves it out of its own rates, and so does this.
  const rows = all.filter((r) => !r.stats_json?.input_fault)
  const inputFaults = all.length - rows.length
  const n = rows.length
  if (n === 0)
    return { sessions: 0, within3: 0, within3Pct: null, meanAbsMissPct: null, pathHits: 0, pathHitPct: null, inputFaults }
  const misses = rows.map((r) => Math.abs(r.close_miss_pct) * 100)
  const within3 = misses.filter((m) => m < 3).length
  const pathHits = rows.filter((r) => r.path_hit).length
  return {
    sessions: n,
    within3,
    within3Pct: (within3 / n) * 100,
    meanAbsMissPct: misses.reduce((a, b) => a + b, 0) / n,
    pathHits,
    pathHitPct: (pathHits / n) * 100,
    inputFaults,
  }
}

/** The run's own scope line — explicit symbols, or the source's name. */
export function runScope(params: Record<string, unknown> | undefined): string {
  const symbols = params?.symbols
  if (Array.isArray(symbols) && symbols.length > 0) {
    return symbols.length <= 4 ? symbols.join(', ') : `${symbols.length} symbols`
  }
  return 'engine-selected universe'
}

export function runSymbols(params: Record<string, unknown> | undefined): string[] {
  const symbols = params?.symbols
  if (!Array.isArray(symbols)) return []
  return symbols.filter((s): s is string => typeof s === 'string').slice(0, 6)
}
