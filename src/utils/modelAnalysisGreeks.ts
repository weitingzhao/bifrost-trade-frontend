import type { GreeksInfo, UnderlyingEntry } from '@/types/modelAnalysis'

/** Legs whose option mid never arrived — the model counts them in `degraded_leg_count`. */
export const DEGRADED_LEGS_REASON =
  'No option quote is served for these legs, so their delta is omitted rather than read as zero.'

export function degradedLegCount(greeks: GreeksInfo | null | undefined): number {
  const n = greeks?.degraded_leg_count
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0
}

export function sumDegradedLegs(entries: readonly UnderlyingEntry[]): number {
  let n = 0
  for (const u of entries) n += degradedLegCount(u.greeks)
  return n
}

/** One line for a summary tile or tooltip — count plus why, never a bare zero. */
export function degradedLegsSummary(count: number): string | null {
  if (count <= 0) return null
  const leg = count === 1 ? 'leg' : 'legs'
  return `${count} option ${leg} without a quote — ${DEGRADED_LEGS_REASON}`
}

/** Per-row delta footnote when some legs are missing from the Greek. */
export function degradedLegsRowNote(greeks: GreeksInfo | null | undefined): string | null {
  const n = degradedLegCount(greeks)
  return n > 0 ? degradedLegsSummary(n) : greeks?.reason ? `No delta — ${greeks.reason}` : null
}
