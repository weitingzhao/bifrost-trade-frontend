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
import type { LimitRow } from '@/utils/limitsModel'

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
