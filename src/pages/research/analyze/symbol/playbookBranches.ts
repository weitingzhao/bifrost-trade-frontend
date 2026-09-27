/**
 * The playbook's four branches and what the intraday terrain says about them —
 * shared by the playbook panel and its session snapshots.
 */
import type { TerrainIntraday } from '@/api/researchEngine'
import type { DenseTagVariant } from '@/components/data-display'

// Rangy green, Bull state blue, Bear red, Squeeze amber — the leading branch is
// bolded, never recoloured. Bull was the ticker lime; §14.4.6 keeps lime for the name (Owner 2026-09-27).
export const BRANCHES = [
  { key: 'rangy', label: 'Rangy', text: 'text-success', bar: 'bg-success' },
  { key: 'bull', label: 'Bull', text: 'text-[var(--sk-state-blue)]', bar: 'bg-[var(--sk-state-blue)]' },
  { key: 'bear', label: 'Bear', text: 'text-destructive', bar: 'bg-destructive' },
  { key: 'squeeze', label: 'Squeeze', text: 'text-warning', bar: 'bg-warning' },
] as const

export type BranchKey = (typeof BRANCHES)[number]['key']

export function liveVariant(regime: string): DenseTagVariant {
  const lo = regime.toLowerCase()
  if (lo.includes('bull')) return 'success'
  if (lo.includes('bear')) return 'danger'
  if (lo.includes('squeeze') || lo.includes('transition')) return 'warning'
  return 'neutral'
}

export function transitionsOf(rows: readonly TerrainIntraday[]) {
  const out: { time: string; txt: string }[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i - 1].regime !== rows[i].regime) {
      out.push({
        time: rows[i].asof_ts.slice(11, 16),
        txt: `${rows[i - 1].regime} → ${rows[i].regime} · ${rows[i].spot.toFixed(2)}`,
      })
    }
  }
  return out
}

/** Every snapshot of the session identical — spot, regime and the four probabilities. */
export function flatSession(rows: readonly TerrainIntraday[]) {
  if (rows.length < 2) return false
  const key = (r: TerrainIntraday) =>
    [r.spot, r.regime, r.prob_rangy, r.prob_bull, r.prob_bear, r.prob_squeeze].join('|')
  return rows.every((r) => key(r) === key(rows[0]))
}

export function branchProbs(row: TerrainIntraday): Record<BranchKey, number> {
  return { rangy: row.prob_rangy, bull: row.prob_bull, bear: row.prob_bear, squeeze: row.prob_squeeze }
}

/** The branch the snapshot leads with — its highest probability. */
export function leadBranch(row: TerrainIntraday): BranchKey {
  const p = branchProbs(row)
  return (Object.keys(p) as BranchKey[]).sort((a, b) => p[b] - p[a])[0]
}

/**
 * What would overturn the leading branch, from the snapshot's own levels. The
 * retired section priced squeeze as ±1σ off the zone's half-width; the terrain
 * stores no σ, so it is named for what it is — the gamma zone.
 */
export function invalidation(kind: BranchKey, row: TerrainIntraday): string {
  const lo = row.gamma_zone_low
  const hi = row.gamma_zone_high
  const mid = ((lo + hi) / 2).toFixed(2)
  switch (kind) {
    case 'rangy':
      return `a break below ${lo.toFixed(2)} or above ${hi.toFixed(2)}`
    case 'bull':
      return `a fall back through the zone's midpoint ${mid}`
    case 'bear':
      return `a reclaim of the zone's midpoint ${mid}`
    case 'squeeze':
      return `spot leaving the gamma zone ${lo.toFixed(2)}–${hi.toFixed(2)}`
  }
}

/** Where the snapshot's spot came from — `inputs_json.spot_source` (research 0.138.0+). */
export function spotSourceOf(row: TerrainIntraday): 'parity' | 'prior_close' | null {
  const s = row.inputs_json?.spot_source
  return s === 'parity' || s === 'prior_close' ? s : null
}
