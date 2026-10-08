import { describe, expect, it } from 'vitest'
import { BEST_REGIME_FLOOR, bestRegime, bestRegimeTitle } from './bestRegime'

const range = { regime: 'range', horizon_days: 5, settled: 65, hit_rate: 0.385 }
const trending = { regime: 'trending', horizon_days: 5, settled: 31, hit_rate: 0.774 }

describe('bestRegime', () => {
  it('picks the highest hit rate that clears the floor', () => {
    const got = bestRegime([
      range,
      trending,
      { regime: 'trending', horizon_days: 1, settled: 46, hit_rate: 0.99 },
    ])
    expect(got?.regime).toBe('trending')
    expect(got?.settled).toBe(31)
  })

  it('returns nothing when every regime is under the floor', () => {
    expect(
      bestRegime([
        { regime: 'range', horizon_days: 5, settled: 3, hit_rate: 0.67 },
        { regime: 'trending', horizon_days: 5, settled: BEST_REGIME_FLOOR - 1, hit_rate: 1 },
      ]),
    ).toBeNull()
    expect(bestRegimeTitle()).toBe('fewer than 5 settled in any regime')
  })

  it('breaks a hit-rate tie toward the larger sample', () => {
    expect(
      bestRegime([
        { regime: 'range', horizon_days: 5, settled: 8, hit_rate: 0.5 },
        { regime: 'trending', horizon_days: 5, settled: 20, hit_rate: 0.5 },
      ])?.regime,
    ).toBe('trending')
  })
})
