import { describe, expect, it } from 'vitest'
import {
  LIMIT_GROUPS,
  gateLimitRules,
  type GateReadings,
  LIMIT_WATCH,
  gateParams,
  limitRules,
  openBreaches,
  unwritten,
  watching,
  withHeadroom,
} from './limitsModel'

const READINGS = {
  topNameShare: 0.37,
  concentrationFloor: 0.35,
  clusterShare: 0.41,
  contractsToday: 2,
  contractsTodayDate: '2026-09-16',
  newUnderlyingsThisWeek: 2,
  buyingPowerBuffer: 0.74,
  bufferFloor: 0.5,
  backingUsed: 0.48,
  backingGate: 0.85,
  maintenanceOverNlv: 0.29,
  netBetaDelta: 1_873_144,
  shortGamma: 9,
  nakedShortPuts: 0,
}

describe('limitRules', () => {
  it('is the design’s book of the book — twelve rules across five groups, kept even when unwritten', () => {
    const rules = limitRules(READINGS)
    expect(rules).toHaveLength(12)
    // The sixth group, Gate, is not the book's — it is the allocation's, and it
    // comes from the gate record rather than from these readings.
    expect([...new Set(rules.map((r) => r.group))]).toEqual(
      [...LIMIT_GROUPS].filter((g) => g !== 'Gate'),
    )
    // Only three lines have ever been written down on this side.
    expect(rules.filter((r) => r.limit != null).map((r) => r.key)).toEqual(['single-name', 'bp-buffer', 'backing'])
  })

  it('keeps a rule nothing can read, and says which half is missing', () => {
    const [, , sector] = limitRules(READINGS)
    expect(sector.key).toBe('sector')
    expect(sector.current).toBeNull()
    expect(sector.noReading).toMatch(/no sector/)
    expect(sector.citedFrom).toBeNull()
  })

  it('every rule that reads says which page computed it', () => {
    for (const r of limitRules(READINGS)) {
      if (r.current != null) expect(r.citedFrom, r.key).not.toBeNull()
    }
  })
})

describe('withHeadroom', () => {
  const rows = withHeadroom(limitRules(READINGS))

  it('reads a ceiling and a floor from the sides they are breached from', () => {
    const single = rows.find((r) => r.key === 'single-name')!
    // 37% against a 35% ceiling is past it.
    expect(single.use).toBeCloseTo(0.37 / 0.35)
    expect(single.breached).toBe(true)

    const buffer = rows.find((r) => r.key === 'bp-buffer')!
    // A 74% buffer against a 50% floor has room — the ratio inverts.
    expect(buffer.use).toBeCloseTo(0.5 / 0.74)
    expect(buffer.breached).toBe(false)
  })

  it('a rule with no line has no headroom and cannot be breached', () => {
    const cluster = rows.find((r) => r.key === 'cluster')!
    expect(cluster.current).toBe(0.41)
    expect(cluster.use).toBeNull()
    expect(cluster.breached).toBe(false)
  })

  it('separates the breached, the close and the unwritten', () => {
    expect(openBreaches(rows).map((r) => r.key)).toEqual(['single-name'])
    expect(watching(rows).map((r) => r.key)).toEqual([])
    expect(unwritten(rows).map((r) => r.key)).toEqual([
      'cluster',
      'contracts-today',
      'new-underlyings',
      'maint-nlv',
      'net-beta-delta',
      'short-gamma',
      'naked-puts',
    ])
    expect(LIMIT_WATCH).toBe(0.8)
  })

  it('a floor breach is one the reading fell below', () => {
    const [row] = withHeadroom(
      limitRules({ ...READINGS, buyingPowerBuffer: 0.4 }).filter((r) => r.key === 'bp-buffer'),
    )
    expect(row.use).toBeCloseTo(0.5 / 0.4)
    expect(row.breached).toBe(true)
  })
})

describe('gateParams', () => {
  it('flattens the daemon’s stored parameters and keeps the section they sit under', () => {
    expect(
      gateParams({
        guard: { risk: { max_daily_loss_usd: 5000, paper_trade: true } },
        strategy: { structure: { min_dte: 21 }, earnings: { dates: [] } },
      }),
    ).toEqual([
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

const GUARD = {
  max_daily_loss_usd: 5000,
  max_net_delta_shares: 100,
  max_position_shares: 2000,
  max_daily_hedge_count: 50,
  paper_trade: true,
}

const GATE: GateReadings = {
  allocationName: 'Test Portfolio 1',
  gateName: 'Security Gate',
  gateVersion: 2,
  guard: GUARD,
  openInstances: 3,
  maxPositions: 10,
  lossToday: null,
  paperTrade: true,
}

describe('gateLimitRules', () => {
  it('is empty when no gate applies, rather than a group of dashes', () => {
    expect(gateLimitRules({ ...GATE, gateName: null })).toEqual([])
  })

  it('draws a line for every guard the gate record actually stores', () => {
    expect(gateLimitRules(GATE).map((r) => r.key)).toEqual([
      'gate-open-instances',
      'gate-daily-loss',
      'gate-net-delta',
      'gate-position-shares',
      'gate-daily-hedges',
    ])
    // Unlike every other group, these have a written limit — that is the point.
    expect(gateLimitRules(GATE).every((r) => r.limit != null)).toBe(true)
  })

  it('omits a guard the record does not carry', () => {
    const thin = gateLimitRules({ ...GATE, guard: { max_daily_loss_usd: 5000 } })
    expect(thin.map((r) => r.key)).toEqual(['gate-open-instances', 'gate-daily-loss'])
  })

  it('reads a loss limit as a loss, so a profitable day consumes none of it', () => {
    const profit = gateLimitRules({ ...GATE, lossToday: 1200 }).find((r) => r.key === 'gate-daily-loss')!
    const loss = gateLimitRules({ ...GATE, lossToday: -1200 }).find((r) => r.key === 'gate-daily-loss')!
    expect(profit.current).toBe(0)
    expect(loss.current).toBe(1200)
  })

  it('marks the guards nothing on this side can read, each with its own reason', () => {
    const rules = gateLimitRules(GATE)
    const unread = rules.filter((r) => r.current == null)
    expect(unread.map((r) => r.key)).toEqual(['gate-daily-loss', 'gate-net-delta', 'gate-position-shares', 'gate-daily-hedges'])
    expect(unread.every((r) => r.noReading != null)).toBe(true)
    expect(rules.find((r) => r.key === 'gate-daily-hedges')!.noReading).toContain('D10')
  })

  it('never asks for an acknowledgement — the daemon blocked the action', () => {
    expect(gateLimitRules(GATE).every((r) => !/acknowledge/i.test(r.onBreach) || /nothing to acknowledge/.test(r.onBreach))).toBe(true)
    expect(gateLimitRules(GATE).every((r) => r.kind === 'gate' && r.scope === 'allocation')).toBe(true)
  })

  it('counts the open instances against the allocation’s own ceiling', () => {
    const row = gateLimitRules(GATE).find((r) => r.key === 'gate-open-instances')!
    expect(row.current).toBe(3)
    expect(row.limit).toBe(10)
    expect(withHeadroom([row])[0].use).toBeCloseTo(0.3, 6)
  })
})
