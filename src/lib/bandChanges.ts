/**
 * Since-last-snapshot band changes — pure compare for the Symbol page rail.
 *
 * The Research exhibit API returns the *current* reading only (no prior band).
 * The desk therefore keeps the last exhibit it saw per symbol; when `as_of`
 * advances, this module lists what moved. Band flips sort first; a reading
 * that moved inside its band is marked `within` (grey in the UI).
 */
import type { LensBand } from '@/api/research/lenses'
import { LENS_LABELS, RIBBON_LENSES, canonicalLens } from '@/lib/regimeRibbon'

export type BandChangeKind = 'flip' | 'within'

export interface SnapshotLensReading {
  lens: string
  band: LensBand | null
  /** What the row shows on the right of `from → to`. */
  display: string
}

export interface SymbolExhibitSnapshot {
  asOf: string | null
  lenses: SnapshotLensReading[]
}

export interface BandChangeRow {
  lens: string
  label: string
  from: string
  to: string
  kind: BandChangeKind
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
      if (unit) return `${n} ${unit}`
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
