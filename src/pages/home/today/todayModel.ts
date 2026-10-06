/**
 * Today — the action surface, and the only page that belongs to no layer.
 *
 * Every row is a thing to *do*, carrying a link into the layer that owns the
 * figure behind it. Nothing here mirrors a number that already has a home: a
 * row that is only a figure would make this a board, and a board is what fails
 * at 15:45 with pin risk on three strikes.
 *
 * The page is built out of **checks** rather than rows. A check is a question
 * asked of the book — "is anything expiring today?", "is a limit breached?" —
 * and it has three outcomes, which must not be blurred:
 *
 *   rows        the answer is yes, and here is what to do about it
 *   clean       the question was asked and the answer is no
 *   cannot run  nothing on this side can ask it, and why
 *
 * The design's empty state says "No expiries today, no overnight stop breach,
 * capital unchanged" — three clean answers in one sentence. On this book two of
 * those three cannot be asked at all (no daily snapshot, no plan ever linked to
 * a position), and printing that sentence would be a claim rather than a
 * reading. So an empty segment lists what came back clean and, separately, what
 * could not be checked.
 */
import type { MarketSessionSegment } from '@/lib/marketSession'
import { fmtIsoDateToken } from '@/lib/format'
import { ESTIMATE_ONLY, noneByReason, type PrintsAhead } from '@/utils/earningsReading'

export type HomeSegment = MarketSessionSegment
export type HomeUrgency = 'now' | 'soon' | 'today'
export type HomeLayer = 'trade' | 'portfolio' | 'research' | 'risk' | 'review'

export interface HomeRow {
  key: string
  seg: HomeSegment
  urg: HomeUrgency
  layer: HomeLayer
  /** The thing to do, in one line. */
  what: string
  /** Why it is on the page, and what decides it. */
  why: string
  /** The layer that owns the figure behind the row. */
  to: string
}

export interface HomeCheck {
  key: string
  seg: HomeSegment
  layer: HomeLayer
  /** The question, phrased so it reads the same whether the answer is yes or no. */
  question: string
  rows: HomeRow[]
  /** Set when the question cannot be asked at all: what is missing, and where it would come from. */
  cannotRun: string | null
  /**
   * Set when the question could be asked of most of the book but not all of it.
   *
   * A check that reads twelve legs and cannot price the thirteenth has not come
   * back clean — it has come back clean for twelve. Without this the page would
   * quietly widen a partial answer into a whole one.
   */
  partial?: string | null
  /** Where the reading behind the question lives. */
  to: string
}

export interface HomeSegmentView {
  seg: HomeSegment
  window: string
  title: string
  note: string
  isNow: boolean
  rows: HomeRow[]
  /** Questions asked, answered no — and able to be asked of the whole book. */
  clean: HomeCheck[]
  /** Questions answered for part of the book only. */
  partial: HomeCheck[]
  /** Questions nothing on this side can ask. */
  blind: HomeCheck[]
}

export const HOME_SEGMENTS: { id: HomeSegment; window: string; title: string; note: string }[] = [
  {
    id: 'pre',
    window: 'Pre-open · until 09:30',
    title: 'What happened while I was away',
    note: 'overnight marks, today’s deadlines, capital',
  },
  {
    id: 'rth',
    window: 'Intraday · 09:30–15:30',
    title: 'What I can act on now',
    note: 'orders, adjustments, live limits',
  },
  {
    id: 'close',
    window: 'Pre-close · 15:30–16:00',
    title: 'What expires with the session',
    note: 'pin, roll, reconcile',
  },
]

export const HOME_LAYERS: Record<HomeLayer, { label: string; ink: string }> = {
  // The design gives each layer its own hue. The five hexes are not in this
  // app's palette, so each maps to the token that already means that layer
  // here — no new colours enter the system for one page.
  trade: { label: 'Trading', ink: 'text-primary' },
  portfolio: { label: 'Portfolio', ink: 'text-secondary-foreground' },
  research: { label: 'Research', ink: 'text-[var(--color-entity-option)]' },
  risk: { label: 'Risk', ink: 'text-warning' },
  review: { label: 'Review', ink: 'text-[var(--color-entity-strategy)]' },
}

/**
 * The session rule lives in `lib/marketSession` now that Live reads it too
 * (§14.2); re-exported here so this page's own vocabulary is unchanged.
 */
export { sessionSegment, sessionLabel } from '@/lib/marketSession'

/** One row of the ambient tape: what the book watches, not a quote board. */
export interface TapeRow {
  symbol: string
  last: number | null
  changePct: number | null
  /** Why this name is on the tape at all. */
  note: string
}

export function segmentViews(checks: readonly HomeCheck[], nowSeg: HomeSegment): HomeSegmentView[] {
  return HOME_SEGMENTS.map((g) => {
    const mine = checks.filter((c) => c.seg === g.id)
    return {
      seg: g.id,
      window: g.window,
      title: g.title,
      note: g.note,
      isNow: g.id === nowSeg,
      // Most urgent first, and a stable order inside a rank so the page does
      // not reshuffle itself under the reader between polls.
      rows: mine
        .flatMap((c) => c.rows)
        .sort((a, b) => URGENCY_RANK[a.urg] - URGENCY_RANK[b.urg] || a.key.localeCompare(b.key)),
      clean: mine.filter((c) => c.cannotRun == null && c.partial == null && c.rows.length === 0),
      partial: mine.filter((c) => c.cannotRun == null && c.partial != null),
      blind: mine.filter((c) => c.cannotRun != null),
    }
  })
}

const URGENCY_RANK: Record<HomeUrgency, number> = { now: 0, soon: 1, today: 2 }

export function countByUrgency(rows: readonly HomeRow[]): Record<HomeUrgency, number> {
  const out: Record<HomeUrgency, number> = { now: 0, soon: 0, today: 0 }
  for (const r of rows) out[r.urg] += 1
  return out
}

/** Checks that produced nothing because nothing on this side can ask them. */
export function blindSpots(checks: readonly HomeCheck[]): HomeCheck[] {
  return checks.filter((c) => c.cannotRun != null)
}

export function allRows(checks: readonly HomeCheck[]): HomeRow[] {
  return checks.flatMap((c) => c.rows)
}

/**
 * "Does a holding report earnings this week?" — answered from Research's
 * estimated print (`expected_next`, est.), the read the Events lanes and the
 * Book drawer use. The confirmed calendar is outside the data subscription,
 * so every row says it is an estimate; a name with no estimate is named with
 * why, and the check reads as answered for part of the book rather than clean.
 */
export function earningsWeekCheck(
  prints: PrintsAhead,
  asked: number,
): { rows: Pick<HomeRow, 'urg' | 'what' | 'why'>[]; partial: string | null } {
  const rows = prints.ahead.map((p) => {
    const day = fmtIsoDateToken(p.date)
    return {
      urg: p.late || p.daysAway <= 1 ? ('now' as const) : ('soon' as const),
      what: p.late
        ? `${p.symbol}'s print is late — est. ${day}, no results 8-K on file yet`
        : `${p.symbol} reports ${p.daysAway === 0 ? 'today' : p.daysAway === 1 ? 'tomorrow' : `in ${p.daysAway} days`} — ${day} est.`,
      why: `Research's estimate: last year's same-quarter results 8-K plus 52 weeks (${ESTIMATE_ONLY}). Check what the book carries through the print.`,
    }
  })
  const parts: string[] = []
  if (prints.pending.length > 0) parts.push(`${prints.pending.length} of ${asked} names are still being read`)
  if (prints.unread.length > 0) parts.push(`the earnings read failed for ${prints.unread.join(', ')}`)
  if (prints.none.length > 0) {
    parts.push(`no estimate for ${prints.none.length} of ${asked} names — ${noneByReason(prints.none)}`)
  }
  return { rows, partial: parts.length > 0 ? parts.join('; ') : null }
}
