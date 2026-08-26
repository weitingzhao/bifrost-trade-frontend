import type { TerrainIntraday } from '@/api/researchEngine'

export type ScenarioKind = 'rangy' | 'bull' | 'bear' | 'squeeze'

export function liveScenario(latest: TerrainIntraday): ScenarioKind {
  const scores: { kind: ScenarioKind; p: number }[] = [
    { kind: 'rangy', p: latest.prob_rangy },
    { kind: 'bull', p: latest.prob_bull },
    { kind: 'bear', p: latest.prob_bear },
    { kind: 'squeeze', p: latest.prob_squeeze },
  ]
  scores.sort((a, b) => b.p - a.p)
  return scores[0].kind
}

/** Invalidate / Stop lines from levels only — no invented strategy copy. */
export function invalidateLine(kind: ScenarioKind, latest: TerrainIntraday): string {
  const low = latest.gamma_zone_low
  const high = latest.gamma_zone_high
  const mid = (low + high) / 2
  const halfWidth = Math.abs(high - low) / 2
  const inputs = latest.inputs_json ?? {}
  const sigmaRaw =
    typeof inputs.sigma === 'number'
      ? inputs.sigma
      : typeof inputs['1sigma'] === 'number'
        ? (inputs['1sigma'] as number)
        : typeof inputs.one_sigma === 'number'
          ? (inputs.one_sigma as number)
          : null
  const sigma =
    sigmaRaw != null && Number.isFinite(sigmaRaw) ? sigmaRaw : halfWidth > 0 ? halfWidth : null

  switch (kind) {
    case 'rangy':
      return `Invalidate: break below ${low.toFixed(2)} or above ${high.toFixed(2)}`
    case 'bull':
      return `Invalidate: fall back through zone mid ${mid.toFixed(2)}`
    case 'bear':
      return `Invalidate: reclaim zone mid ${mid.toFixed(2)}`
    case 'squeeze':
      if (sigma == null) return 'Invalidate: leave pin ±1σ —'
      return `Invalidate: leave pin ${mid.toFixed(2)} ±1σ (${sigma.toFixed(2)})`
  }
}

export const SCENARIO_LABELS: Record<ScenarioKind, string> = {
  rangy: 'Rangy',
  bull: 'Bull',
  bear: 'Bear',
  squeeze: 'Squeeze',
}
