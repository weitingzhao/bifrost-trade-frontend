/**
 * The rail's presets — starting points, not models (design `Research Stock
 * Screen.dc.html` L101, PRESETS L324-329).
 *
 * A preset **sets criteria**: stage minimums, trend / growth conditions,
 * structure signals, momentum grades. Applying one replaces the funnel's
 * criteria and says so; it is just criteria, edit freely, then Run. Until
 * 2026-09-30 two of these loaded a model's name list instead (SEPA Daily Core
 * was the Ratings list at SETUP + PIVOT, all 299 of them inside Ratings),
 * which is why the rail read like a second copy of Ratings.
 *
 * What each one can and cannot carry here, measured on DEV 2026-09-30:
 *
 *   SEPA Daily Core  trend ≥ 9 of 11 and any of VCP / tight closes / BB
 *                    squeeze. The structure tier has no VCP or tight-closes
 *                    signal; VCP is read as its ATR contraction
 *                    (`vol_contracting`), tight closes is left out.
 *   Momentum Radar   grade A+ or A on the radar's latest session (1 name on
 *                    2026-09-29; the old list counted months of sessions).
 *   Event Radar      earnings inside 30 days or a live theme — no condition
 *                    carries an earnings window across the universe.
 *   Premium seller   IV rank, VRP and option liquidity have no screen ids.
 */

export interface PresetCriteria {
  /** Stage minimums ("at least N of"), by stage id. */
  mins: Record<string, number>
  /** Required trend (technical) conditions. */
  tech: string[]
  /** Required growth (fundamental) conditions. */
  cond: string[]
  /** Structure signals, any one of which passes. */
  structureAny: string[]
  /** Momentum grade chip ids. */
  grades: string[]
}

export interface ScreenerPreset {
  id: string
  label: string
  /** The design's own sub-line: what the preset selects. */
  meta: string
  /** Null when this side has no condition for it. */
  criteria: PresetCriteria | null
  /** What the preset reads differently from the design, or why it cannot be offered. */
  note: string | null
}

export const SCREENER_PRESETS: readonly ScreenerPreset[] = [
  {
    id: 'sepa-daily-core',
    label: 'SEPA Daily Core',
    meta: 'trend ≥ 9 · VCP / squeeze',
    criteria: { mins: { trend: 9, growth: 0 }, tech: [], cond: [], structureAny: ['vol_contracting', 'bb_squeeze'], grades: [] },
    note: 'VCP is read as ATR contraction (ATR < 80% of 50 days ago); the structure tier carries no tight-closes signal, so that leg is left out.',
  },
  {
    id: 'momentum-radar',
    label: 'Momentum Radar',
    meta: 'grade A+ · A',
    criteria: { mins: { trend: 0, growth: 0 }, tech: [], cond: [], structureAny: [], grades: ['grade_aplus', 'grade_a'] },
    note: 'Grades on the radar’s latest session only.',
  },
  {
    id: 'event-radar',
    label: 'Event Radar',
    meta: 'earnings ≤ 30d · theme',
    criteria: null,
    note: 'No screen condition carries an earnings window or a live theme across the universe — the event feeds are read per symbol.',
  },
  {
    id: 'premium-seller',
    label: 'Premium seller',
    meta: 'IV rank · VRP · liquid',
    criteria: null,
    note: 'IV rank, VRP and option liquidity have no screen ids here; they are read one symbol at a time on Symbol.',
  },
]
