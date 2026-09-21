/**
 * The census is mostly a record of what is *not* recorded, so the tests are
 * mostly about that: a station that keeps nothing must say so with a reason,
 * never with a zero.
 */
import { describe, expect, it } from 'vitest'
import { censusReach, stationCensus, stationRollup } from './pipelineModel'

describe('stationCensus', () => {
  const rows = stationCensus(43)

  it('covers every station page the menu carries, and nothing else', () => {
    // Built from `BENCHES`, the same list the sidebar draws its captions
    // over, so the census and the menu cannot disagree about what a station
    // contains.
    expect(rows.length).toBeGreaterThanOrEqual(7)
    expect(new Set(rows.map((r) => r.station))).toEqual(
      new Set(['discover', 'analyze', 'validate']),
    )
  })

  it('counts the one store that keeps an artifact', () => {
    const backtest = rows.find((r) => r.to === '/research/backtest')
    expect(backtest?.made).toBe(43)
    expect(backtest?.missing).toBeNull()
  })

  it('leaves every other page unmeasured, with its own reason', () => {
    // Not "no data": each names the record it would need. A page whose reason
    // reads the same as its neighbour's is a reason nobody checked.
    const unmeasured = rows.filter((r) => r.to !== '/research/backtest')
    expect(unmeasured.length).toBeGreaterThan(0)
    for (const r of unmeasured) {
      expect(r.made, r.to).toBeNull()
      expect(r.missing, r.to).toBeTruthy()
      expect(r.missing, r.to).not.toMatch(/^no data$/i)
    }
  })

  it('says so rather than inventing a count when the query has not answered', () => {
    const pending = stationCensus(null).find((r) => r.to === '/research/backtest')
    expect(pending?.made).toBeNull()
    expect(pending?.missing).toBeTruthy()
  })

  it('names what each page writes, in the design’s words', () => {
    expect(rows.find((r) => r.to === '/research/screener')?.writes).toBe('screen')
    expect(rows.find((r) => r.to === '/research/symbol')?.writes).toBe('read · verdict')
  })
})

describe('stationRollup', () => {
  it('counts pages and how many of them report, per station', () => {
    const out = stationRollup(stationCensus(43))
    const validate = out.find((s) => s.station === 'validate')
    expect(validate?.recorded).toBe(1)
    expect(validate?.pages).toBeGreaterThanOrEqual(1)
    expect(out.find((s) => s.station === 'discover')?.recorded).toBe(0)
  })

  it('keeps the stations in the order the pipeline runs them', () => {
    expect(stationRollup(stationCensus(43)).map((s) => s.station)).toEqual([
      'discover',
      'analyze',
      'validate',
    ])
  })
})

describe('censusReach', () => {
  it('states how much of the pipeline can be measured at all', () => {
    const reach = censusReach(stationCensus(43))
    expect(reach.recorded).toBe(1)
    expect(reach.total).toBe(stationCensus(43).length)
  })

  it('reports nothing measurable while the one store is still loading', () => {
    expect(censusReach(stationCensus(null)).recorded).toBe(0)
  })
})
