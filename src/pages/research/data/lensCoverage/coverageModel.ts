/**
 * Lens coverage as a matrix — lenses × tiers, which is the design's whole
 * change to this page.
 *
 * `Research Lens Coverage.dc.html` says why in its own footer: *"The old page
 * showed one bar per lens across the whole universe; this splits it by tier
 * because the Book being 100% and Extended being 40% are different
 * problems."* This side was the old page.
 *
 * The split costs nothing: `GET /research/screen/coverage` already takes a
 * `tiers` filter, so a column is the same call with one tier in it. Measured
 * on DEV 2026-09-22 — resident 22 · core 577 · edge 48 — and the split earns
 * itself immediately: **IV Rank reads 99% of core and 71% of edge**, which
 * one number over the whole universe (97%) hides completely.
 *
 * ## The blocker the old page could not name
 *
 * `every_face` is 0 in every tier, which reads as a coverage disaster. It is
 * one lens: `order_sentiment` returns 0 of 647, and the other nine screenable
 * lenses run 88–100%. No symbol can read all ten while one of them reads
 * nothing. A page that prints the zero without naming the cause sends the
 * reader hunting a systemic problem that is not there.
 */
import type { CoverageLens, LensCoverage } from '@/api/research/lensCoverage'

/** The design's own thresholds. Grey is not a failure — see `Blocked by`. */
export type CoverageLamp = 'green' | 'yellow' | 'red' | 'gray'

export function coverageLamp(lens: Pick<CoverageLens, 'read' | 'of' | 'unscreenable'>): CoverageLamp {
  if (lens.unscreenable) return 'gray'
  if (lens.read == null) return 'gray'
  if (lens.read === 0) return 'red'
  const share = lens.of > 0 ? lens.read / lens.of : 0
  return share >= 0.9 ? 'green' : share >= 0.25 ? 'yellow' : 'red'
}

export function coveragePct(lens: Pick<CoverageLens, 'read' | 'of' | 'unscreenable'>): string {
  if (lens.unscreenable || lens.read == null || lens.of === 0) return '—'
  return `${Math.round((lens.read / lens.of) * 100)}%`
}

export interface MatrixCell {
  tier: string
  read: number | null
  of: number
  text: string
  lamp: CoverageLamp
  title: string
}

export interface MatrixRow {
  lens: string
  label: string
  face: string
  cells: MatrixCell[]
  /** The engine's own reason this lens cannot be screened, when it cannot. */
  blocked: string | null
}

export interface MatrixFace {
  face: string
  label: string
  /** `3 of 4 lenses at 90%+` — the face read in one line. */
  summary: string
  rows: MatrixRow[]
}

/** The blueprint's faces (§3.2), in reading order. */
export const FACE_LABEL: Record<string, string> = {
  trend: 'Trend & structure',
  volatility: 'Volatility',
  positioning: 'Positioning',
  forecast: 'Forecast',
  validation: 'Validation',
}
const FACE_ORDER = ['trend', 'volatility', 'positioning', 'forecast', 'validation']

export interface TierColumn {
  tier: string
  label: string
  universe: number
}

/** `{ tier → its own coverage response }`, plus the all-tier one. */
export type ByTier = Record<string, LensCoverage | undefined>

export function tierColumns(all: LensCoverage | undefined, byTier: ByTier): TierColumn[] {
  const tiers = all?.tiers ?? []
  return [
    ...tiers.map((t) => ({ tier: t, label: t, universe: byTier[t]?.universe ?? 0 })),
    { tier: '*', label: 'all', universe: all?.universe ?? 0 },
  ]
}

function faceSummary(rows: readonly MatrixRow[]): string {
  const screenable = rows.filter((r) => r.blocked == null)
  if (screenable.length === 0) return 'nothing screenable yet'
  const strong = screenable.filter((r) => {
    const last = r.cells[r.cells.length - 1]
    return last && last.read != null && last.of > 0 && last.read / last.of >= 0.9
  }).length
  const unscreenable = rows.length - screenable.length
  return `${strong} of ${screenable.length} at 90%+ across the universe${
    unscreenable > 0 ? ` · ${unscreenable} unscreenable` : ''
  }`
}

export function coverageMatrix(
  all: LensCoverage | undefined,
  byTier: ByTier,
  columns: readonly TierColumn[],
): MatrixFace[] {
  const lenses = all?.lenses ?? []
  const rows: MatrixRow[] = lenses.map((l) => ({
    lens: l.lens,
    label: l.label,
    face: l.face,
    blocked: l.unscreenable ?? null,
    cells: columns.map((c) => {
      const src = c.tier === '*' ? all : byTier[c.tier]
      const cell = src?.lenses.find((x) => x.lens === l.lens)
      const read = cell?.read ?? null
      const of = cell?.of ?? c.universe
      const view = { read, of, unscreenable: cell?.unscreenable ?? null }
      return {
        tier: c.tier,
        read,
        of,
        text: coveragePct(view),
        lamp: coverageLamp(view),
        title:
          view.unscreenable ??
          (read == null
            ? `${l.label} · ${c.label}: no reading`
            : `${l.label} · ${c.label}: ${read} of ${of}`),
      }
    }),
  }))

  return FACE_ORDER.filter((f) => rows.some((r) => r.face === f)).map((face) => {
    const faceRows = rows.filter((r) => r.face === face)
    return {
      face,
      label: FACE_LABEL[face] ?? face,
      summary: faceSummary(faceRows),
      rows: faceRows,
    }
  })
}

/**
 * Why nothing reads every face — the one line the old page could not write.
 *
 * `every_face: 0` invites the reader to look for a systemic failure. When a
 * single screenable lens is at zero, it is that lens and nothing else, and
 * saying so is the difference between a page and a number.
 */
export function everyFaceBlocker(all: LensCoverage | undefined): string | null {
  if (!all || all.every_face > 0) return null
  const dead = all.lenses.filter((l) => !l.unscreenable && l.read === 0)
  if (dead.length === 0) return null
  const names = dead.map((l) => l.label).join(', ')
  return dead.length === 1
    ? `${names} reads nothing, so no symbol can read all ${all.screenable_lenses}`
    : `${names} read nothing, so no symbol can read all ${all.screenable_lenses}`
}

export interface ReachBar {
  tier: string
  universe: number
  everyFace: number
  noOptionFace: number
  /** Has a reading on some faces but not all. */
  partial: number
}

/** Per tier: is widening the universe reaching the analysis, or the collector? */
export function reachBars(byTier: ByTier, columns: readonly TierColumn[]): ReachBar[] {
  return columns
    .filter((c) => c.tier !== '*')
    .map((c) => {
      const d = byTier[c.tier]
      const universe = d?.universe ?? 0
      const everyFace = d?.every_face ?? 0
      const noOptionFace = d?.no_option_face ?? 0
      return {
        tier: c.tier,
        universe,
        everyFace,
        noOptionFace,
        partial: Math.max(0, universe - everyFace - noOptionFace),
      }
    })
}

export interface StripCell {
  k: string
  v: string
  note: string
  lamp: CoverageLamp
}

/**
 * The design's four-cell strip, each figure carrying the breakdown it is made
 * of — the same rule Signal Health needed: a headline over a composition it
 * does not show is worth less than the composition.
 */
export function coverageStrip(
  all: LensCoverage | undefined,
  byTier: ByTier,
  columns: readonly TierColumn[],
): StripCell[] {
  if (!all) return []
  const perTier = columns
    .filter((c) => c.tier !== '*')
    .map((c) => `${c.label} ${byTier[c.tier]?.universe ?? 0}`)
    .join(' · ')
  const everyShare = all.universe > 0 ? all.every_face / all.universe : 0
  const everyByTier = columns
    .filter((c) => c.tier !== '*')
    .map((c) => {
      const d = byTier[c.tier]
      return `${c.label} ${d?.every_face ?? 0}/${d?.universe ?? 0}`
    })
    .join(' · ')
  const total = all.lenses.length
  const blockedCount = total - all.screenable_lenses
  return [
    {
      k: 'Universe',
      v: all.universe.toLocaleString(),
      note: perTier || 'no tier breakdown',
      lamp: all.universe > 0 ? 'green' : 'gray',
    },
    {
      k: 'Every face readable',
      v: all.every_face.toLocaleString(),
      note: `${Math.round(everyShare * 100)}% · ${everyByTier}`,
      lamp: everyShare >= 0.9 ? 'green' : all.every_face > 0 ? 'yellow' : 'red',
    },
    {
      k: 'Stock-side only',
      v: all.no_option_face.toLocaleString(),
      note: 'no option face at all — the collector has not reached them',
      lamp: all.no_option_face > 0 ? 'yellow' : 'green',
    },
    {
      k: 'Screenable lenses',
      v: `${all.screenable_lenses} / ${total}`,
      note:
        blockedCount > 0
          ? `${blockedCount} unscreenable by design — see below`
          : 'every lens can be screened',
      lamp: blockedCount === 0 ? 'green' : 'yellow',
    },
  ]
}

export interface UnscreenableRow {
  lens: string
  label: string
  why: string
}

/** `unscreenable` keyed by lens, resolved to the label the matrix shows. */
export function unscreenableRows(all: LensCoverage | undefined): UnscreenableRow[] {
  return Object.entries(all?.unscreenable ?? {}).map(([lens, why]) => ({
    lens,
    label: all?.lenses.find((l) => l.lens === lens)?.label ?? lens,
    why,
  }))
}
