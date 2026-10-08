import { describe, expect, it } from 'vitest'
import { degradedLegsSummary, sumDegradedLegs } from './modelAnalysisGreeks'
import type { UnderlyingEntry } from '@/types/modelAnalysis'

describe('modelAnalysisGreeks (TD-264)', () => {
  it('sums degraded_leg_count and never invents a zero tile', () => {
    const rows: UnderlyingEntry[] = [
      { symbol: 'AAA', greeks: { delta: 1, delta_dollars: 1, degraded: false } } as UnderlyingEntry,
      { symbol: 'BBB', greeks: { delta: 2, delta_dollars: 2, degraded: true, degraded_leg_count: 3 } } as UnderlyingEntry,
    ]
    expect(sumDegradedLegs(rows)).toBe(3)
    expect(degradedLegsSummary(0)).toBeNull()
    expect(degradedLegsSummary(3)).toContain('3 option legs')
    expect(degradedLegsSummary(3)).toContain('No option quote is served')
  })
})
