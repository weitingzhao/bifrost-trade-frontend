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
 *
 * Two readers since 2026-09-23, which is why it moved here from Playbook
 * stats: that page labels each play with the allowance, and Compare turns
 * the same allowance on a structure's record into its conviction cap — the
 * prototype's own words for the panel are "feeds the conviction cap on
 * Compare". One rule, read twice (§14.2).
 */
import { THIN_SAMPLE } from '@/utils/reviewTrades'

/** What the rule reads off a record — a play's or a structure's. */
export interface SizeCapRecord {
  /** Trades that settled either way. */
  n: number
  /** Gross win over gross loss; null when the record has never lost. */
  profitFactor: number | null
  /** 95% band on the win rate. */
  bandLow: number
  bandHigh: number
}

/** Below this profit factor the design's rule withdraws the allowance entirely. */
export const DECAY_PROFIT_FACTOR = 1.2

export interface SizeCap {
  tone: 'success' | 'warning' | 'danger'
  label: 'full' | 'half' | 'none'
  why: string
}

/** The share of the backing cap each allowance leaves — Compare's conviction cap. */
export const ALLOWANCE_SHARE: Record<SizeCap['label'], number> = { full: 1, half: 0.5, none: 0 }

export function sizeCapFor(play: SizeCapRecord): SizeCap {
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
