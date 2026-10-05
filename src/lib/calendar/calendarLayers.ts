/**
 * The Calendar's layers (design `Home Calendar.dc.html`, Rev .145–.150) — the
 * shape every layer reader returns, so the page draws them one way.
 *
 * The Calendar computes nothing (§14.2): each layer quotes the page that owns
 * it, through that page's own reader. These modules only place the owner's
 * rows on a day and say where each one opens. They draw nothing.
 *
 * Days are New York trading days (`YYYY-MM-DD`) unless a layer's owner dates
 * its rows otherwise — P&L keeps Performance's own day, as Performance prints
 * it; each reader says which day it uses.
 */
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'

export type CalendarLayerId =
  | 'pnl'
  | 'fills'
  | 'decisions'
  | 'notes'
  | 'events'
  | 'expiry'
  | 'corp'
  | 'horizons'
  | 'drafts'

/** The prototype's inks: macro ink, contract sky, ticker lime, soft, mute. */
export type CalendarInk = 'macro' | 'contract' | 'sym' | 'soft' | 'mute'

/** One dated thing on one layer — the prototype's `I(d, layer, cell, text, syms, ink)`. */
export interface CalendarItem {
  /** Stable across renders: layer + the owner's own id. */
  key: string
  /** The day it sits on, `YYYY-MM-DD`. */
  d: string
  layer: CalendarLayerId
  /** A future layer's short cell label (`SMCI 2 legs`, `CPI`); '' on a past layer, which a cell counts. */
  cell: string
  /** The full line, for the day panel and the list. */
  text: string
  /** Underlyings it is about; empty for a macro event or a book-level row. */
  syms: string[]
  ink: CalendarInk
  /** Where it opens — a route and only the params that page reads. */
  to: string
  /** An estimate rather than a fact (earnings `est.`). */
  est?: boolean
}

/**
 * How far a layer can be read right now.
 * - `signed-out`: Research answers 401 — the layer is not empty, it is unread.
 * - `unprovided`: the owner's store has no field for it yet (named in `note`).
 */
export type CalendarLayerState = 'loading' | 'ready' | 'failed' | 'signed-out' | 'unprovided'

export interface CalendarLayerReading<T = CalendarItem> {
  layer: CalendarLayerId
  items: T[]
  state: CalendarLayerState
  /** Why the layer is empty or partial, in the page's words; null when it is whole. */
  note: string | null
  /**
   * True when a read hit its page limit, so a count is a lower bound (`≥ n`),
   * not a total.
   */
  floor?: boolean
}

/** A layer's state from its reads: any 401 is signed-out, any failure with nothing in hand failed. */
export function layerStateOf(
  queries: readonly { isPending: boolean; isError: boolean; error: unknown; data: unknown }[],
): CalendarLayerState {
  if (queries.some((q) => q.isError && q.data == null && firstResearchAuthGapError(q.error) !== undefined)) {
    return 'signed-out'
  }
  if (queries.some((q) => q.isError && q.data == null)) return 'failed'
  if (queries.some((q) => q.isPending)) return 'loading'
  return 'ready'
}
