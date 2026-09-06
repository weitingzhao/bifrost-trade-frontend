import { describe, it, expect } from 'vitest'
import { computeRoomToAdd, daysToExpiry, regTShortPutMargin } from './roomToAdd'
import { fixture, NOW } from './roomToAdd.fixture'

describe('regTShortPutMargin', () => {
  it('is premium plus the greater of 20% of spot less the OTM amount and 10% of strike, per contract', () => {
    // DDOG 200 put, spot 213: 20% × 213 − 13 = 29.6 beats 10% × 200 = 20; plus 9.95 premium.
    expect(regTShortPutMargin(213, 200, 9.95)).toBeCloseTo(3955, 6)
    // Far out of the money the 10%-of-strike floor holds: NBIS 145 put at 226.
    expect(regTShortPutMargin(226, 145, 11)).toBeCloseTo((14.5 + 11) * 100, 6)
    // In the money there is no OTM amount to subtract.
    expect(regTShortPutMargin(148, 175, 66.34)).toBeCloseTo((29.6 + 66.34) * 100, 6)
  })
  it('counts days to a YYYYMMDD expiry and rejects anything else', () => {
    expect(daysToExpiry('20261016', NOW)).toBe(41)
    expect(daysToExpiry('20261120', NOW)).toBe(76)
    expect(daysToExpiry('2026-10-16', NOW)).toBeNull()
  })
})

describe('computeRoomToAdd', () => {
  const room = computeRoomToAdd({ ...fixture(), ceiling: 0.5, nowSec: NOW })

  it('reads the book as it stands: contracts, entry premium, tenor, pool in use', () => {
    expect(room.now).toMatchObject({ pressure: 0.27, calls: 5, puts: 1, netPremium: 5990, shortPutPremium: 995, tenor: { min: 41, max: 76 } })
    expect(room.now.excessLiquidity).toBe(730_000)
    expect(room.now.netLiquidation).toBe(1_000_000)
    // 500 NVDA × 230.36 behind the calls, 20,000 cash behind the put; free = the rest of the cash-like.
    expect(room.pool.used).toBeCloseTo(115_180 + 20_000, 2)
    expect(room.pool.free).toBeCloseTo(52_642.6, 2)
    expect(room.pool.yieldPerCycle).toBeCloseTo(5990 / 135_180, 8)
  })

  it('backed step: free cash-like sized like the puts held, income at the book’s yield, pressure moved by their Reg T margin', () => {
    expect(room.backed).toMatchObject({ calls: 0, freeShares: 0, cashPerPut: 20_000, puts: 2 })
    expect(room.backed.cashFree).toBeCloseTo(52_642.6, 2)
    expect(room.backed.income).toBeCloseTo((5990 / 135_180) * 52_642.6, 2)
    // Two more DDOG-sized puts take 2 × 3,955 out of 730,000 excess on 1,000,000 NLV.
    expect(room.backed.pressureAfter).toBeCloseTo(1 - (730_000 - 7_910) / 1_000_000, 8)
  })

  it('margin step: headroom to the ceiling, capped by available funds, less the backed puts, ÷ Reg T per put', () => {
    const m = room.margin
    expect(m.accounts).toEqual([{ accountId: 'U1', pressure: 0.27, netLiquidation: 1_000_000, availableFunds: 700_000, headroom: 230_000 }])
    expect(m.headroom).toBeCloseTo(230_000, 6)
    expect(m.headroomAfterBacked).toBeCloseTo(230_000 - 7_910, 6)
    expect(m.models).toHaveLength(1)
    expect(m.models[0]).toMatchObject({ underlying: 'DDOG', strike: 200, contracts: 1, spot: 213, otm: 13, premiumPerShare: 9.95 })
    expect(m.marginPerPut).toBeCloseTo(3955, 6)
    expect(m.leverage).toBeCloseTo(20_000 / 3955, 6)
    expect(m.puts).toBe(56)
    expect(m.premiumPerPut).toBe(995)
    expect(m.income).toBe(56 * 995)
    expect(m.pressureAfter).toBeCloseTo(1 - (730_000 - 58 * 3955) / 1_000_000, 8)
    expect(m.pressureAfter).toBeLessThan(0.5)
    expect(m.level).toBe(1)
    expect(m.unmodelledPuts).toBe(0)
  })

  it('a higher ceiling opens more room; a ceiling below today’s pressure leaves none', () => {
    const wide = computeRoomToAdd({ ...fixture(), ceiling: 0.75, nowSec: NOW })
    expect(wide.margin.headroom).toBeCloseTo(480_000, 6)
    expect(wide.margin.puts).toBeGreaterThan(room.margin.puts as number)
    const shut = computeRoomToAdd({ ...fixture(), ceiling: 0.2, nowSec: NOW })
    expect(shut.margin.headroom).toBe(0)
    expect(shut.margin.puts).toBe(0)
    expect(shut.margin.income).toBe(0)
  })

  it('without a short put there is no size to extrapolate from, and an unpriced put is counted but not modelled', () => {
    const f = fixture()
    const noPuts = computeRoomToAdd({ ...f, legs: f.legs.filter((l) => l.right === 'C'), ceiling: 0.5, nowSec: NOW })
    expect(noPuts.backed.puts).toBeNull()
    expect(noPuts.backed.cashPerPut).toBeNull()
    expect(noPuts.margin.marginPerPut).toBeNull()
    expect(noPuts.margin.puts).toBeNull()
    const blind = computeRoomToAdd({ ...f, resolveSpot: () => null, ceiling: 0.5, nowSec: NOW })
    expect(blind.margin.unmodelledPuts).toBe(1)
    expect(blind.margin.puts).toBeNull()
    expect(blind.backed.puts).toBe(2)
    expect(blind.backed.pressureAfter).toBeNull()
  })
})
