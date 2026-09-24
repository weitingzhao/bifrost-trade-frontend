import { describe, expect, it } from 'vitest'
import { alignedLogReturns, rollingPearson, topPairs } from './historyCorr'

const bars = (closes: (number | null)[], start = 1) =>
  closes.map((c, i) => ({ date: `2026-01-${String(start + i).padStart(2, '0')}`, close: c }))

describe('alignedLogReturns', () => {
  it('walks only the shared dates and skips holes', () => {
    const a = bars([100, 110, 121, null, 133.1])
    const b = bars([50, 55, 60.5, 66.55, 73.205])
    const { l, r, dates } = alignedLogReturns(a, b)
    // the null drops 01-04 from the intersection; the next return spans it
    expect(dates).toEqual(['2026-01-02', '2026-01-03', '2026-01-05'])
    expect(l[0]).toBeCloseTo(Math.log(1.1), 10)
    expect(r[0]).toBeCloseTo(Math.log(1.1), 10)
  })
})

describe('rollingPearson', () => {
  it('reads +1 for lockstep series and -1 for mirrored ones', () => {
    const up = [0.01, 0.02, -0.01, 0.03, 0.005, -0.02]
    const down = up.map((x) => -x)
    const dates = up.map((_, i) => `d${i}`)
    const lock = rollingPearson(up, up, dates, 4)
    expect(lock).toHaveLength(3)
    for (const p of lock) expect(p.rho).toBeCloseTo(1, 8)
    const mirror = rollingPearson(up, down, dates, 4)
    for (const p of mirror) expect(p.rho).toBeCloseTo(-1, 8)
  })

  it('answers nothing until the window fills', () => {
    expect(rollingPearson([0.01, 0.02], [0.01, 0.02], ['a', 'b'], 5)).toEqual([])
  })
})

describe('topPairs', () => {
  it('ranks off the matrix and skips unread cells', () => {
    const matrix = {
      A: { B: { rho: 0.8, n: 60 }, C: { rho: null, n: 10 } },
      B: { C: { rho: 0.5, n: 60 } },
      C: {},
    }
    const pairs = topPairs(matrix, ['A', 'B', 'C'], 2)
    expect(pairs.map((p) => p.label)).toEqual(['A / B', 'B / C'])
    expect(topPairs(null, ['A'])).toEqual([])
  })
})
