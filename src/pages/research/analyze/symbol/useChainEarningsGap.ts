/**
 * The earnings gap on the Chain face's picked expiry: when the next print —
 * Research's estimate — falls inside it, the move the ATM term prices for the
 * print (`utils/earningsEstimate.eventMove`, as the Payoff face sizes its
 * scenario rows), the two levels spot × (1 ∓ gap), and the ladder strikes
 * nearest them. A late print has no date to split the term at, so no gap.
 */
import type { ExpectedEarnings } from '@/api/research/narrative'
import { useAtmIvTerm } from '@/hooks/useVolSurfaceData'
import { eventMove, expiryEarnings, type TermVol } from '@/utils/earningsEstimate'
import { daysTo } from '@/utils/optionTicker'

export interface ChainGapLevel {
  label: string
  k: number
  cls: string
  title?: string
}

export interface ChainEarningsGap {
  /** Expected move on the print, a fraction of spot; null draws nothing. */
  move: number | null
  title: string | undefined
  chips: ChainGapLevel[]
  loStrike: number | null
  hiStrike: number | null
  /** The ladder's label for a strike nearest a gap level, else null. */
  ruled: (strike: number) => string | null
}

const gapPx = (x: number) => Number(x.toFixed(x < 50 ? 2 : 0))

/** The gap for one expiry from an ATM term already in hand (dte from today). */
export function chainEarningsGap(
  next: ExpectedEarnings | null,
  term: readonly TermVol[],
  spot: number | null,
  dte: number | null,
  strikes: readonly number[]
): ChainEarningsGap {
  const tag = dte != null && dte > 0 ? expiryEarnings(next, dte) : null
  const gap = tag && next && next.days_away >= 0 ? eventMove(term, next.days_away) : null
  if (!gap || spot == null) return { move: null, title: undefined, chips: [], loStrike: null, hiStrike: null, ruled: () => null }
  const lo = gapPx(spot * (1 - gap.move))
  const hi = gapPx(spot * (1 + gap.move))
  const nearest = (x: number) =>
    strikes.length === 0 ? null : strikes.reduce((b, k) => (Math.abs(k - x) < Math.abs(b - x) ? k : b))
  const unsure = tag?.tag === 'E?' ? '?' : ''
  const loStrike = nearest(lo)
  const hiStrike = nearest(hi)
  const title = `Earnings ${unsure ? 'may fall' : 'falls'} inside this expiry (estimated). The gap is the move the ATM term prices for the print — ${(gap.before.iv * 100).toFixed(1)}% on ${gap.before.expiry.slice(5)} before it against ${(gap.after.iv * 100).toFixed(1)}% on ${gap.after.expiry.slice(5)} after — as on the Payoff face.`
  return {
    move: gap.move,
    title,
    chips: [
      { label: `E −gap${unsure}`, k: lo, cls: 'text-warning', title },
      { label: `E +gap${unsure}`, k: hi, cls: 'text-warning', title },
    ],
    loStrike,
    hiStrike,
    ruled: (k) => (k === loStrike ? 'E −gap' : k === hiStrike ? 'E +gap' : null),
  }
}

export function useChainEarningsGap(
  symbol: string,
  next: ExpectedEarnings | null,
  spot: number | null,
  dte: number | null,
  today: string,
  strikes: readonly number[]
): ChainEarningsGap {
  const termQ = useAtmIvTerm(symbol)
  const term = (termQ.data?.term ?? []).map((p) => ({ expiry: p.expiry, dte: daysTo(p.expiry, today) ?? 0, iv: p.atm_iv }))
  return chainEarningsGap(next, term, spot, dte, strikes)
}
