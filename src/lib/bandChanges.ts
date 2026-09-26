/**
 * Since-last-snapshot band changes — pure compare for the Symbol page rail.
 *
 * The Research exhibit API returns the *current* reading only (no prior band).
 * The desk therefore keeps the last exhibit it saw per symbol; when `as_of`
 * advances, this module lists what moved. Band flips sort first; a reading
 * that moved inside its band is marked `within` (grey in the UI).
 *
 * The next earnings print (Research's estimate) rides the same snapshot and
 * gets the design's row: the days counting down, a flip when it crosses the
 * 10-day gate or when the date itself moves (`earningsChange`).
 */
import type { LensBand } from '@/api/research/lenses'
import { LENS_LABELS, RIBBON_LENSES, canonicalLens } from '@/lib/regimeRibbon'
import { EARNINGS_GATE_DAYS, shortDate } from '@/utils/earningsEstimate'

export type BandChangeKind = 'flip' | 'within'

export interface SnapshotLensReading {
  lens: string
  band: LensBand | null
  /** What the row shows on the right of `from → to`. */
  display: string
}

/** The next print as a snapshot holds it; null when Research had no estimate. */
export interface SnapshotEarnings {
  date: string
  daysAway: number
}

export interface SymbolExhibitSnapshot {
  asOf: string | null
  lenses: SnapshotLensReading[]
  /** Absent in snapshots saved before the earnings row existed — nothing to compare yet. */
  earnings?: SnapshotEarnings | null
}

export interface BandChangeRow {
  lens: string
  label: string
  from: string
  to: string
  kind: BandChangeKind
  /** The earnings row inside the gate reads red, as the design paints it. */
  tone?: 'danger'
}

/** Labels used when the registry is not in scope (same fallback as the ribbon). */
const LABELS: Record<string, string> = {
  ...LENS_LABELS,
}

/** Format a verdict value for the change row; band label is the fallback. */
export function formatReadingDisplay(input: {
  band: LensBand | null
  label?: string | null
  value?: unknown
  unit?: string | null
}): string {
  const { value, unit, label, band } = input
  if (value != null && value !== '') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const n = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1)
      if (unit === '%' || unit === 'pct') return `${n}%`
      // The registry's unit strings are storage tokens (`pctile_of_abs_slope_252d`,
      // `pct_of_1y_range`); printed raw they read as a leak, and the lens label
      // beside the row already says what the number is. Keep only human units.
      if (unit && unit.length <= 6 && !unit.includes('_')) return `${n} ${unit}`
      return n
    }
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  if (label && label.trim()) return label.trim()
  if (band) return band
  return '—'
}

/**
 * Diff prior → current. Empty when there is no prior, as_of has not advanced,
 * or nothing moved. Flips precede within-band moves; otherwise stable by lens
 * order in `RIBBON_LENSES`.
 */
export function bandChanges(
  prior: SymbolExhibitSnapshot | null,
  current: SymbolExhibitSnapshot,
): BandChangeRow[] {
  if (!prior) return []
  // Same research session — the snapshot has not rolled; do not invent motion.
  if ((prior.asOf ?? '') === (current.asOf ?? '') && prior.asOf != null) return []

  const priorBy = new Map(prior.lenses.map((l) => [canonicalLens(l.lens), l]))
  const order = new Map(RIBBON_LENSES.map((id, i) => [canonicalLens(id), i]))
  const rows: BandChangeRow[] = []

  for (const cur of current.lenses) {
    const key = canonicalLens(cur.lens)
    const prev = priorBy.get(key)
    if (!prev) continue
    if (prev.display === cur.display && prev.band === cur.band) continue
    const flipped = (prev.band ?? null) !== (cur.band ?? null)
    rows.push({
      lens: cur.lens,
      label: LABELS[cur.lens] ?? LABELS[key] ?? cur.lens.replace(/_/g, ' '),
      from: prev.display,
      to: cur.display,
      kind: flipped ? 'flip' : 'within',
    })
  }

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'flip' ? -1 : 1
    const ai = order.get(canonicalLens(a.lens)) ?? 99
    const bi = order.get(canonicalLens(b.lens)) ?? 99
    return ai - bi
  })
  return rows
}

type Gate = 'none' | 'late' | 'in' | 'out'

function gateOf(e: SnapshotEarnings | null): Gate {
  if (!e) return 'none'
  if (e.daysAway < 0) return 'late'
  return e.daysAway <= EARNINGS_GATE_DAYS ? 'in' : 'out'
}

function earningsDisplay(e: SnapshotEarnings | null, withDate: boolean): string {
  if (!e) return '—'
  if (e.daysAway < 0) return `late · ~${shortDate(e.date)}`
  return withDate ? `${e.daysAway}d · ${shortDate(e.date)}` : `${e.daysAway}d`
}

/**
 * The design's Earnings row, prior → current. The days count down between
 * sessions (grey); crossing the 10-day gate, going late, or the date itself
 * moving — the print landed and the estimate rolled on, or appeared — is a
 * flip. Null without both halves or when the session has not rolled.
 */
export function earningsChange(
  prior: SymbolExhibitSnapshot | null,
  current: SymbolExhibitSnapshot,
): BandChangeRow | null {
  if (!prior || prior.earnings === undefined || current.earnings === undefined) return null
  if ((prior.asOf ?? '') === (current.asOf ?? '') && prior.asOf != null) return null
  const p = prior.earnings
  const c = current.earnings
  if (!p && !c) return null
  const dateMoved = (p?.date ?? null) !== (c?.date ?? null)
  if (!dateMoved && p?.daysAway === c?.daysAway) return null
  return {
    lens: 'earnings',
    label: 'Earnings (est.)',
    from: earningsDisplay(p, dateMoved),
    to: earningsDisplay(c, dateMoved),
    kind: dateMoved || gateOf(p) !== gateOf(c) ? 'flip' : 'within',
    ...(gateOf(c) === 'in' ? { tone: 'danger' as const } : {}),
  }
}
