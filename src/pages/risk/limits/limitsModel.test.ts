import { describe, expect, it } from 'vitest'
import { LIMIT_WATCH, breached, gateParams, houseLimits, watching } from './limitsModel'

const BASE = {
  backingUsedPct: 0.48,
  backingGatePct: 0.85,
  topNameShare: 0.36,
  concentrationFloor: 0.35,
  pressure: 0.26,
  pressureCeiling: 0.5,
  nakedShortCalls: 2,
  nakedShortCallLimit: null,
}

describe('houseLimits', () => {
  it('reads each line against its own limit and says which page owns the reading', () => {
    const rows = houseLimits(BASE)
    expect(rows.map((r) => r.key)).toEqual(['backing', 'concentration', 'pressure', 'naked'])
    expect(rows[0]).toMatchObject({ kind: 'hard', current: 0.48, ceiling: 0.85 })
    expect(rows[0].use).toBeCloseTo(0.48 / 0.85)
    expect(rows[0].citedFrom.to).toBe('/portfolio/backing')
    expect(rows[1].use).toBeCloseTo(0.36 / 0.35)
  })

  it('keeps a line with a live reading and no house number — and says that is what is missing', () => {
    const [, , , naked] = houseLimits(BASE)
    expect(naked).toMatchObject({ current: 2, ceiling: null, use: null, limit: 'no house number' })
    expect(naked.noReading).toMatch(/never written a number/)
  })

  it('keeps a line whose reading is missing, rather than dropping the limit', () => {
    const [backing] = houseLimits({ ...BASE, backingUsedPct: null })
    expect(backing.current).toBeNull()
    expect(backing.use).toBeNull()
    expect(backing.noReading).toBe('nothing priced the pool')
  })
})

describe('breached and watching', () => {
  it('separates past the line from approaching it', () => {
    const rows = houseLimits(BASE)
    // 36% against a 35% floor is past; 48% of the 85% gate is neither.
    expect(breached(rows).map((r) => r.key)).toEqual(['concentration'])
    expect(watching(rows).map((r) => r.key)).toEqual([])
    expect(LIMIT_WATCH).toBe(0.8)
  })

  it('a line exactly at its limit is not yet breached, but is being watched', () => {
    const rows = houseLimits({ ...BASE, topNameShare: 0.35 })
    expect(breached(rows)).toEqual([])
    expect(watching(rows).map((r) => r.key)).toEqual(['concentration'])
  })
})

describe('gateParams', () => {
  it('flattens the daemon’s stored parameters and keeps the section they sit under', () => {
    const rows = gateParams({
      guard: { risk: { max_daily_loss_usd: 5000, paper_trade: true } },
      strategy: { structure: { min_dte: 21 }, earnings: { dates: [] } },
    })
    expect(rows).toEqual([
      { section: 'guard', key: 'risk.max_daily_loss_usd', value: '5000' },
      { section: 'guard', key: 'risk.paper_trade', value: 'true' },
      { section: 'strategy', key: 'structure.min_dte', value: '21' },
    ])
  })

  it('has nothing to say about a gate that is not an object', () => {
    expect(gateParams(null)).toEqual([])
    expect(gateParams([1, 2])).toEqual([])
  })
})
