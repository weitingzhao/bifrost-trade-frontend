/**
 * What the Portfolio layer page reads, worked out away from the JSX.
 *
 * The page itself computes nothing that another page owns — Accounts owns the
 * freshness rows, Performance owns the quarter's split and the reading strip.
 * What is left over is this file: the verdict those rows add up to, the order
 * they are shown in, and the bar each one is drawn against.
 */
import type { FreshnessRow, FreshnessState } from '@/utils/accountsFreshnessRows'
import type { ReadingMetric } from '@/utils/performanceReading'

/**
 * A month without a record is the line the design draws, and the reason is
 * the account statement cycle: under it a quiet source is plausibly a quiet
 * account, over it something has stopped.
 */
export const STALE_DAYS = 30

/** Two days: inside the trading day, plus the night the broker files. */
export const CURRENT_DAYS = 2

/**
 * Freshness is quiet when fine and amber when late (§16.13, Rev .82): red is
 * never a freshness colour — it is kept for a fault, and a source that is a
 * month behind is late, not broken. The lamp still says "fine" in green; the
 * words and the number stay neutral.
 */
export const STATE_LAMP: Record<FreshnessState, 'green' | 'yellow' | 'red' | 'gray'> = {
  current: 'green',
  behind: 'yellow',
  dry: 'yellow',
  noReading: 'gray',
}

export const STATE_TAG: Record<
  FreshnessState,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  current: { label: 'current', variant: 'neutral' },
  behind: { label: 'lagging', variant: 'warning' },
  dry: { label: 'stale', variant: 'warning' },
  noReading: { label: 'no reading', variant: 'neutral' },
}

/** The Days column: soft when current, amber when late, quiet when unmeasured. */
export const STATE_INK: Record<FreshnessState, string> = {
  current: 'text-[var(--sk-soft)]',
  behind: 'text-warning',
  dry: 'text-warning',
  noReading: 'text-muted-foreground',
}

export interface TrustRow extends FreshnessRow {
  /** Share of the oldest row's age, 0–1. Null when this row has no number. */
  bar: number | null
}

/**
 * The board, oldest first, each row measured against the oldest.
 *
 * **Age, not severity.** Sorting by state instead would put a source that has
 * been silent half a year under one that is two days behind, because the
 * silent one is a journal nobody promised to write daily and carries no
 * threshold. The header says oldest first, so it is oldest first, and the
 * `no reading` tag beside the row is what says no threshold applies to it.
 *
 * The bar is relative rather than absolute on purpose: an axis in days would
 * have to pick a ceiling, and the only ceiling that never lies is the oldest
 * row already on the board.
 */
export function trustBoard(rows: readonly FreshnessRow[]): TrustRow[] {
  // A row with no age at all sits last: it is not old, it is unmeasured.
  const sorted = rows.slice().sort((a, b) => {
    if (a.days == null || b.days == null) return (a.days == null ? 1 : 0) - (b.days == null ? 1 : 0)
    return b.days - a.days
  })
  const worst = sorted.reduce((m, r) => Math.max(m, r.days ?? 0), 0)
  return sorted.map((r) => ({
    ...r,
    bar: r.days == null || worst <= 0 ? null : Math.min(1, r.days / worst),
  }))
}

/** The bar takes the Days column's ink, so a row cannot read two ways at once. */
export const STATE_BAR: Record<FreshnessState, string> = {
  current: 'bg-[var(--sk-soft)]',
  behind: 'bg-warning',
  dry: 'bg-warning',
  noReading: 'bg-lamp-gray',
}

/**
 * The sentence the panel's header is, and how loudly to say it.
 *
 * A source that has never written is counted apart from one that has gone
 * quiet: the first is a gap in the setup, the second is a gap in the record,
 * and a verdict that adds them says neither.
 *
 * Staleness is amber, however old (§16.13): only a board with nothing on it
 * at all is a failure, and that is the one red.
 */
export function trustVerdict(rows: readonly FreshnessRow[]): {
  headline: string
  tone: 'warning' | 'danger' | undefined
} {
  if (rows.length === 0) {
    return { headline: 'No source has reported', tone: 'danger' }
  }
  const stale = rows.filter((r) => r.state === 'dry').length
  const silent = rows.filter((r) => r.state === 'noReading').length
  const behind = rows.filter((r) => r.state === 'behind').length
  if (stale > 0) {
    const tail = silent > 0 ? `, and ${silent} never wrote at all` : ''
    return {
      headline: `${stale} of ${rows.length} sources are over a month old${tail}`,
      tone: 'warning',
    }
  }
  if (behind > 0) {
    return { headline: `${behind} of ${rows.length} sources are behind`, tone: 'warning' }
  }
  if (silent > 0) {
    return { headline: `${silent} of ${rows.length} sources have never written`, tone: 'warning' }
  }
  return { headline: 'Every source is current', tone: undefined }
}

/**
 * The six figures the design's strip carries, quoted from Performance's own
 * reading rather than recomputed.
 *
 * Named by label because that is what `buildReadingMetrics` is keyed on; a
 * label that stops existing drops out of the strip rather than printing a
 * blank, which is the failure that would otherwise pass unnoticed.
 */
export const TOTALS_WANTED = [
  'Profitability · total P&L',
  'Realized',
  'Unrealized',
  'Net of fees',
  'Commissions',
  'Cash flows excluded',
] as const

/** Shorter names for a strip: the reading panel has room for the long ones. */
const TOTALS_SHORT: Record<string, string> = {
  'Profitability · total P&L': 'Total P&L',
  'Cash flows excluded': 'Net cash flow',
}

export function totalsStrip(metrics: readonly ReadingMetric[]): ReadingMetric[] {
  const byLabel = new Map(metrics.map((m) => [m.label, m]))
  return TOTALS_WANTED.flatMap((label) => {
    const m = byLabel.get(label)
    return m == null ? [] : [{ ...m, label: TOTALS_SHORT[label] ?? m.label }]
  })
}
