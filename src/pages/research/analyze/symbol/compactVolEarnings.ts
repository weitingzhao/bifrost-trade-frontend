/**
 * Earnings on the 440 page's Volatility sections. The 440 page does not
 * redraw the wide face's charts (an open section holds the lens's words, its
 * record and its date; the charts are one ⇢ away), so the marks those charts
 * carry are said in words, in the section whose chart carries them:
 *
 * - **IV rank**: the 60d rank path's key: the prints inside the window, and
 *   the next estimate or the late one.
 * - **Term structure**: the term chart's mark: when the print is expected,
 *   the first expiry after it and the move the ATM term prices for it; a
 *   late print gets the term panel's warning instead.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { useVrpHistory } from '@/hooks/useVrpData'
import { useEarningsDates } from '@/hooks/useNarrative'
import { useAtmIvTerm } from '@/hooks/useVolSurfaceData'
import { todayIso } from '@/lib/researchFreshness'
import {
  EVENT_WINDOW_DAYS,
  estimateCaveat,
  eventMove,
  firstExpiryAfter,
  lateLead,
  shortDate,
  type TermVol,
} from '@/utils/earningsEstimate'
import { daysTo } from '@/utils/optionTicker'
import { rankPathEarnings } from './rankPathEarnings'

export interface FoldEarningsLine {
  text: string
  /** The estimate's caveat, or the late lead — the hover, never the only home of the date. */
  title: string
  late: boolean
}

/** The sections that carry a line, keyed by lens id. */
export type VolFoldEarnings = Partial<Record<'iv_rank' | 'term_slope', FoldEarningsLine>>

/** The rank path's window, as the wide face draws it. */
const PATH_SESSIONS = 60

export function volFoldEarnings(opts: {
  /** The vrp store's sessions, oldest first; the last 60 are the path. */
  sessions: readonly (string | null)[]
  filings: readonly string[]
  next: ExpectedEarnings | null | undefined
  /** The ATM store's expiries, days counted from today, vol a fraction. */
  term: readonly TermVol[]
}): VolFoldEarnings {
  const { next } = opts
  const out: VolFoldEarnings = {}

  const path = opts.sessions.slice(-PATH_SESSIONS)
  if (path.length > 0) {
    const pe = rankPathEarnings(path, opts.filings, next)
    const printed = pe.printed.map((d) => shortDate(d)).join(' · ')
    const pending = !next
      ? null
      : next.days_away < 0
        ? `expected ~${shortDate(next.date)} — late`
        : `next ~${shortDate(next.date)} · ${next.days_away}d (est.)`
    if (printed || pending) {
      out.iv_rank = {
        text: `Earnings on the 60d path: ${printed || 'none'}${pending ? ` · ${pending}` : ''}`,
        title: pe.pending?.title ?? 'Results 8-K filing sessions inside the 60-session rank path.',
        late: next != null && next.days_away < 0,
      }
    }
  }

  if (next && next.days_away < 0) {
    out.term_slope = {
      text: `Earnings late — expected ~${shortDate(next.date)}, no results 8-K yet. The curve carries no earnings line, and until it prints any expiry may still hold its premium.`,
      title: lateLead(next),
      late: true,
    }
  } else if (next) {
    const when = `~${shortDate(next.date)} (${next.days_away}d, est.)`
    if (next.days_away > EVENT_WINDOW_DAYS) {
      out.term_slope = { text: `No earnings inside ${EVENT_WINDOW_DAYS} days — the next is ${when}.`, title: estimateCaveat(next), late: false }
    } else {
      const ev = eventMove(opts.term, next.days_away)
      const after = ev?.after ?? firstExpiryAfter(next, opts.term)
      out.term_slope = {
        text:
          `Next earnings ${when}` +
          (after ? ` — ${after.expiry.slice(5)} is the first expiry after it and carries the event premium` : '') +
          (ev ? ` · ±${(ev.move * 100).toFixed(1)}% priced` : '') +
          '.',
        title: estimateCaveat(next),
        late: false,
      }
    }
  }
  return out
}

/**
 * The lines for the open Volatility tab. The earnings and ATM term queries
 * are the ones the page's faces already hold; the vrp year is the wide face's
 * own query, asked only while the tab is open.
 */
export function useVolFoldEarnings(symbol: string, on: boolean): VolFoldEarnings {
  const vrpQ = useVrpHistory(on ? symbol : '', 252)
  const earnQ = useEarningsDates(symbol)
  const termQ = useAtmIvTerm(symbol)
  if (!on || !earnQ.data) return {}
  const today = todayIso()
  return volFoldEarnings({
    sessions: (vrpQ.data ?? []).map((r) => r.trade_date),
    filings: earnQ.data.dates,
    next: earnQ.data.expected_next ?? null,
    term: (termQ.data?.term ?? []).map((p) => ({ expiry: p.expiry, dte: daysTo(p.expiry, today) ?? 0, iv: p.atm_iv })),
  })
}
