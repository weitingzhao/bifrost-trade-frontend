/**
 * Pure readers for the Simulator tab. A simulator run is a
 * `research.backtest_run` row whose template is `sim:<structure>`; the Event
 * tab leaves those out because their summary is per trade, not per event.
 */
import type { BacktestRunRow } from '@/api/research/backtestEvent'
import type { SimEquityPoint, SimLeg, SimSummary, SimTrade } from '@/api/research/backtestSim'

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
  short_strangle: 'Short strangle',
  iron_condor: 'Iron condor',
}

/** Structures with a long wing — the only ones the wing width applies to. */
export const WINGED = new Set(['put_credit_spread', 'iron_condor'])

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
