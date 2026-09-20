/**
 * The whole limit book on one ruler: **how much of each line is spent.**
 *
 * Design §5a.1 — `/risk` answers a question none of the six pages beneath it
 * can: *what stops me first.* Each of those pages owns a few constraints and
 * shows them in its own units — a share, a dollar buffer, a contract count —
 * so "which one is closest" is a comparison the reader has to do in their
 * head across six pages. Putting every line on the fraction-of-itself scale
 * makes that comparison a sort.
 *
 * It computes nothing. `useLimitBook` assembles the book once; this file
 * filters, sorts and decides what the bar should be long enough to show.
 */
import { fmtReading, type LimitGroup, type LimitRow } from '@/utils/limitsModel'

/**
 * How far the bar's track runs, as a multiple of the line.
 *
 * Past 1.0 the bar must keep growing or a breach reads as "full" — and "full"
 * and "30% past it" are the difference between a note and a problem. 1.3
 * because beyond that the readable scale for every line under it collapses.
 */
export const RISK_BAR_CEILING = 1.3

export interface SpentLine extends LimitRow {
  /** Both halves are present on a ranked line, so this is never null. */
  use: number
  /** Share of the bar's track this row fills, 0–1. */
  fill: number
}

/** The book's lines that have both halves, worst-spent first. */
export function spentLines(rows: readonly LimitRow[]): SpentLine[] {
  return rows
    .filter((r): r is LimitRow & { use: number } => r.use != null)
    .slice()
    .sort((a, b) => b.use - a.use)
    .map((r) => ({ ...r, fill: Math.min(1, r.use / RISK_BAR_CEILING) }))
}

/**
 * The first line not yet crossed — the one the next trade meets.
 *
 * Null when everything is already over, which is a different answer from "no
 * line is close" and the page says so rather than showing an empty panel.
 */
export function bindsNext(lines: readonly SpentLine[]): SpentLine | null {
  return lines.find((r) => !r.breached) ?? null
}

/**
 * What the book cannot say, counted rather than described.
 *
 * A line with a reading and no limit is not "fine" — it is unmeasured, and
 * the layer page's whole claim is that it ranks *every* constraint. Saying
 * how many it could not rank is the honest half of that claim.
 */
export function unranked(rows: readonly LimitRow[]): {
  noLine: LimitRow[]
  noReading: LimitRow[]
} {
  return {
    noLine: rows.filter((r) => r.limit == null && r.current != null),
    noReading: rows.filter((r) => r.current == null),
  }
}

/**
 * Where the ink turns amber — this page's own threshold, not the book's.
 *
 * `LIMIT_WATCH` (0.8) answers a different question on Limits & Breaches: *is
 * this worth seeing before it is crossed.* Here the question is *is this the
 * one about to bind*, and the design draws that at nine tenths. Two numbers
 * because they are two questions; both are named rather than inlined.
 */
export const RISK_NEAR_LINE = 0.9

/** Red, amber or plain — one function, so the bar, the reading and the % agree. */
export function lineTone(use: number): 'over' | 'near' | 'plain' {
  if (use >= 1) return 'over'
  return use >= RISK_NEAR_LINE ? 'near' : 'plain'
}

/**
 * The family stripe down the left of each row.
 *
 * The design colours by family, not by severity: severity is already the bar,
 * the reading and the kind tag, and a fourth encoding of it would say nothing
 * new. What the stripe adds is *which kind of constraint this is* — so a
 * reader can see at a glance that the top three rows are all Concentration.
 */
export const LIMIT_GROUP_STRIPE: Record<LimitGroup, string> = {
  Concentration: 'bg-rose-300',
  Velocity: 'bg-sky-300',
  Margin: 'bg-lime-400',
  Greeks: 'bg-stone-300',
  Event: 'bg-violet-300/60',
  Gate: 'bg-violet-400',
}

/** The line as the Cap column prints it — a floor says so, a ceiling is bare. */
export function capLabel(row: LimitRow): string {
  if (row.limit == null) return '—'
  const v = fmtReading(row, row.limit)
  return row.bound === 'floor' ? `floor ${v}` : v
}

/**
 * A crossed line in one line: what it reads, what it may not cross, where.
 *
 * The design writes this as prose per breach ("NVDA is 38% of portfolio delta
 * · limit 30%") because the panel is read at a glance, not scanned. This side
 * has the scope as a field rather than inside the sentence, so it ends the
 * line instead of being folded into the noun.
 */
export function breachDetail(row: LimitRow): string {
  const line = row.limit == null ? 'no line' : capLabel(row)
  return `${fmtReading(row, row.current)} against ${line} · ${row.scope}`
}

/**
 * How hard the panel should shout: red if anything that *blocks* is crossed.
 *
 * The design carries a severity per breach; this side derives it from what the
 * house already says happens — a hard line blocks the trade, a soft one asks
 * you to acknowledge it, and a gate is refused by the daemon before it
 * happens. Red is reserved for the first, so an amber panel means every
 * crossed line is one you may still choose to live with.
 */
export function breachTone(breached: readonly LimitRow[]): 'over' | 'near' | null {
  if (breached.length === 0) return null
  return breached.some((r) => r.kind === 'hard') ? 'over' : 'near'
}
