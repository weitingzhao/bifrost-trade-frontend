/**
 * The size cap a play would earn under the design's own stated rule.
 *
 * The rule is the design's, written out on its page: full backing allowance;
 * half under twenty trades, because the 95% band on an eleven-trade sample
 * spans thirty-eight points and a cap should respect the band rather than the
 * point; none at all under a profit factor of 1.2, which also raises a decay
 * alert.
 *
 * Its inputs — n and the profit factor — are real here. Its *store* is not:
 * nothing on this side reads a cap, writes one, or enforces one, and the same
 * store is what Risk Budget is missing. So the column says what the rule would
 * produce and the header says nothing acts on it. Computing it is honest;
 * letting it read as an allowance in force would not be.
 */
import { THIN_SAMPLE, type PlayStat } from '@/utils/reviewTrades'

/** Below this profit factor the design's rule withdraws the allowance entirely. */
export const DECAY_PROFIT_FACTOR = 1.2

export interface SizeCap {
  tone: 'success' | 'warning' | 'danger'
  label: string
  why: string
}

export function sizeCapFor(play: PlayStat): SizeCap {
  if (play.profitFactor != null && play.profitFactor < DECAY_PROFIT_FACTOR) {
    return {
      tone: 'danger',
      label: 'none',
      why: `profit factor ${play.profitFactor.toFixed(2)}, under ${DECAY_PROFIT_FACTOR} — the rule raises a decay alert`,
    }
  }
  if (play.n < THIN_SAMPLE) {
    const width = Math.round((play.bandHigh - play.bandLow) * 100)
    return {
      tone: 'warning',
      label: 'half',
      why: `n ${play.n}, under ${THIN_SAMPLE} — the band is ${width} points wide`,
    }
  }
  return { tone: 'success', label: 'full', why: `n ${play.n} with profit factor over ${DECAY_PROFIT_FACTOR}` }
}
