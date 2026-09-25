import { describe, expect, it } from 'vitest'
import { seriesFromMatrices, topPairs, weekdaysBack } from './historyCorr'

const answer = (as_of: string, rho: number | null) => ({
  as_of,
  window: 60,
  min_fill: 0.8,
  symbols: ['A', 'B'],
  matrix: { A: { B: { rho, n: 60 } }, B: { A: { rho, n: 60 } } },
})

describe('weekdaysBack', () => {
  it('counts back weekdays only, oldest first, the date itself last', () => {
    // 2031-03-10 is a Monday.
    expect(weekdaysBack('2031-03-10', 3)).toEqual(['2031-03-06', '2031-03-07', '2031-03-10'])
    expect(weekdaysBack('2031-03-10', 0)).toEqual([])
    expect(weekdaysBack('garbage', 3)).toEqual([])
  })
})

describe('seriesFromMatrices', () => {
  it('keeps one point per session the server names and skips unfilled cells', () => {
    const line = seriesFromMatrices({ a: 'A', b: 'B' }, [
      answer('2031-03-07', 0.5),
      // A holiday on 03-10 answers for the session before: the same point again.
      answer('2031-03-07', 0.5),
      answer('2031-03-11', null),
      null,
      answer('2031-03-12', 0.6),
    ])
    expect(line).toEqual([
      { date: '2031-03-07', rho: 0.5 },
      { date: '2031-03-12', rho: 0.6 },
    ])
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
