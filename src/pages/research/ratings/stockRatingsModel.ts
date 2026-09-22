/**
 * The equity model's daily opinion, and the weights behind it.
 *
 * Design `Research Ratings Stocks.dc.html`: *"one composite, weights yours to
 * move"*. That sentence is the page. A ranked list whose ranking you cannot
 * interrogate is a number to take on faith; one whose weights you can move is
 * a model you can argue with.
 *
 * ## What the data allows, measured on DEV 2026-09-21
 *
 * `/research/sepa/model/daily` returns 500 rows carrying four component
 * scores per symbol — `trend_template_score` (45.5–100),
 * `fundamental_score` (0–100), `momentum_score` (0–90) and
 * `structure_score` (0–95.3) — and, in `factors_json`, **the weights the
 * server combined them with**: trend 0.35, fundamental 0.30, momentum 0.20,
 * structure 0.15. `sepa_score` is that combination, and it reconciles: AMD's
 * 81.62 is exactly the weighted sum of its four.
 *
 * So the sliders are not a decoration over a fixed number. They recompute the
 * composite from the same four scores the server used, and the default preset
 * is the server's own weights — which means the page opens agreeing with
 * `sepa_score` and every move away from it is a question you asked.
 *
 * What the design draws and the data does not carry, each marked on the page
 * rather than faked: a **relative-strength** lens (no RS or CRS field on this
 * row), an **Earn** column (no earnings date reaches this side at all), a
 * **Rule** column (no per-name evaluation of Trade › Rules), and the per-lens
 * **1-year band** — `high_52w`/`low_52w` are price, not lens history, so a
 * lens bar can only say where the score sits on its own scale.
 */

import { finiteOrNull } from '@/utils/finite'

/** The four the model actually combines. Order is the design's reading order. */
export const RATING_LENSES = [
  { key: 'trend', label: 'Trend', field: 'trend_template_score' },
  { key: 'growth', label: 'Growth', field: 'fundamental_score' },
  { key: 'momentum', label: 'Momentum', field: 'momentum_score' },
  { key: 'structure', label: 'Structure', field: 'structure_score' },
] as const

export type RatingLensKey = (typeof RATING_LENSES)[number]['key']
export type RatingWeights = Record<RatingLensKey, number>

/**
 * The checklists behind the two scores that have one.
 *
 * `trend_template_score` is exactly `tech_pass_count / 11 × 100` — measured
 * across all 500 rows on DEV 2026-09-21, the score takes only the eleven
 * values 45.45, 54.55 … 100 and each one is a pass count. `fundamental_score`
 * is the same against eight. So the design's `8/11` and `3/8` are not a
 * different reading from the percentage; they are the *same number in a form
 * that says what it counted*.
 *
 * Which matters here more than it looks: 231 of the 500 rows score exactly
 * 100 on trend, so a column of percentages is a column of hundreds, while
 * `11/11` beside `10/11` still says which checks a name is missing.
 */
export const TREND_CHECKS = 11
export const GROWTH_CHECKS = 8

/** Where the design cuts the composite. Hot is the design's own 70. */
export const HOT_AT = 70
export const COLD_AT = 35

export type RatingFlag = 'hot' | 'cold' | 'neutral'

export function flagOf(score: number | null): RatingFlag {
  if (score == null) return 'neutral'
  if (score >= HOT_AT) return 'hot'
  return score <= COLD_AT ? 'cold' : 'neutral'
}

/**
 * The tag a path wears.
 *
 * The design colours this cell by **path** — what the model says to do —
 * rather than by grade, and the two disagree: on DEV grade splits 15 A / 298
 * B / 187 C while path splits 15 PIVOT / 298 SETUP / 187 WATCH. Colouring by
 * grade made every A green and said nothing about whether the name is
 * actionable today.
 */
export function pathVariant(path: string | null): 'success' | 'info' | 'danger' | 'neutral' {
  switch ((path ?? '').toUpperCase()) {
    case 'PIVOT':
      return 'success'
    case 'SETUP':
      return 'info'
    case 'AVOID':
      return 'danger'
    default:
      return 'neutral'
  }
}

/**
 * The server's own weights, read off `factors_json` rather than guessed.
 *
 * Written as whole percentages because that is what a slider moves. They sum
 * to 100, and the page says so — a weight set that does not is a composite
 * nobody can compare against another.
 */
export const SERVER_WEIGHTS: RatingWeights = {
  trend: 35,
  growth: 30,
  momentum: 20,
  structure: 15,
}

/**
 * Presets. "Model" is the server's; the others are stated leanings, and the
 * page names them as leanings rather than as better answers.
 */
export const WEIGHT_PRESETS: { id: string; label: string; note: string; weights: RatingWeights }[] = [
  {
    id: 'model',
    label: 'Model',
    note: 'the weights the server scored with — the page opens agreeing with it',
    weights: SERVER_WEIGHTS,
  },
  {
    id: 'trend',
    label: 'Trend-led',
    note: 'price structure over the statements; a momentum reading of the same four',
    weights: { trend: 50, growth: 10, momentum: 30, structure: 10 },
  },
  {
    id: 'quality',
    label: 'Quality-led',
    note: 'the statements over the tape; slower, and it disagrees with the model on purpose',
    weights: { trend: 20, growth: 50, momentum: 10, structure: 20 },
  },
  {
    id: 'even',
    label: 'Even',
    note: 'no opinion — four equal quarters, useful only as a baseline to compare against',
    weights: { trend: 25, growth: 25, momentum: 25, structure: 25 },
  },
]

export interface RatingRow {
  symbol: string
  /** Each lens, 0–100, or null where the row carries no score for it. */
  scores: Record<RatingLensKey, number | null>
  /** The server's own composite, for comparison with yours. */
  serverScore: number | null
  grade: string | null
  path: string | null
  stage: string | null
  close: number | null
  /** Where the close sits between the 52-week low and high, 0–1. */
  rangePos: number | null
  /**
   * The two scores the row also reports as a count of checks passed —
   * `trend` out of {@link TREND_CHECKS}, `growth` out of {@link GROWTH_CHECKS}.
   */
  passes: { trend: number | null; growth: number | null }
}

/** A row from `/research/sepa/model/daily`, as the page reads it. */
export interface RawRatingRow {
  symbol?: string | null
  trend_template_score?: number | null
  fundamental_score?: number | null
  momentum_score?: number | null
  structure_score?: number | null
  sepa_score?: number | null
  grade?: string | null
  path?: string | null
  stage?: string | null
  latest_close?: number | null
  high_52w?: number | null
  low_52w?: number | null
  tech_pass_count?: number | null
  fund_pass_count?: number | null
}

export function toRatingRow(raw: RawRatingRow): RatingRow | null {
  const symbol = (raw.symbol ?? '').trim().toUpperCase()
  if (!symbol) return null
  const close = finiteOrNull(raw.latest_close)
  const hi = finiteOrNull(raw.high_52w)
  const lo = finiteOrNull(raw.low_52w)
  return {
    symbol,
    scores: {
      trend: finiteOrNull(raw.trend_template_score),
      growth: finiteOrNull(raw.fundamental_score),
      momentum: finiteOrNull(raw.momentum_score),
      structure: finiteOrNull(raw.structure_score),
    },
    serverScore: finiteOrNull(raw.sepa_score),
    grade: raw.grade ?? null,
    path: raw.path ?? null,
    stage: raw.stage ?? null,
    close,
    passes: {
      trend: finiteOrNull(raw.tech_pass_count),
      growth: finiteOrNull(raw.fund_pass_count),
    },
    // Price against its own year, which is the one range this row carries.
    rangePos:
      close != null && hi != null && lo != null && hi > lo
        ? Math.max(0, Math.min(1, (close - lo) / (hi - lo)))
        : null,
  }
}

/**
 * The composite at your weights.
 *
 * A lens the row has no score for is **left out of both halves** rather than
 * counted as zero: a name with no fundamental reading is not a name with bad
 * fundamentals, and scoring it as such would rank it below companies that
 * genuinely earn nothing. The divisor is the weight actually applied, so a
 * row scored on three lenses is still on the same 0–100 scale as one scored
 * on four.
 *
 * `missing` counts only lenses **you gave weight to and the row could not
 * supply** — the reading the page marks with an asterisk. A lens you set to
 * zero is not missing; you turned it off. The first version conflated the
 * two, and dropping one weight to zero put an asterisk on all five hundred
 * rows, which said nothing about any of them. Found by moving the slider.
 */
export function composite(
  row: RatingRow,
  weights: RatingWeights,
): { score: number | null; scoredOn: number; missing: number } {
  let sum = 0
  let applied = 0
  let scoredOn = 0
  let missing = 0
  for (const lens of RATING_LENSES) {
    const w = weights[lens.key]
    if (w <= 0) continue
    const v = row.scores[lens.key]
    if (v == null) {
      missing += 1
      continue
    }
    sum += v * w
    applied += w
    scoredOn += 1
  }
  return { score: applied > 0 ? sum / applied : null, scoredOn, missing }
}

/**
 * How a lens is spread across the ranked set — the design's Tape panel.
 *
 * Three buckets on the lens's own 0–100 scale. The thresholds are the page's
 * and are named on it: under 40 is weak, over 70 is strong, and the middle is
 * where most names sit and nothing is being said.
 */
export function lensSpread(
  rows: readonly RatingRow[],
  lens: RatingLensKey,
): { hot: number; mid: number; cold: number; scored: number } {
  let hot = 0
  let mid = 0
  let cold = 0
  let scored = 0
  for (const r of rows) {
    const v = r.scores[lens]
    if (v == null) continue
    scored += 1
    if (v >= 70) hot += 1
    else if (v < 40) cold += 1
    else mid += 1
  }
  return { hot, mid, cold, scored }
}

/**
 * The Tape panel's verdict on the working set.
 *
 * The design writes three: constructive, weak, mixed, each a sentence about
 * breadth rather than about any one name. The thresholds are the design's —
 * a quarter of the set, floor of three — and the sentence names the counts it
 * read them from, so a reader can disagree with the verdict without having to
 * guess what it saw.
 */
export function ratingsTape(
  hot: number,
  cold: number,
  total: number,
): { label: string; sentence: string } {
  const quarter = Math.max(3, Math.floor(total * 0.25))
  if (total === 0) {
    return {
      label: 'Nothing scored',
      sentence: 'No name in this universe carries a score today.',
    }
  }
  if (hot >= quarter) {
    return {
      label: 'Constructive tape',
      sentence: `${hot} of ${total} clear ${HOT_AT} at these weights. Breadth is there; work down the list.`,
    }
  }
  if (cold >= quarter) {
    return {
      label: 'Weak tape',
      sentence: `${cold} of ${total} sit at or under ${COLD_AT}. Sit on hands or hedge — the breadth is against you.`,
    }
  }
  return {
    label: 'Mixed tape',
    sentence: `${hot} strong · ${cold} weak of ${total}. Nothing systemic; work the top of the list name by name.`,
  }
}

export interface CompositePart {
  key: RatingLensKey
  label: string
  /** The lens score, 0–100, or null where the row has none. */
  value: number | null
  /** The weight you gave it. */
  weight: number
  /** What it contributed to the composite, in composite points. */
  points: number | null
}

/**
 * The composite, taken apart.
 *
 * This is the page's own sentence made checkable: *a ranked list whose
 * ranking you cannot interrogate is a number to take on faith*. Each lens
 * contributes `score × weight / Σ(weights actually applied)`, and the parts
 * sum to the composite — including when a lens is missing, because the
 * divisor is the applied weight rather than the weight you set.
 *
 * A lens weighted zero is listed with no points rather than hidden: you
 * turned it off, and the panel should show that you did.
 *
 * The parts sum to the composite exactly; what the panel prints does not
 * always, because each part is rounded on its own. The panel says so.
 */
export function compositeParts(row: RatingRow, weights: RatingWeights): CompositePart[] {
  let applied = 0
  for (const lens of RATING_LENSES) {
    if (weights[lens.key] > 0 && row.scores[lens.key] != null) applied += weights[lens.key]
  }
  return RATING_LENSES.map((lens) => {
    const value = row.scores[lens.key]
    const weight = weights[lens.key]
    return {
      key: lens.key,
      label: lens.label,
      value,
      weight,
      points: value == null || weight <= 0 || applied <= 0 ? null : (value * weight) / applied,
    }
  })
}
