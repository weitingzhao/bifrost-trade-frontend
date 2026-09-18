import { describe, expect, it } from 'vitest'
import { budgetLines, sizeCandidate, UNWRITTEN_POLICY, type SizingCaps } from './riskBudget'

describe('budgetLines', () => {
  it('turns a written percentage into a line, and says so when nothing wrote one', () => {
    const [perTrade, daily, weekly] = budgetLines({
      netLiquidation: 200_000,
      policy: { perTradePct: 0.008, dailyCapPct: 0.03, weeklyCapPct: null },
      spentToday: 3_000,
      spentThisWeek: 9_000,
    })
    expect(perTrade.amount).toBeCloseTo(1_600)
    expect(daily.amount).toBeCloseTo(6_000)
    expect(daily.left).toBeCloseTo(3_000)
    expect(daily.use).toBeCloseTo(0.5)
    expect(daily.breached).toBe(false)
    // An unwritten line carries no amount and says which half is missing —
    // never zero, which would read as "this trade may risk nothing".
    expect(weekly.pct).toBeNull()
    expect(weekly.amount).toBeNull()
    expect(weekly.left).toBeNull()
    expect(weekly.noLine).toBe('no line written')
  })

  it('cannot take a percentage of a net liquidation the broker did not report', () => {
    const [, daily] = budgetLines({
      netLiquidation: null,
      policy: { perTradePct: 0.008, dailyCapPct: 0.03, weeklyCapPct: 0.09 },
      spentToday: 1_000,
      spentThisWeek: null,
    })
    expect(daily.amount).toBeNull()
    expect(daily.use).toBeNull()
    expect(daily.noLine).toMatch(/net liquidation/)
  })

  it('reads a breach from the spend side only when both sides are known', () => {
    const [, daily] = budgetLines({
      netLiquidation: 100_000,
      policy: { perTradePct: null, dailyCapPct: 0.03, weeklyCapPct: null },
      spentToday: 3_600,
      spentThisWeek: null,
    })
    expect(daily.use).toBeCloseTo(1.2)
    expect(daily.breached).toBe(true)

    // Nothing records a decision on this side, so spend is null and a line with
    // a number on it still cannot be called breached.
    const [, unspent] = budgetLines({
      netLiquidation: 100_000,
      policy: { perTradePct: null, dailyCapPct: 0.03, weeklyCapPct: null },
      spentToday: null,
      spentThisWeek: null,
    })
    expect(unspent.amount).toBeCloseTo(3_000)
    expect(unspent.use).toBeNull()
    expect(unspent.breached).toBe(false)
  })

  it('is entirely unwritten under the policy this side actually has', () => {
    const lines = budgetLines({
      netLiquidation: 200_000,
      policy: UNWRITTEN_POLICY,
      spentToday: null,
      spentThisWeek: null,
    })
    expect(lines.every((l) => l.noLine === 'no line written')).toBe(true)
    expect(lines.map((l) => l.key)).toEqual(['per-trade', 'daily', 'weekly'])
  })
})

const caps: SizingCaps = {
  maxLossPerContract: 500,
  marginPerContract: 2_000,
  riskBudgetPerTrade: 1_600,
  marginHeadroom: 30_000,
  betaDeltaPerContract: 4_000,
  nameBetaDelta: 20_000,
  bookBetaDelta: 200_000,
  concentrationCeiling: 0.35,
  gateRoom: null,
  gateApplies: false,
}

describe('sizeCandidate', () => {
  it('floors each cap and lets the smallest bind', () => {
    const r = sizeCandidate(caps)
    // 1600 / 500 = 3.2 → three contracts, not three and a fifth.
    expect(r.nByRisk).toBe(3)
    expect(r.nByMargin).toBe(15)
    expect(r.n).toBe(3)
    expect(r.binding).toBe('risk')
    expect(r.missing).toEqual([])
  })

  it('solves the concentration ceiling instead of dividing into it', () => {
    // Adding to the name adds to the book too, so the share moves more slowly
    // than a plain division suggests: (20k + 4k·n) / (200k + 4k·n) ≤ 35%.
    const r = sizeCandidate({ ...caps, riskBudgetPerTrade: 1_000_000, marginHeadroom: 10_000_000 })
    expect(r.nByConcentration).toBe(19)
    expect(r.binding).toBe('concentration')
    // The 20th contract would put the name past the line.
    const share = (n: number) => (20_000 + 4_000 * n) / (200_000 + 4_000 * n)
    expect(share(19)).toBeLessThanOrEqual(0.35)
    expect(share(20)).toBeGreaterThan(0.35)
  })

  it('allows nothing when the name is already over the ceiling', () => {
    const r = sizeCandidate({ ...caps, nameBetaDelta: 90_000, riskBudgetPerTrade: 1_000_000 })
    expect(r.nByConcentration).toBe(0)
    expect(r.n).toBe(0)
    expect(r.binding).toBe('concentration')
  })

  it('names a cap it could not compute rather than treating it as unlimited', () => {
    // This is the failure that matters: an uncomputed cap silently widens the
    // answer, and a sizing tool that sizes up on missing data is worse than one
    // that refuses.
    const r = sizeCandidate({ ...caps, riskBudgetPerTrade: null, betaDeltaPerContract: null })
    expect(r.nByRisk).toBeNull()
    expect(r.nByConcentration).toBeNull()
    expect(r.missing.map((m) => m.cap).sort()).toEqual(['concentration', 'risk'])
    // Only the cap that could be computed binds, and the page is told the rest.
    expect(r.n).toBe(15)
    expect(r.binding).toBe('margin')
  })

  it('returns no size at all when no cap can be computed', () => {
    const r = sizeCandidate({
      ...caps,
      riskBudgetPerTrade: null,
      marginHeadroom: null,
      betaDeltaPerContract: null,
    })
    expect(r.n).toBeNull()
    expect(r.binding).toBeNull()
    expect(r.missing).toHaveLength(3)
  })
})

describe('sizeCandidate · the gate cap', () => {
  it('is silent on a hand plan, which is under no allocation', () => {
    const r = sizeCandidate(caps)
    expect(r.nByGate).toBeNull()
    // Not applicable is not the same as missing: a hand plan must not read as
    // constrained by a rule it is not under.
    expect(r.missing.map((m) => m.cap)).not.toContain('gate')
  })

  it('caps to the room left when an opportunity covers the candidate', () => {
    const r = sizeCandidate({ ...caps, gateApplies: true, gateRoom: 1 })
    expect(r.nByGate).toBe(1)
    expect(r.n).toBe(1)
    expect(r.binding).toBe('gate')
  })

  it('floors the room like every other cap', () => {
    expect(sizeCandidate({ ...caps, gateApplies: true, gateRoom: 2.9 }).nByGate).toBe(2)
    expect(sizeCandidate({ ...caps, gateApplies: true, gateRoom: -3 }).nByGate).toBe(0)
  })

  it('reports the cap missing when the gate applies and nothing reads it', () => {
    const r = sizeCandidate({ ...caps, gateApplies: true, gateRoom: null })
    expect(r.nByGate).toBeNull()
    expect(r.missing.find((m) => m.cap === 'gate')).toBeTruthy()
    // The other caps still bind — a missing cap never widens the answer.
    expect(r.n).toBe(3)
  })

  it('does not bind when another cap is tighter', () => {
    const r = sizeCandidate({ ...caps, gateApplies: true, gateRoom: 99 })
    expect(r.nByGate).toBe(99)
    expect(r.binding).not.toBe('gate')
  })
})
