/**
 * Earnings on the Dealer face. A pin — and the walls and zero γ — are read
 * off today's open interest at one expiry; a print before that expiry gaps
 * spot away from them and the open interest is rebuilt after it. So the face
 * says where the estimated print falls against each panel's expiry, and which
 * of the settled cycles had a print inside them.
 *
 * The pin store's record starts in August 2026 (one or two settled cycles a
 * name on 2026-09-26), too few to split a pin rate by "print inside or not" —
 * the face marks the cycles and makes no claim about the rate.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { thirdFriday } from '@/utils/bookCalendar'
import { estimateCaveat, lateLead, shortDate, type EventMove } from '@/utils/earningsEstimate'
import { foldFilings } from './rankPathEarnings'

/** The monthly OpEx before a cycle's own, for the oldest cycle on record. */
function priorMonthly(opex: string): string {
  const y = Number(opex.slice(0, 4))
  const m0 = Number(opex.slice(5, 7)) - 1
  return m0 === 0 ? thirdFriday(y - 1, 11) : thirdFriday(y, m0 - 1)
}

/**
 * The prints inside each settled cycle — after the OpEx before it, up to and
 * including its own — keyed by the cycle's OpEx date. Cycles without one are
 * left out.
 */
export function cyclePrints(opexDates: readonly (string | null)[], filings: readonly string[]): Map<string, string[]> {
  const dates = [...new Set(opexDates.filter((d): d is string => Boolean(d)).map((d) => d.slice(0, 10)))].sort()
  const prints = foldFilings(filings)
  const out = new Map<string, string[]>()
  dates.forEach((opex, i) => {
    const from = i > 0 ? dates[i - 1] : priorMonthly(opex)
    const inside = prints.filter((d) => d > from && d <= opex)
    if (inside.length > 0) out.set(opex, inside)
  })
  return out
}

export interface OpexEarnings {
  tag: { label: string; title: string; tone: 'warning' | 'neutral' }
  /** The panel's warning when the print can land inside the cycle; null when it cannot. */
  note: string | null
}

/** What each panel reads at its expiry, and so what a print does to it. */
const EXPIRY_WORDS = {
  pin: {
    reads: `The pin is read off today's open interest; the print moves spot off it and the open interest is rebuilt after it.`,
    late: 'a print moves spot off the pin and the open interest the pin is read from is rebuilt after it.',
    settles: 'this cycle settles',
  },
  levels: {
    reads: `The walls and zero γ are read off today's open interest at that expiry; the print moves spot through them and the open interest is rebuilt after it.`,
    late: 'a print moves spot through the walls and the open interest they are read from is rebuilt after it.',
    settles: 'these levels expire',
  },
  book: {
    reads: 'The notional at this expiry carries positioning for the print — new contracts here (vol / OI above 1) may be the event rather than a view.',
    late: 'the notional at this expiry may be positioning for it.',
    settles: 'this expiry settles',
  },
} as const

/**
 * Where the estimated print falls against a panel's expiry. On the expiry day
 * counts as before: the release's hour is unknown, and a morning print lands
 * inside the settling session. Read by the Dealer face (the pin, the levels)
 * and the Flow face (the concentration's book).
 */
export function opexEarnings(opts: {
  next: ExpectedEarnings | null | undefined
  /** The pin's expiry, ISO. */
  expiry: string | null
  /** The move the ATM term prices for the print. */
  gap?: EventMove | null
  /** Spot to the pin strike, a fraction. */
  pinDist?: number | null
  /** What the panel reads at that expiry: the OpEx pin, the gamma walls and zero γ, or the flow's book. */
  about?: keyof typeof EXPIRY_WORDS
}): OpexEarnings | null {
  const { next, expiry } = opts
  const about = opts.about ?? 'pin'
  const words = EXPIRY_WORDS[about]
  if (!next) return null
  const exp = expiry ? expiry.slice(5) : null
  if (next.days_away < 0) {
    return {
      tag: { label: `E ~${shortDate(next.date)}? late`, title: lateLead(next), tone: 'warning' },
      note:
        `Earnings late — expected ~${shortDate(next.date)}, no results 8-K yet. Until it prints, any session` +
        `${exp ? ` before the ${exp} expiry` : ''} may carry it; ${words.late}`,
    }
  }
  const when = `~${shortDate(next.date)} (${next.days_away}d, est.)`
  if (!expiry) {
    return { tag: { label: `E ~${shortDate(next.date)} · ${next.days_away}d`, title: estimateCaveat(next), tone: 'neutral' }, note: null }
  }
  if (next.date > expiry) {
    return {
      tag: {
        label: `E ~${shortDate(next.date)} · after expiry`,
        title: `Next earnings estimated ${next.date}, after the ${exp} expiry — ${words.settles} before the print. ${estimateCaveat(next)}`,
        tone: 'neutral',
      },
      note: null,
    }
  }
  const against =
    opts.gap != null
      ? ` — the ATM term prices ±${(opts.gap.move * 100).toFixed(1)}% for it${
          about === 'pin' && opts.pinDist != null ? `, against ${(opts.pinDist * 100).toFixed(1)}% from spot to the pin strike` : ''
        }`
      : ''
  return {
    tag: { label: `E ~${shortDate(next.date)} · before expiry`, title: estimateCaveat(next), tone: 'warning' },
    note: `Earnings ${when} land${next.date === expiry ? ' on' : ' before'} the ${exp} expiry${against}. ${words.reads}`,
  }
}
