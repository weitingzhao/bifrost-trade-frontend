/**
 * Pure readers for the Simulator tab. A simulator run is a
 * `research.backtest_run` row whose template is `sim:<structure>`; the Event
 * tab leaves those out because their summary is per trade, not per event.
 */
import type { BacktestRunRow } from '@/api/research/backtestEvent'
import type { PineExitComparison, SimEquityPoint, SimLeg, SimSummary, SimTrade } from '@/api/research/backtestSim'

export const SIM_PREFIX = 'sim:'

export function isSimRun(row: Pick<BacktestRunRow, 'strategy_template'>): boolean {
  return row.strategy_template.startsWith(SIM_PREFIX)
}

export function simStructure(row: Pick<BacktestRunRow, 'strategy_template'>): string {
  return row.strategy_template.slice(SIM_PREFIX.length)
}

export const STRUCTURE_LABEL: Record<string, string> = {
  short_put: 'Short put',
  put_credit_spread: 'Put credit spread',
  call_credit_spread: 'Call credit spread',
  short_strangle: 'Short strangle',
  iron_condor: 'Iron condor',
}

/** Structures with a long wing — the only ones the wing width applies to. */
export const WINGED = new Set(['put_credit_spread', 'call_credit_spread', 'iron_condor'])

/**
 * Structures with one short strike picked by delta — the only ones a Pine
 * level can place (research 0.178.0 refuses `strike_anchor` on the others).
 */
export const ONE_SIDED = new Set(['short_put', 'put_credit_spread', 'call_credit_spread'])

export function simUsd(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`
  return v < 0 ? `−${s}` : s
}

export function pct(v: number | null | undefined, digits = 0): string {
  return v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(digits)}%`
}

/**
 * One row of the Compared with panel (Rev .161): this run, the run it is
 * compared with, and the difference. `colored` rows read better-for-the-seller
 * green and worse red (a smaller drawdown is a positive difference); counts and
 * days have no better direction and stay ink.
 */
export interface CompareRow {
  k: string
  a: string
  b: string
  diff: number | null
  kind: 'count' | 'money' | 'points' | 'days' | 'ratio'
  colored: boolean
}

const minus = (v: number, text: string) => (v < 0 ? `−${text}` : v > 0 ? `+${text}` : text)

function delta(x: number | null | undefined, y: number | null | undefined): number | null {
  return x != null && y != null && Number.isFinite(x) && Number.isFinite(y) ? x - y : null
}

/** A signed difference as the table prints it: `+$577` · `−6 pt` · `−5 d` · `+0.12` · `0`. */
export function diffLabel(r: Pick<CompareRow, 'diff' | 'kind'>): string {
  const d = r.diff
  if (d == null || !Number.isFinite(d)) return ''
  const abs = Math.abs(d)
  switch (r.kind) {
    case 'money':
      return d === 0 ? '$0' : minus(d, simUsd(abs))
    case 'points':
      return minus(Math.round(d * 100), `${Math.round(abs * 100)} pt`)
    case 'days':
      return minus(d, `${Number.isInteger(abs) ? abs : abs.toFixed(1)} d`)
    case 'ratio':
      return minus(d, abs.toFixed(2))
    default:
      return minus(d, String(Number.isInteger(abs) ? abs : abs.toFixed(1)))
  }
}

/** The Premium rules only page: what changed when the script could close the position. */
export function pineExitRows(c: PineExitComparison): CompareRow[] {
  const a = c.with_pine_exit
  const b = c.premium_only
  const days = (v: number | undefined) => (v != null ? `${v.toFixed(1)} d` : '—')
  return [
    { k: 'Trades', a: String(a.n_trades), b: String(b.n_trades), diff: delta(a.n_trades, b.n_trades), kind: 'count', colored: false },
    { k: 'Closed by Pine', a: String(a.exit_reasons?.pine_exit ?? 0), b: '—', diff: null, kind: 'count', colored: false },
    { k: 'Win rate', a: pct(a.win_rate), b: pct(b.win_rate), diff: delta(a.win_rate, b.win_rate), kind: 'points', colored: true },
    { k: 'Avg / trade', a: simUsd(a.avg_pnl), b: simUsd(b.avg_pnl), diff: delta(a.avg_pnl, b.avg_pnl), kind: 'money', colored: true },
    { k: 'Total P&L', a: simUsd(a.total_pnl), b: simUsd(b.total_pnl), diff: delta(a.total_pnl, b.total_pnl), kind: 'money', colored: true },
    { k: 'Worst trade', a: simUsd(a.worst_trade), b: simUsd(b.worst_trade), diff: delta(a.worst_trade, b.worst_trade), kind: 'money', colored: true },
    { k: 'Max drawdown', a: simUsd(a.max_drawdown), b: simUsd(b.max_drawdown), diff: delta(a.max_drawdown, b.max_drawdown), kind: 'money', colored: true },
    { k: 'Days held', a: days(a.avg_days_held), b: days(b.avg_days_held), diff: delta(a.avg_days_held, b.avg_days_held), kind: 'days', colored: false },
  ]
}

/** The Schedule entry page: the signal run against the same configuration opened on the schedule. */
export function scheduleRows(a: Partial<SimSummary>, b: Partial<SimSummary>): CompareRow[] {
  const sh = (v: number | undefined) => (v != null && Number.isFinite(v) ? v.toFixed(2) : '—')
  return [
    { k: 'Trades', a: String(a.n_trades ?? '—'), b: String(b.n_trades ?? '—'), diff: delta(a.n_trades, b.n_trades), kind: 'count', colored: false },
    { k: 'Win rate', a: pct(a.win_rate), b: pct(b.win_rate), diff: delta(a.win_rate, b.win_rate), kind: 'points', colored: true },
    { k: 'Avg / trade', a: simUsd(a.avg_pnl), b: simUsd(b.avg_pnl), diff: delta(a.avg_pnl, b.avg_pnl), kind: 'money', colored: true },
    { k: 'Total P&L', a: simUsd(a.total_pnl), b: simUsd(b.total_pnl), diff: delta(a.total_pnl, b.total_pnl), kind: 'money', colored: true },
    { k: 'Worst trade', a: simUsd(a.worst_trade), b: simUsd(b.worst_trade), diff: delta(a.worst_trade, b.worst_trade), kind: 'money', colored: true },
    { k: 'Max drawdown', a: simUsd(a.max_drawdown), b: simUsd(b.max_drawdown), diff: delta(a.max_drawdown, b.max_drawdown), kind: 'money', colored: true },
    { k: 'Sharpe', a: sh(a.sharpe_annual), b: sh(b.sharpe_annual), diff: delta(a.sharpe_annual, b.sharpe_annual), kind: 'ratio', colored: true },
  ]
}

/**
 * The Paired line under the Premium rules only page: `Paired 3 · too few` below
 * five pairs, else the count, how many exits the script changed, the average
 * change per pair and its interval when there is one.
 */
export function pairedLine(p: PineExitComparison['paired']): string {
  if (p.n < 5) return `Paired ${p.n} · too few`
  const avg = p.avg_pnl_diff
  const ci = p.avg_pnl_diff_ci95
  return [
    `Paired ${p.n} opened on both sides`,
    `Pine changed ${p.exits_changed}`,
    avg != null ? `avg ${minus(avg, simUsd(Math.abs(avg)))} per pair` : null,
    ci ? `95% ${simUsd(ci[0])} to ${simUsd(ci[1])}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** A persisted row carries the summary as loose JSON; read it as the sim's. */
export function simSummaryOf(row: Pick<BacktestRunRow, 'summary'>): Partial<SimSummary> {
  return row.summary as unknown as Partial<SimSummary>
}

export interface CurvePoints {
  /** P&L over the window: equity minus the starting equity. */
  pnl: number[]
  /** Distance below the running peak, ≤ 0. */
  drawdown: number[]
  first: string | null
  last: string | null
}

export function curveFrom(equity: SimEquityPoint[]): CurvePoints {
  if (equity.length === 0) return { pnl: [], drawdown: [], first: null, last: null }
  const base = equity[0].equity
  let peak = -Infinity
  const pnl: number[] = []
  const drawdown: number[] = []
  for (const p of equity) {
    peak = Math.max(peak, p.equity)
    pnl.push(p.equity - base)
    drawdown.push(p.equity - peak)
  }
  return { pnl, drawdown, first: equity[0].as_of, last: equity[equity.length - 1].as_of }
}

/** Exit reasons, largest first — the shape of how trades ended. */
export function exitReasonRows(reasons: Record<string, number> | undefined): [string, number][] {
  return Object.entries(reasons ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** A trade's strikes as the desk writes them: puts then calls, shorts marked. */
export function legsLabel(legs: SimLeg[] | undefined): string {
  if (!legs || legs.length === 0) return '—'
  const order = [...legs].sort((a, b) =>
    a.right === b.right ? a.strike - b.strike : a.right === 'P' ? -1 : 1
  )
  return order
    .map((l) => `${l.side === 'sell' ? '−' : '+'}${fmtStrike(l.strike)}${l.right}`)
    .join(' ')
}

function fmtStrike(k: number): string {
  return Number.isInteger(k) ? String(k) : k.toFixed(1)
}

export function tradeExpiry(t: Pick<SimTrade, 'legs'>): string | null {
  return t.legs?.[0]?.expiry ?? null
}

export function sampleTone(
  note: SimSummary['sample_note'] | undefined
): 'destructive' | 'warning' | null {
  if (note === 'noise') return 'destructive'
  if (note === 'thin') return 'warning'
  return null
}
