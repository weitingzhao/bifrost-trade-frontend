/**
 * Best regime for one nomination source.
 *
 * `/summary?by_regime=true` returns one slice per (regime, horizon). The same
 * candidate settles at more than one horizon, so the slices must not be added
 * together. This column uses 5 days, the same window as Excess 5d.
 *
 * The floor is 5 settled, below the row's amber line of 10. A regime is a
 * slice of that row: five outcomes in one regime is enough to name it, and
 * the row already marks a thin book. Under the floor the cell is an em dash,
 * never 0.
 */
export const BEST_REGIME_HORIZON_DAYS = 5
export const BEST_REGIME_FLOOR = 5

export interface RegimeHitSlice {
  regime: string | null
  horizon_days: number
  settled: number
  hit_rate: number | null
}

export interface BestRegime {
  regime: string
  settled: number
  hit_rate: number
}

export function bestRegimeTitle(floor = BEST_REGIME_FLOOR): string {
  return `fewer than ${floor} settled in any regime`
}

export function bestRegime(
  slices: readonly RegimeHitSlice[] | undefined,
  horizonDays = BEST_REGIME_HORIZON_DAYS,
  floor = BEST_REGIME_FLOOR,
): BestRegime | null {
  const eligible: BestRegime[] = []
  for (const s of slices ?? []) {
    if (s.horizon_days !== horizonDays) continue
    if (s.settled < floor) continue
    if (typeof s.regime !== 'string' || s.regime.length === 0) continue
    if (s.hit_rate == null || !Number.isFinite(s.hit_rate)) continue
    eligible.push({ regime: s.regime, settled: s.settled, hit_rate: s.hit_rate })
  }
  eligible.sort(
    (a, b) => b.hit_rate - a.hit_rate || b.settled - a.settled || a.regime.localeCompare(b.regime),
  )
  return eligible[0] ?? null
}
