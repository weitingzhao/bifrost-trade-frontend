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

export interface PineExitRow {
  k: string
  pine: string
  premium: string
  diff: number | null
  money?: boolean
  points?: boolean
}

/** The comparison table, Pine exit first: what changed when the script could close the position. */
export function pineExitRows(c: PineExitComparison): PineExitRow[] {
  const a = c.with_pine_exit
  const b = c.premium_only
  const d = (x: number | undefined, y: number | undefined) =>
    x != null && y != null && Number.isFinite(x) && Number.isFinite(y) ? x - y : null
  return [
    { k: 'Trades', pine: String(a.n_trades), premium: String(b.n_trades), diff: d(a.n_trades, b.n_trades) },
    { k: 'Closed by Pine', pine: String(a.exit_reasons?.pine_exit ?? 0), premium: '—', diff: null },
    { k: 'Win rate', pine: pct(a.win_rate), premium: pct(b.win_rate), diff: d(a.win_rate, b.win_rate), points: true },
    { k: 'Avg / trade', pine: simUsd(a.avg_pnl), premium: simUsd(b.avg_pnl), diff: d(a.avg_pnl, b.avg_pnl), money: true },
    { k: 'Total P&L', pine: simUsd(a.total_pnl), premium: simUsd(b.total_pnl), diff: d(a.total_pnl, b.total_pnl), money: true },
    { k: 'Worst trade', pine: simUsd(a.worst_trade), premium: simUsd(b.worst_trade), diff: d(a.worst_trade, b.worst_trade), money: true },
    { k: 'Max drawdown', pine: simUsd(a.max_drawdown), premium: simUsd(b.max_drawdown), diff: d(a.max_drawdown, b.max_drawdown), money: true },
    {
      k: 'Days held',
      pine: a.avg_days_held != null ? a.avg_days_held.toFixed(1) : '—',
      premium: b.avg_days_held != null ? b.avg_days_held.toFixed(1) : '—',
      diff: d(a.avg_days_held, b.avg_days_held),
    },
  ]
}

/** A signed difference as the table prints it. */
export function diffLabel(r: Pick<PineExitRow, 'diff' | 'money' | 'points'>): string {
  if (r.diff == null || !Number.isFinite(r.diff)) return ''
  const sign = r.diff > 0 ? '+' : ''
  if (r.money) return `${r.diff > 0 ? '+' : ''}${simUsd(r.diff)}`
  if (r.points) return `${sign}${(r.diff * 100).toFixed(0)} pt`
  return Number.isInteger(r.diff) ? `${sign}${r.diff}` : `${sign}${r.diff.toFixed(1)}`
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
