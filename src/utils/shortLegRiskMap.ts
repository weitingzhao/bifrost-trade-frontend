/**
 * Every short leg as one point: how long is left against how much room is left.
 *
 * The expiry ladder answers "which week is dangerous" one row per date, and the
 * instance table answers "which trade is tight" one row per strategy. Neither
 * shows the shape of the book — whether the tight legs are the near ones, which
 * is the combination that gets assigned. Two axes, DTE and cushion, put every
 * short leg on the same picture so that corner can be seen at a glance.
 *
 * Two rules, both inherited from the ladder:
 *
 *  - Cushion is computed by the same call, from the same spot, as
 *    `buildExpiryLadder`. A leg the ladder calls unpriced is unpriced here; a
 *    leg it calls in the money is below zero here. The map cannot disagree with
 *    the table beneath it.
 *  - Unknown is not safe. A leg with no quote has no y, so it does not go in the
 *    priced area at any y and it does not get a colour that means "fine". It
 *    goes in its own gutter, hollow and grey, and is counted at the top. A leg
 *    whose expiry cannot be parsed has no x and gets the same treatment on the
 *    other side, because a date that will not parse must not manufacture a DTE.
 *    The layout applies the same reading to a NaN: a number that is not a
 *    number is not a cushion, whoever handed it in.
 */
import { daysUntilExpiry } from './positions'
import {
  cushionBand,
  normalizeRight,
  shortLegCushion,
  type CushionBand,
  type LadderLeg,
} from './positionsOptionRisk'
import type { Spot, SpotSource } from './spotPrice'

export interface RiskMapLeg {
  key: string
  instanceKey: string
  symbol: string
  right: 'C' | 'P'
  strike: number
  expiry: string
  dte: number | null
  contracts: number
  cushionPct: number | null
  /** How the spot behind cushionPct was priced; null or absent when there was none. */
  spotSource?: SpotSource | null
  /** When that spot was priced (unix seconds); the caption dates a close by it. */
  spotAsOf?: number | null
  /** The contract and the account, so a selection can narrow the grid to exactly this leg. */
  contractKey?: string
  accountId?: string
}

/** A number that can be placed. null, undefined and NaN all mean "unknown". */
function isPlaceable(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/**
 * The side of a contract key — `SYM|OPT|YYYYMMDD|STRIKE|RIGHT`, right last.
 * Consulted only when the row's own `right` will not parse, so a leg whose
 * side survived in the key is not thrown away for a corrupt column.
 */
function rightFromContractKey(contractKey: string): 'C' | 'P' | null {
  const parts = contractKey.split('|')
  if (parts.length < 5 || parts[1]?.toUpperCase() !== 'OPT') return null
  return normalizeRight(parts[parts.length - 1])
}

/**
 * Short legs only, priced the way the ladder prices them.
 *
 * Legs whose side is recognisable from neither `right` nor the contract key are
 * dropped: the leg type requires a side, and there is nothing honest to put in
 * it. The ladder counts such a row as unpriced, so on that one kind of corrupt
 * row the map's unpriced count can read one lower than the ladder's. The util
 * test pins that gap so it cannot widen unnoticed.
 */
export function buildRiskMapLegs(input: {
  legs: readonly (LadderLeg & { instanceKey: string; contractKey: string; accountId?: string })[]
  /** A bare number is taken as live — the ladder's contract; a Spot carries its source. */
  spotOf: (leg: LadderLeg) => Spot | number | null
}): RiskMapLeg[] {
  const out: RiskMapLeg[] = []
  const seen = new Map<string, number>()
  for (const leg of input.legs) {
    if (!(leg.qty < 0)) continue
    const right = normalizeRight(leg.right) ?? rightFromContractKey(leg.contractKey)
    if (right == null) continue
    const resolved = input.spotOf(leg)
    const spot =
      resolved == null ? null : typeof resolved === 'number' ? { price: resolved, source: 'live' as const, asOf: null } : resolved
    // Same expression as buildExpiryLadder, so the two never diverge on a leg.
    const cushionPct = spot == null ? null : shortLegCushion(leg.right, leg.strike, spot.price)
    // One instance can hold the same contract across two accounts; the key
    // still has to be unique so React and the click handler can tell them apart.
    const base = `${leg.instanceKey}|${leg.contractKey}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.push({
      key: n === 0 ? base : `${base}#${n}`,
      instanceKey: leg.instanceKey,
      contractKey: leg.contractKey,
      accountId: leg.accountId,
      symbol: leg.underlying,
      right,
      strike: leg.strike,
      expiry: leg.expiry,
      dte: daysUntilExpiry(leg.expiry),
      contracts: Math.abs(leg.qty),
      cushionPct,
      spotSource: spot?.source ?? null,
      spotAsOf: spot && 'asOf' in spot ? (spot.asOf ?? null) : null,
    })
  }
  return out
}

// ── Layout ───────────────────────────────────────────────────────────────────

/** Cushion range drawn. Below −10% is deep ITM, above +40% is not a risk question. */
export const CUSHION_MIN = -0.1
export const CUSHION_MAX = 0.4

/** The two background bands: the week's work, and the roll window. */
export const NEAR_DTE = 7
export const MONTH_DTE = 35

/** The strip's own margins, in SVG user units. */
export const RIGHT_GUTTER_W = 48
const PLOT_PAD_X = 8
/** Room on the left for the cushion scale: "+40%" in 9px mono, plus a tick. */
export const Y_AXIS_W = 34
/** Where the scale is labelled. Zero and the tight line are drawn separately. */
export const Y_TICK_PCTS = [-0.1, 0, 0.1, 0.2, 0.3, 0.4] as const
/**
 * Inset of the cushion scale from the plot's top and bottom edges. The bottom
 * edge is the x-axis, and a deep-ITM leg pinned exactly onto it would sit
 * under the axis line and tick marks — the worst legs must not be the hardest
 * to see.
 */
export const PLOT_PAD_Y = 5
const PLOT_TOP = 6
const AXIS_H = 14
/** Two labelled ticks closer than this would overprint; the second keeps only its mark. */
const TICK_LABEL_MIN_GAP = 34
/** Gutter stacks step this far apart until the column is full. */
const GUTTER_STEP = 10
const GUTTER_COL_STEP = 14
const GUTTER_MAX_ROWS = 6
const GUTTER_MAX_COLS = 3

export type RiskMapClamp = 'low' | 'high' | null

export interface RiskMapPoint {
  leg: RiskMapLeg
  x: number
  y: number
  r: number
  band: CushionBand
  /** Set when the true cushion sits outside the drawn range and y was pinned to the edge. */
  clamped: RiskMapClamp
}

export interface RiskMapGutterPoint {
  leg: RiskMapLeg
  x: number
  y: number
  r: number
  /** Null in the unpriced gutter — there is no cushion to band. */
  band: CushionBand | null
  /** As on a priced point; always null in the unpriced gutter, which has no y scale. */
  clamped: RiskMapClamp
}

export interface RiskMapTick {
  /** Real days to expiry — negative once past, though x is pinned at day 0. */
  dte: number
  x: number
  expiry?: string
}

/** A point's name, placed beside it and nudged clear of its neighbours. */
export interface RiskMapLabel {
  key: string
  x: number
  y: number
  text: string
  anchor: 'start' | 'end'
}

export interface RiskMapBands {
  /** Priced area, excluding the no-expiry gutter. */
  plot: { x0: number; x1: number; y0: number; y1: number }
  /** DTE ≤ NEAR_DTE. */
  near: { x0: number; x1: number }
  /** DTE ≤ MONTH_DTE. */
  month: { x0: number; x1: number }
  /** Cushion < 0 — the strike is breached. */
  itm: { y0: number; y1: number }
  zeroY: number
  /** Null when no priced leg lacks an expiry; the plot then runs to the right edge. */
  rightGutter: { x0: number; x1: number } | null
}

export interface RiskMapYTick {
  pct: number
  y: number
}

export interface RiskMapLayout {
  points: RiskMapPoint[]
  /** The cushion scale: one tick per 10% across the drawn range. */
  yTicks: RiskMapYTick[]
  /** Every point's name, laid out once so labels never cover each other. */
  labels: RiskMapLabel[]
  /** Legs with no spot, nearest expiry first — listed under the plot, never placed in it. */
  unpriced: RiskMapLeg[]
  noExpiry: RiskMapGutterPoint[]
  ticks: RiskMapTick[]
  tightY: number
  bands: RiskMapBands
}

/**
 * Size is the third thing a short leg has to say, and the count alone does not
 * say it: one MU 1200 call delivers $120,000 and ten HIMS 40 calls deliver
 * $40,000, so drawing the ten-lot four times larger would rank the book by the
 * wrong number. Size is what assignment would move — strike × 100 × contracts,
 * the same arithmetic the put-cash figure on the cockpit uses — and the dot's
 * *area* carries it, which is what the eye compares. The largest leg in view
 * fills the scale, so the picture always uses its whole range; a floor keeps
 * the smallest leg a dot rather than a speck, and clickable.
 */
export const POINT_R_MIN = 4
export const POINT_R_MAX = 12
const SHARES_PER_CONTRACT = 100

/** What assignment would move: strike × 100 × contracts. Null when the strike will not parse. */
export function legNotional(leg: Pick<RiskMapLeg, 'strike' | 'contracts'>): number | null {
  const k = leg.strike
  const c = leg.contracts
  if (!isPlaceable(k) || k <= 0 || !isPlaceable(c) || c <= 0) return null
  return k * SHARES_PER_CONTRACT * c
}

/** The book's largest assignment value, the scale every dot is drawn against. */
export function maxNotionalOf(legs: readonly RiskMapLeg[]): number {
  return legs.reduce((n, l) => Math.max(n, legNotional(l) ?? 0), 0)
}

export function pointRadius(notional: number | null, maxNotional: number): number {
  if (notional == null || !isPlaceable(notional) || notional <= 0 || !isPlaceable(maxNotional) || maxNotional <= 0) {
    return POINT_R_MIN
  }
  // Area ∝ notional, so radius goes with its square root; the biggest fills the scale.
  return Math.min(POINT_R_MAX, Math.max(POINT_R_MIN, POINT_R_MAX * Math.sqrt(Math.min(1, notional / maxNotional))))
}

function clampOf(cushion: number): RiskMapClamp {
  return cushion < CUSHION_MIN ? 'low' : cushion > CUSHION_MAX ? 'high' : null
}

function byDteThenSymbol(a: RiskMapLeg, b: RiskMapLeg): number {
  const da = isPlaceable(a.dte) ? a.dte : Number.MAX_SAFE_INTEGER
  const db = isPlaceable(b.dte) ? b.dte : Number.MAX_SAFE_INTEGER
  if (da !== db) return da - db
  return a.symbol.localeCompare(b.symbol) || a.strike - b.strike
}

/**
 * Stack points in a gutter: one column of up to six, then a second and a third
 * beside it, compressing the row step once the gutter is full rather than
 * spilling past its edge.
 */
function stackInGutter(
  legs: readonly RiskMapLeg[],
  cx: number,
  y0: number,
  y1: number,
  place: (leg: RiskMapLeg, stackedY: number) => Pick<RiskMapGutterPoint, 'y' | 'band' | 'clamped'>,
  maxNotional: number,
): RiskMapGutterPoint[] {
  const n = legs.length
  const cols = Math.min(GUTTER_MAX_COLS, Math.max(1, Math.ceil(n / GUTTER_MAX_ROWS)))
  const rows = Math.ceil(n / cols)
  const step = rows <= 1 ? 0 : Math.min(GUTTER_STEP, (y1 - y0) / rows)
  const x0 = cx - ((cols - 1) * GUTTER_COL_STEP) / 2
  return legs.map((leg, i) => {
    const col = Math.floor(i / rows)
    const row = i % rows
    return {
      leg,
      x: x0 + col * GUTTER_COL_STEP,
      r: pointRadius(legNotional(leg), maxNotional),
      ...place(leg, y0 + row * step),
    }
  })
}

/**
 * Pure geometry for the strip. Everything the component draws comes from
 * here, so the placement rules can be tested without a DOM.
 */
export function layoutRiskMap(
  legs: RiskMapLeg[],
  opts: { width: number; height: number; tightPct: number; maxDte?: number },
): RiskMapLayout {
  const { width, height, tightPct } = opts
  // One scale for the whole picture, gutters included: a leg does not change
  // size because it lost its quote.
  const maxNotional = maxNotionalOf(legs)

  const priced: RiskMapLeg[] = []
  const unpricedLegs: RiskMapLeg[] = []
  const noExpiryLegs: RiskMapLeg[] = []
  for (const leg of legs) {
    // Unknown price outranks unknown date: the leg that cannot be judged goes
    // where nothing about it can read as safe.
    if (!isPlaceable(leg.cushionPct)) unpricedLegs.push(leg)
    else if (!isPlaceable(leg.dte)) noExpiryLegs.push(leg)
    else priced.push(leg)
  }
  unpricedLegs.sort(byDteThenSymbol)
  noExpiryLegs.sort(byDteThenSymbol)
  priced.sort(byDteThenSymbol)

  const rightGutter =
    noExpiryLegs.length > 0 ? { x0: width - RIGHT_GUTTER_W, x1: width } : null
  const plot = {
    x0: Y_AXIS_W + PLOT_PAD_X,
    x1: (rightGutter ? rightGutter.x0 : width) - PLOT_PAD_X,
    y0: PLOT_TOP,
    y1: height - AXIS_H,
  }

  // Past-expiry legs sit at day 0: the domain runs forward from today, and a
  // contract still open after its date is the same emergency as one expiring now.
  // The time axis is the book's, priced or not: with every leg unpriced (a
  // weekend, a feed outage) the domain used to collapse to one day and the
  // "≤7d" band filled the whole plot for a book expiring 41–132 days out.
  let observedMax = 0
  for (const leg of legs) if (isPlaceable(leg.dte)) observedMax = Math.max(observedMax, leg.dte as number)
  const maxDte = Math.max(1, isPlaceable(opts.maxDte) ? opts.maxDte : observedMax)

  const xOf = (dte: number): number => {
    const t = Math.min(maxDte, Math.max(0, dte)) / maxDte
    return plot.x0 + t * (plot.x1 - plot.x0)
  }
  const yTop = plot.y0 + PLOT_PAD_Y
  const yBottom = plot.y1 - PLOT_PAD_Y
  const yOf = (cushion: number): number => {
    const c = Math.min(CUSHION_MAX, Math.max(CUSHION_MIN, cushion))
    const t = (c - CUSHION_MIN) / (CUSHION_MAX - CUSHION_MIN)
    return yBottom - t * (yBottom - yTop)
  }

  const points: RiskMapPoint[] = priced.map((leg) => {
    const c = leg.cushionPct as number
    return {
      leg,
      x: xOf(leg.dte as number),
      y: yOf(c),
      r: pointRadius(legNotional(leg), maxNotional),
      band: cushionBand(c, tightPct),
      clamped: clampOf(c),
    }
  })

  // One tick per distinct expiry, carrying its real DTE so a past date is not
  // relabelled as "today" — only its x is pinned to the start of the domain.
  // Unpriced legs still have a date, and the date is what the tick is for.
  const tickByExpiry = new Map<string, number>()
  for (const leg of legs) {
    if (!isPlaceable(leg.dte)) continue
    if (!tickByExpiry.has(leg.expiry)) tickByExpiry.set(leg.expiry, leg.dte as number)
  }
  const ticks: RiskMapTick[] = Array.from(tickByExpiry, ([expiry, dte]) => ({
    dte,
    x: xOf(dte),
    expiry,
  })).sort((a, b) => a.dte - b.dte || (a.expiry ?? '').localeCompare(b.expiry ?? ''))

  const gutterTop = yTop
  const gutterBottom = yBottom
  const unpriced = unpricedLegs
  const noExpiry = rightGutter
    ? stackInGutter(noExpiryLegs, (rightGutter.x0 + rightGutter.x1) / 2, gutterTop, gutterBottom, (leg) => {
        // These legs do have a cushion, so they keep their y, their colour and
        // their clamp ring — the gutter only takes away the x.
        const c = leg.cushionPct as number
        return { y: yOf(c), band: cushionBand(c, tightPct), clamped: clampOf(c) }
      }, maxNotional)
    : []

  const zeroY = yOf(0)
  const labels = labelPoints(points, plot)
  const yTicks: RiskMapYTick[] = Y_TICK_PCTS.map((pct) => ({ pct, y: yOf(pct) }))
  return {
    points,
    yTicks,
    labels,
    unpriced,
    noExpiry,
    ticks,
    tightY: yOf(tightPct),
    bands: {
      plot,
      near: { x0: plot.x0, x1: xOf(NEAR_DTE) },
      month: { x0: plot.x0, x1: xOf(MONTH_DTE) },
      itm: { y0: zeroY, y1: plot.y1 },
      zeroY,
      rightGutter,
    },
  }
}

/**
 * Which ticks get a text label. Ticks are already sorted by x; a label yields
 * to a neighbour already labelled when the two would overprint, except that the
 * active expiry always keeps its label — the user asked about that one.
 */
export function labelTicks(ticks: readonly RiskMapTick[], activeExpiry?: string | null): boolean[] {
  let lastLabeledX = Number.NEGATIVE_INFINITY
  return ticks.map((t) => {
    const active = activeExpiry != null && t.expiry === activeExpiry
    if (!active && t.x - lastLabeledX < TICK_LABEL_MIN_GAP) return false
    lastLabeledX = t.x
    return true
  })
}

// ── Labels ───────────────────────────────────────────────────────────────────

export function fmtCushionPct(v: number): string {
  const p = v * 100
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`
}

/** "3%" for 0.03, "2.5%" for 0.025 — the setting as the user typed it. */
export function fmtTightPct(v: number): string {
  return `${Number((v * 100).toFixed(2))}%`
}

/** $120.0k / $1.20M — the map's own short money, so a legend and a tooltip agree. */
export function fmtNotional(v: number | null): string {
  if (!isPlaceable(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${Math.round(v)}`
}

export function fmtDte(dte: number | null): string {
  if (!isPlaceable(dte)) return 'no expiry'
  if (dte < 0) return `${-dte}d past`
  return `${dte}d`
}

/** Axis form of `fmtDte`: fits under a tick, and a past date says so rather than reading "0d". */
export function fmtTickDte(dte: number): string {
  return dte < 0 ? 'past' : `${dte}d`
}

/** "SYM 20261120 C 250 · 3 contracts · $75.0k if assigned · cushion +12.4% · 76d" */
export function riskMapLegTitle(leg: RiskMapLeg): string {
  const contracts = `${leg.contracts} contract${leg.contracts === 1 ? '' : 's'}`
  const cushion = isPlaceable(leg.cushionPct)
    ? `cushion ${fmtCushionPct(leg.cushionPct)}`
    : 'cushion n/a (no quote)'
  const n = legNotional(leg)
  const size = n == null ? 'size n/a' : `${fmtNotional(n)} if assigned`
  return `${leg.symbol} ${leg.expiry} ${leg.right} ${leg.strike} · ${contracts} · ${size} · ${cushion} · ${fmtDte(leg.dte)}`
}

/** "NVDA 245C" — the name a point wears on the plot and a no-quote chip carries. */
export function riskMapLegShort(leg: RiskMapLeg): string {
  return `${leg.symbol} ${leg.strike}${leg.right}`
}

/**
 * "NVDA 245C ×5 +6.0%" — the plot label: the name, the size, and the height, so
 * the y axis and the dot's area both read in words at every point. The ×N is
 * dropped on a single contract, where it would be noise on every small leg.
 */
export function riskMapLegLabel(leg: RiskMapLeg): string {
  const size = leg.contracts > 1 ? ` ×${leg.contracts}` : ''
  const c = leg.cushionPct
  if (!isPlaceable(c)) return `${riskMapLegShort(leg)}${size}`
  return `${riskMapLegShort(leg)}${size} ${c >= 0 ? '+' : ''}${(c * 100).toFixed(1)}%`
}

/** Roughly how wide a label is in SVG units, for the 8.5px monospace it is drawn in. */
const LABEL_CHAR_W = 5.2
const LABEL_LINE_H = 9

/**
 * Place each point's name to its right (or its left, near the edge), then nudge
 * it down a line at a time while it would overprint a label already placed;
 * if that runs off the plot, nudge up instead. Two legs on one expiry — the
 * usual case, a call and a put, or two strikes — get two readable names.
 */
export function labelPoints(
  points: readonly RiskMapPoint[],
  plot: { x0: number; x1: number; y0: number; y1: number },
): RiskMapLabel[] {
  const placed: RiskMapLabel[] = []
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const spanOf = (l: RiskMapLabel) => {
    const w = l.text.length * LABEL_CHAR_W
    const left = l.anchor === 'start' ? l.x : l.x - w
    return { left, right: left + w }
  }
  for (const p of sorted) {
    const text = riskMapLegLabel(p.leg)
    const width = text.length * LABEL_CHAR_W
    const fitsRight = p.x + p.r + 3 + width <= plot.x1
    const fitsLeft = p.x - p.r - 3 - width >= plot.x0
    const sides: Array<'start' | 'end'> = fitsRight && fitsLeft ? ['start', 'end'] : fitsRight ? ['start'] : ['end']
    const collides = (anchor: 'start' | 'end', yy: number) => {
      const x = anchor === 'start' ? p.x + p.r + 3 : p.x - p.r - 3
      const mine = spanOf({ key: '', x, y: yy, text, anchor })
      return placed.some((l) => {
        const s = spanOf(l)
        return s.right > mine.left && s.left < mine.right && Math.abs(l.y - yy) < LABEL_LINE_H
      })
    }
    // Candidates in order of preference: beside the point on either side, then
    // a line down, then a line up, alternating sides — so a cluster on one
    // expiry fans its names out to both sides instead of stacking one column.
    const offsets = [0, LABEL_LINE_H, -LABEL_LINE_H, 2 * LABEL_LINE_H, -2 * LABEL_LINE_H, 3 * LABEL_LINE_H, -3 * LABEL_LINE_H]
    let chosen: { anchor: 'start' | 'end'; y: number } | null = null
    for (const dy of offsets) {
      const y = p.y + 3 + dy
      if (y < plot.y0 + LABEL_LINE_H || y > plot.y1 - 1) continue
      for (const anchor of sides) {
        if (!collides(anchor, y)) {
          chosen = { anchor, y }
          break
        }
      }
      if (chosen) break
    }
    const anchor = chosen?.anchor ?? sides[0]
    const y = chosen?.y ?? p.y + 3
    const x = anchor === 'start' ? p.x + p.r + 3 : p.x - p.r - 3
    placed.push({ key: p.leg.key, x, y, text, anchor })
  }
  return placed
}
