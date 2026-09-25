/**
 * The Screener's funnel: a universe, seven stages, and the count after each.
 *
 * Design `Research Screener.dc.html` — the page's whole argument is that a
 * screen is *conditions in, a set out*, and that the interesting thing is
 * **where the count falls**. Stages are AND; chips inside a stage are OR
 * unless the stage carries a `min`, in which case it is "at least N of these".
 * Counts move as you click: the prototype has no Search step.
 *
 * ## What this side can actually answer, measured on DEV 2026-09-20
 *
 * `criteria-stats` (universe 5319, eval_date 2026-09-19) carries a per-
 * condition pass count for the eleven technical and the eight fundamental
 * conditions, and a `pass_count_distribution` for each — which is exactly the
 * `min` semantics: names passing at least N of them. So the first two stages
 * are live, chips and stage totals both.
 *
 * The other five are not, and each is missing for its own reason:
 *
 *   Momentum   countable, but **not** through `momentum-filter`: that reads
 *              `dw_stock.mart_sepa_tier_momentum`, which answers 200 with 0
 *              and a note saying it is awaiting 252+ trading days. The radar
 *              at `/research/momentum/radar` answers today — A+ 2, A 92, and
 *              B and C both at the route's 500 cap. The first pass of this
 *              walk read only the tier mart and called the whole stage dead,
 *              which was wrong, and is the reason a stage's reason has to
 *              name the endpoint rather than say "no data".
 *   Structure  `tier-filter?tier=structure`, the same mart, and here the note
 *              does hold: no second source answers it.
 *   Quality    `fundamental-filter` works — it returns rows for the growth
 *              conditions — and returns nothing for any of the seven quality
 *              ids. So this is no data for these conditions, not a broken
 *              endpoint. That distinction cost a cross-check to establish and
 *              is the only reason the row can say which.
 *   Catalyst   half live since Rev .43. The five Event Radar conditions have
 *              no condition ids on this side and no endpoint (the earnings
 *              window would come from the event feeds); the four SEC 8-K
 *              conditions the design added are counted from
 *              `/research/narrative?days=7`, which returns the whole window in
 *              one read (216 rows on 2026-09-25, cap 2000). Those four are the
 *              narrative column: they cut like any condition and never enter a
 *              composite, and the 8-K text covers the plugin's names (606),
 *              not the universe — a name outside it never passes one.
 *   Options    the same: IV rank, VRP and OI liquidity have no screen ids here.
 *
 * A stage with no data keeps its place and names what is missing. Dropping it
 * would make the funnel read as if seven stages had been applied.
 */

import { NARRATIVE_CONDITIONS } from '@/lib/research/narrativeItems'

export type StageMode = 'min' | 'any' | 'all'

export interface FunnelChip {
  id: string
  label: string
  /** Why nothing counts this one chip, when the rest of its stage is live. */
  missing?: string
  /**
   * The design's own sentence for a narrative-column condition (an SEC 8-K
   * item). Its presence is what marks the chip `narrative` — dashed, prefixed,
   * and never enough on its own to start a screen (Narrative page, rule 4).
   */
  narrative?: string
}

export interface FunnelStage {
  id: string
  title: string
  /** The design's own sub-line: how the chips combine. */
  mode: string
  kind: StageMode
  /** Default for the `min` stepper, when the stage has one. */
  min?: number
  chips: readonly FunnelChip[]
  /**
   * Why this stage cannot be counted, or null when it can.
   *
   * Written as the reason, not as "no data": the difference between a mart
   * that has not accumulated enough history and a condition nothing scores is
   * the difference between waiting and asking.
   */
  missing: string | null
}

const EVENT_RADAR_MISSING =
  'No screen condition on this side carries an earnings window or a theme — the event feeds are read per symbol, never across the universe.'

/** The seven stages, in the prototype's order. Ids mirror the app's catalog. */
export const FUNNEL_STAGES: readonly FunnelStage[] = [
  {
    id: 'trend',
    title: 'Trend template',
    mode: 'at least N of 11 · SEPA technical',
    kind: 'min',
    min: 8,
    missing: null,
    chips: [
      { id: 'avg_volume_50_gt_threshold', label: 'Vol 50D > 100K' },
      { id: 'crs_ge_70', label: 'CRS ≥ 70' },
      { id: 'close_ge_low52_x_1_3', label: '≥ L52 × 1.3' },
      { id: 'close_ge_high52_x_0_75', label: '≥ H52 × 0.75' },
      { id: 'sma50_gt_sma150', label: '50 > 150' },
      { id: 'sma50_gt_sma200', label: '50 > 200' },
      { id: 'sma150_gt_sma200', label: '150 > 200' },
      { id: 'sma200_rising_1m', label: '200 rising' },
      { id: 'price_gt_sma50', label: 'P > 50' },
      { id: 'price_gt_sma150', label: 'P > 150' },
      { id: 'price_gt_sma200', label: 'P > 200' },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    mode: 'at least N of 8 · SEPA fundamental',
    kind: 'min',
    min: 0,
    missing: null,
    chips: [
      { id: 'eps_q2q_ge_25pct', label: 'EPS QoQ ≥ 25%' },
      { id: 'rev_q2q_ge_25pct', label: 'Rev QoQ ≥ 25%' },
      { id: 'eps_acc_2q', label: 'EPS accel 2Q' },
      { id: 'rev_acc_2q', label: 'Rev accel 2Q' },
      { id: 'eps_3y_ge_15pct', label: 'EPS 3Y ≥ 15%' },
      { id: 'rev_3y_ge_15pct', label: 'Rev 3Y ≥ 15%' },
      { id: 'eps_acc_fy', label: 'EPS accel FY' },
      { id: 'rev_acc_fy', label: 'Rev accel FY' },
    ],
  },
  {
    id: 'momentum',
    title: 'Momentum',
    mode: 'grade · any selected',
    kind: 'any',
    // Live through the radar. The tier mart behind `momentum-filter` is still
    // accumulating, which is a fact about that mart and not about the grade.
    missing: null,
    chips: [
      { id: 'grade_aplus', label: 'A+' },
      { id: 'grade_a', label: 'A' },
      { id: 'grade_b', label: 'B' },
      { id: 'grade_c', label: 'C' },
    ],
  },
  {
    id: 'structure',
    title: 'Structure',
    mode: 'any selected',
    kind: 'any',
    missing:
      'dw_stock.mart_sepa_tier_structure is awaiting 252+ trading days of data — the same mart family as Momentum, and the same wait.',
    chips: [
      { id: 'vcp_contraction_3m', label: 'VCP 3M' },
      { id: 'bb_squeeze', label: 'BB squeeze' },
      { id: 'tight_closes_5d', label: 'Tight closes 5D' },
      { id: 'pocket_pivot_count', label: 'Pocket pivot' },
      { id: 'realized_vol_contraction', label: 'Vol contraction' },
      { id: 'rsl_new_high', label: 'RSL new high' },
    ],
  },
  {
    id: 'quality',
    title: 'Quality · balance · cash',
    mode: 'all selected',
    kind: 'all',
    missing:
      'The fundamental filter answers for the growth conditions and returns nothing for any of these seven, so it is these conditions that have no rows rather than the endpoint being down.',
    chips: [
      { id: 'gross_margin_ge_30pct', label: 'GM ≥ 30%' },
      { id: 'fcf_positive', label: 'FCF > 0' },
      { id: 'fcf_margin_ge_5pct', label: 'FCF margin ≥ 5%' },
      { id: 'debt_to_equity_le_1', label: 'D/E ≤ 1' },
      { id: 'roe_ge_15pct', label: 'ROE ≥ 15%' },
      { id: 'pe_le_60', label: 'P/E ≤ 60' },
      { id: 'net_margin_ge_5pct', label: 'Net margin ≥ 5%' },
    ],
  },
  {
    id: 'catalyst',
    title: 'Catalyst window',
    mode: 'any selected · Event Radar + SEC 8-K',
    kind: 'any',
    missing: null,
    chips: [
      { id: 'earn_gt_10d', label: 'Earnings > 10 days out', missing: EVENT_RADAR_MISSING },
      { id: 'earn_10_30d', label: 'Earnings in 10–30 days', missing: EVENT_RADAR_MISSING },
      { id: 'earn_lt_10d', label: 'Earnings < 10 days', missing: EVENT_RADAR_MISSING },
      { id: 'news_theme', label: 'In a live theme', missing: EVENT_RADAR_MISSING },
      { id: 'no_event_30d', label: 'No event 30 days', missing: EVENT_RADAR_MISSING },
      ...NARRATIVE_CONDITIONS.map((c) => ({ id: c.id, label: c.label, narrative: c.desc })),
    ],
  },
  {
    id: 'options',
    title: 'Options fit',
    mode: 'all selected · what a seller needs',
    kind: 'all',
    missing:
      'IV rank, VRP and open-interest liquidity have no screen ids here. They are read one symbol at a time on Symbol, not across a universe.',
    chips: [
      { id: 'ivr_ge_40', label: 'IV rank ≥ 40' },
      { id: 'ivr_ge_60', label: 'IV rank ≥ 60' },
      { id: 'vrp_gt_4', label: 'VRP > 4pp' },
      { id: 'oi_liquid', label: 'OI ≥ 5k · spread ≤ 5%' },
      { id: 'weeklies', label: 'Weekly expiries' },
    ],
  },
]

export interface DistBucket {
  conditions_passed: number
  symbol_count: number
}

/**
 * Names passing **at least** `n` of a stage's conditions.
 *
 * This is the `min` stepper's whole meaning, and the distribution already
 * holds it: the buckets are exact counts per number passed, so "at least N"
 * is their tail. Computing it here rather than reading `pass_8_plus` keeps
 * every step of the stepper answerable, not just the two the API pre-sums.
 */
export function atLeast(buckets: readonly DistBucket[] | null | undefined, n: number): number | null {
  if (buckets == null || buckets.length === 0) return null
  return buckets.reduce((sum, b) => (b.conditions_passed >= n ? sum + b.symbol_count : sum), 0)
}

export interface ConditionCount {
  id: string
  pass: number
  /** The route capped its page, so `pass` is a floor rather than a count. */
  capped?: boolean
}

/** A chip's own count, or null when nothing counts that condition. */
export function chipCount(
  counts: readonly ConditionCount[] | null | undefined,
  id: string,
): number | null {
  const hit = counts?.find((c) => c.id === id)
  return hit == null ? null : hit.pass
}

export interface StageReading {
  stage: FunnelStage
  /** Names passing **this stage**, against the universe. Null when uncountable. */
  n: number | null
  /** What this stage alone removes from the universe. Null when unknown. */
  dropped: number | null
  /** Share of the universe it leaves standing, 0–1, for the bar. */
  share: number | null
}

/**
 * The funnel, stage by stage.
 *
 * **Each stage is measured against the universe, not against the stage above
 * it**, and that is a divergence from the prototype worth stating plainly.
 * The prototype's column is the previous count after this gate — a running
 * intersection. This side can read "names passing at least N of these" for
 * free, per stage, from one endpoint; the running intersection would need the
 * symbol lists for every bucket in both tails and an intersection per click,
 * which is up to nineteen requests for a number the Results panel already
 * answers once the screen is applied.
 *
 * So the fall is still visible — both stages are counted against the same
 * 5319 — and no cell claims an intersection nobody computed. The footnote on
 * the panel says which reading it is.
 *
 * A stage that cannot be counted reads `—` and does not end the funnel: the
 * ones below it are measured against the universe too, so they still say
 * something true.
 */
export function funnelReadings(
  universe: number | null,
  counts: Partial<Record<string, number | null>>,
): StageReading[] {
  return FUNNEL_STAGES.map((stage) => {
    const n = stage.missing == null ? (counts[stage.id] ?? null) : null
    const dropped = n != null && universe != null ? universe - n : null
    const share = n != null && universe != null && universe > 0 ? n / universe : null
    return { stage, n, dropped, share }
  })
}
