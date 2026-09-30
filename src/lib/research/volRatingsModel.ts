/**
 * The vol model's daily opinion, and the weights behind it.
 *
 * Design `Research Scan.dc.html`: *"Five lenses, one composite; the weights
 * are the model and they are yours to move."* The same sentence the Stocks
 * ratings page leads with, over the option side's five lenses — and the same
 * consequence: a ranked list you cannot re-weight is a number to take on
 * faith.
 *
 * ## The composite, and why it is computed here
 *
 * `/research/scan` returns a stored `composite_score` per row and the weights
 * it used, but it takes only a **preset** — there is no per-weight parameter,
 * so a slider cannot ask the server for its answer. The composite is therefore
 * recomputed on this side, from the same row fields the engine reads:
 *
 * | lens    | score                                    | 0–100 because |
 * |---------|------------------------------------------|---------------|
 * | IV rank | `iv_rank_1y`                             | already a 1-year percentile |
 * | VRP     | `vrp_pct_252d`                           | already a 252-session percentile |
 * | Slope   | `50 + clamp(atm_slope_30d × 200, ±50)`   | the engine's own normaliser |
 * | Pin     | `50 + clamp(pin_pct_distance × 200, ±50)`| the same normaliser |
 * | Terrain | `pin_score`                              | the terrain model's own score |
 *
 * **Checked, not assumed.** Recomputing all 500 DEV rows at the server's
 * neutral weights reproduced its `composite_score` exactly — max difference
 * 0.0 across 500 rows — and again at the momentum preset across the 472 rows
 * both windows share (2026-09-21, `as_of` 2026-09-18). So the page opens
 * agreeing with the server, and every move away from that is a question the
 * reader asked rather than a second model quietly disagreeing.
 *
 * Two traps in the field names, both measured rather than guessed:
 *
 * - **`pin_score` is not the pin lens.** It comes from
 *   `features.stock_forecast_terrain_daily` alongside `regime`, and the engine
 *   feeds it to the *terrain* component; the pin lens is
 *   `pin_pct_distance`, from the OpEx pin table. Two names, one word.
 * - **terrain always counts.** The engine appends the terrain component even
 *   when `pin_score` is null, defaulting it to 50, so its weight is always in
 *   the divisor. A lens the row genuinely lacks — IV rank on 38 of 500 names —
 *   is left out of *both* halves instead, so a thinly-covered name is not
 *   pushed down for being thin.
 *
 * ## What the design draws and the data does not carry
 *
 * - an **Earn** column. No forward earnings date reaches this side:
 *   `/research/events/calendar` answers `count 0`, and the gap behind it is a
 *   vendor subscription. The design also vetoes a rule when a print is inside
 *   ten days, which is the same absence twice.
 * - the per-lens **252-session band** behind each bar. The row reports today's
 *   reading and none of the lens's history, so the bar can only say where the
 *   score sits on its own scale.
 * - a saved **Screen** to narrow the universe first — nothing on this side
 *   saves a screen yet, the same gap the Stock screen page names.
 */

import { finiteOrNull } from '@/utils/finite'
import type { ScanRow } from '@/api/research/scan'

/** The five the model combines, in the design's reading order. */
export const VOL_LENSES = [
  { key: 'iv_rank', label: 'IV rank' },
  { key: 'vrp', label: 'VRP' },
  { key: 'atm_slope', label: 'Slope' },
  { key: 'pin', label: 'Pin' },
  { key: 'terrain', label: 'Terrain' },
] as const

export type VolLensKey = (typeof VOL_LENSES)[number]['key']
export type VolWeights = Record<string, number>

/** Where the design cuts the composite: hot at 70, cold at 35. */
export const HOT_AT = 70
export const COLD_AT = 35

export type VolFlag = 'hot' | 'cold' | 'neutral'

export function flagOf(score: number | null): VolFlag {
  if (score == null) return 'neutral'
  if (score >= HOT_AT) return 'hot'
  return score <= COLD_AT ? 'cold' : 'neutral'
}

/**
 * The engine's normaliser, transcribed.
 *
 * `bifrost_research.engines.scan.build.normalize_atm_slope_score` and
 * `normalize_pin_score` are the same line: a slope of ±0.25 or wider saturates
 * the scale, which is why 30-day slopes above a quarter all score 100.
 */
export function normalizeSigned(v: number | null): number | null {
  if (v == null) return null
  return 50 + Math.max(-50, Math.min(50, v * 200))
}

/** The server's preset, from `COMPOSITE_PRESETS['neutral']`. */
export const SERVER_WEIGHTS: VolWeights = {
  iv_rank: 25,
  vrp: 25,
  atm_slope: 15,
  pin: 15,
  terrain: 20,
}

/** The other two the route serves. `adaptive_30d` is fetched, not written. */
export const SERVER_PRESETS: { id: string; label: string; note: string; weights: VolWeights }[] = [
  {
    id: 'neutral',
    label: 'Neutral',
    note: 'the weights the server scored with — the page opens agreeing with it',
    weights: SERVER_WEIGHTS,
  },
  {
    id: 'momentum',
    label: 'Mom',
    note: 'term structure and terrain over the percentiles — a trend reading of the same five',
    weights: { iv_rank: 15, vrp: 15, atm_slope: 30, pin: 10, terrain: 30 },
  },
  {
    id: 'mean_revert',
    label: 'MR',
    note: 'rich IV and a fat risk premium first; it disagrees with momentum on purpose',
    weights: { iv_rank: 35, vrp: 30, atm_slope: 10, pin: 15, terrain: 10 },
  },
]

export const ADAPTIVE_NOTE =
  'adaptive — fitted to the last 30 days of lens hit rates, so these are the server’s numbers rather than a leaning'

export interface VolRow {
  symbol: string
  tradeDate: string
  close: number | null
  /** Each lens on its own 0–100 scale, or null where the row has no reading. */
  scores: Record<VolLensKey, number | null>
  /** What the cell prints: the reading in its own units. */
  raw: {
    ivRank: number | null
    vrp: number | null
    slope: number | null
    pinPct: number | null
  }
  regime: string | null
  /** The engine's own hot / cold / neutral call per lens. */
  flags: Record<string, VolFlag>
  /** The server's composite at its own weights, for comparison with yours. */
  serverScore: number | null
  dteToOpex: number | null
}

export function toVolRow(raw: ScanRow): VolRow | null {
  const symbol = (raw.symbol ?? '').trim().toUpperCase()
  if (!symbol) return null
  const ivRank = finiteOrNull(raw.iv_rank_1y)
  const vrp = finiteOrNull(raw.vrp_pct_252d)
  const slope = finiteOrNull(raw.atm_slope_30d)
  const pinPct = finiteOrNull(raw.pin_pct_distance)
  const flags: Record<string, VolFlag> = {}
  for (const [lens, value] of Object.entries(raw.lens_flags ?? {})) {
    if (value === 'hot' || value === 'cold' || value === 'neutral') flags[lens] = value
  }
  return {
    symbol,
    tradeDate: raw.trade_date,
    close: finiteOrNull(raw.close),
    scores: {
      iv_rank: ivRank,
      vrp,
      atm_slope: normalizeSigned(slope),
      pin: normalizeSigned(pinPct),
      // The terrain model's score, defaulted the way the engine defaults it.
      terrain: finiteOrNull(raw.pin_score),
    },
    raw: { ivRank, vrp, slope, pinPct },
    regime: raw.terrain_regime ?? null,
    flags,
    serverScore: finiteOrNull(raw.composite_score),
    dteToOpex: finiteOrNull(raw.dte_to_opex),
  }
}

/**
 * The composite at your weights — the engine's arithmetic, on this side.
 *
 * `missing` counts lenses you gave weight to and the row could not supply:
 * the reading the page marks with an asterisk. Terrain is never missing,
 * because the engine substitutes 50 for a null `pin_score` and this has to
 * agree with it to reconcile.
 */
export function composite(
  row: VolRow,
  weights: VolWeights,
): { score: number | null; scoredOn: number; missing: number } {
  let sum = 0
  let applied = 0
  let scoredOn = 0
  let missing = 0
  for (const lens of VOL_LENSES) {
    const w = weights[lens.key] ?? 0
    const isTerrain = lens.key === 'terrain'
    const v = row.scores[lens.key] ?? (isTerrain ? 50 : null)
    if (v == null) {
      if (w > 0) missing += 1
      continue
    }
    if (w <= 0 && !isTerrain) continue
    sum += v * w
    applied += w
    if (w > 0) scoredOn += 1
  }
  return { score: applied > 0 ? sum / applied : null, scoredOn, missing }
}

export interface VolPart {
  key: VolLensKey
  label: string
  /** The lens score, 0–100. */
  value: number | null
  /** The reading in its own units, as the table prints it. */
  reading: string
  weight: number
  /** What it contributed to the composite, in composite points. */
  points: number | null
}

/** The composite, taken apart — score × weight over the weight applied. */
export function compositeParts(row: VolRow, weights: VolWeights): VolPart[] {
  let applied = 0
  for (const lens of VOL_LENSES) {
    const w = weights[lens.key] ?? 0
    const v = row.scores[lens.key] ?? (lens.key === 'terrain' ? 50 : null)
    if (v != null && (w > 0 || lens.key === 'terrain')) applied += w
  }
  return VOL_LENSES.map((lens) => {
    const weight = weights[lens.key] ?? 0
    const value = row.scores[lens.key] ?? (lens.key === 'terrain' ? 50 : null)
    return {
      key: lens.key,
      label: lens.label,
      value,
      reading: lensReading(row, lens.key),
      weight,
      points: value == null || weight <= 0 || applied <= 0 ? null : (value * weight) / applied,
    }
  })
}

/**
 * What a lens cell prints — the reading in its own units, not its score.
 *
 * Two of the five are percentiles and print as such; the slope is a raw
 * 30-day figure to three places, the pin is a distance in percent of spot,
 * and terrain is the regime's own word. Printing five normalised scores would
 * have made the row unreadable against the Labs pages, which all quote the
 * raw figures.
 */
export function lensReading(row: VolRow, lens: VolLensKey): string {
  switch (lens) {
    case 'iv_rank':
      return row.raw.ivRank == null ? '—' : row.raw.ivRank.toFixed(0)
    case 'vrp':
      return row.raw.vrp == null ? '—' : row.raw.vrp.toFixed(0)
    case 'atm_slope':
      return row.raw.slope == null ? '—' : row.raw.slope.toFixed(3)
    case 'pin':
      return row.raw.pinPct == null ? '—' : `${(row.raw.pinPct * 100).toFixed(1)}%`
    case 'terrain':
      return row.regime ?? '—'
  }
}

/** The tag a regime wears. The engine's own words, lower-case as it sends them. */
export function regimeVariant(
  regime: string | null,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch ((regime ?? '').toLowerCase()) {
    case 'range':
      return 'success'
    case 'trending':
      return 'warning'
    case 'crash-risk':
      return 'danger'
    default:
      return 'neutral'
  }
}

/**
 * How a lens is spread across the working set — the design's Tape panel.
 *
 * Unlike the Stocks page, this one does not have to cut its own thresholds:
 * the engine publishes `lens_flags` per row, its own hot / cold / neutral call
 * per lens, and that is a better answer than a number this page invented. A
 * lens with no flag on a row is not counted either way.
 */
export function lensSpread(
  rows: readonly VolRow[],
  lens: VolLensKey,
): { hot: number; mid: number; cold: number; scored: number } {
  let hot = 0
  let mid = 0
  let cold = 0
  for (const r of rows) {
    const f = r.flags[lens]
    if (f === 'hot') hot += 1
    else if (f === 'cold') cold += 1
    else if (f === 'neutral') mid += 1
  }
  return { hot, mid, cold, scored: hot + mid + cold }
}

/**
 * The Tape panel's verdict on the working set.
 *
 * The design's three, and its thresholds — a quarter of the set, floor of
 * three. Its rich-tape sentence goes on to say *"check earnings dates before
 * sizing — K of the hot names print inside 10 days"*; no earnings date reaches
 * this side, so the sentence names the absence instead of dropping the
 * warning.
 */
export function volTape(
  hot: number,
  cold: number,
  total: number,
): { label: string; sentence: string } {
  const quarter = Math.max(3, Math.floor(total * 0.25))
  if (total === 0) {
    return {
      label: 'Nothing scored',
      sentence: 'No name in this universe carries a composite today.',
    }
  }
  if (hot >= quarter) {
    return {
      label: 'Rich tape',
      sentence: `${hot} of ${total} clear ${HOT_AT} at these weights. Premium is there to sell — check the print date before sizing, which this page cannot do for you: no earnings calendar reaches it.`,
    }
  }
  if (cold >= quarter) {
    return {
      label: 'Cheap tape',
      sentence: `${cold} of ${total} sit at or under ${COLD_AT}. Selling is thin; confirm with VRP before buying vol.`,
    }
  }
  return {
    label: 'Mixed tape',
    sentence: `${hot} rich · ${cold} cheap of ${total}. Nothing systemic; work the top of the list name by name.`,
  }
}

/**
 * Which active opportunity is registered on a name — the design's Rule column.
 *
 * The design fits each row to a playbook rule ("O1 AMD IV-rich CSP") and vetoes
 * it inside ten days of a print. Two halves, and only one of them reaches this
 * side: `strategy_opportunity` rows carry a symbol list, so the column can say
 * *an active opportunity is registered on this name* — measured 2026-09-21, 7
 * active opportunities covering 15 symbols, 14 of which are in the scan's 500.
 * What it cannot say is that a rule's entry conditions are *met*: nothing
 * evaluates those per name, and the earnings veto has no date to read.
 *
 * The id travels with the name so the cell can open that opportunity's own
 * chain on `/trade/rules?pick=opportunity:<id>` — where the seven Strategy
 * pages went — rather than dropping the reader at a list to find it again.
 */
export interface VolRule {
  id: number
  name: string
}

export function ruleIndex(
  opportunities: readonly {
    strategy_opportunity_id: number
    name: string
    symbols: string[]
    is_active: boolean
  }[],
): Map<string, VolRule[]> {
  const index = new Map<string, VolRule[]>()
  for (const opp of opportunities) {
    if (!opp.is_active) continue
    const rule: VolRule = { id: opp.strategy_opportunity_id, name: opp.name }
    for (const raw of opp.symbols ?? []) {
      const sym = (raw ?? '').trim().toUpperCase()
      if (!sym) continue
      const list = index.get(sym)
      if (list) list.push(rule)
      else index.set(sym, [rule])
    }
  }
  return index
}
