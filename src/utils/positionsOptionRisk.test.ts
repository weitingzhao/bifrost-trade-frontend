import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  buildExpiryLadder,
  cushionBand,
  expiryBucket,
  normalizeRight,
  shortLegCushion,
  summarizeBreakeven,
  summarizeCushion,
  summarizeExpiry,
  type LadderLeg,
  type OptionLegLike,
} from './positionsOptionRisk'

// daysUntilExpiry counts calendar days, so pin the clock to a known date.
function pin(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

const leg = (o: Partial<OptionLegLike> = {}): OptionLegLike => ({
  strike: 100,
  expiry: '20250620',
  right: 'C',
  qty: -1,
  ...o,
})

describe('normalizeRight', () => {
  it('accepts the spellings the payloads actually carry', () => {
    expect(normalizeRight('C')).toBe('C')
    expect(normalizeRight('put')).toBe('P')
    expect(normalizeRight('CALL')).toBe('C')
    expect(normalizeRight('')).toBeNull()
    expect(normalizeRight(undefined)).toBeNull()
  })
})

describe('summarizeExpiry', () => {
  it('reports the nearest expiry and how many are held', () => {
    pin('2025-06-02T12:00:00')
    const s = summarizeExpiry([
      leg({ expiry: '20250718' }),
      leg({ expiry: '20250620' }),
      leg({ expiry: '20250620' }),
    ])
    expect(s.expiry).toBe('20250620')
    expect(s.dte).toBe(18)
    expect(s.expiryCount).toBe(2)
  })

  it('goes negative once the front expiry has passed', () => {
    pin('2025-06-25T12:00:00')
    expect(summarizeExpiry([leg({ expiry: '20250620' })]).dte).toBe(-5)
  })

  it('does not let an unparsable expiry manufacture urgency', () => {
    pin('2025-06-02T12:00:00')
    const s = summarizeExpiry([leg({ expiry: '' }), leg({ expiry: '20250718' })])
    expect(s.expiry).toBe('20250718')
    expect(s.expiryCount).toBe(1)
  })

  it('returns nothing rather than zero when no leg has a date', () => {
    const s = summarizeExpiry([leg({ expiry: 'n/a' })])
    expect(s.dte).toBeNull()
    expect(s.expiryCount).toBe(0)
  })
})

describe('shortLegCushion', () => {
  it('measures room in the direction that is safe for the seller', () => {
    // Short 100 call, spot 90 → 10% of room above spot before the strike.
    expect(shortLegCushion('C', 100, 90)).toBeCloseTo(0.1, 10)
    // Short 100 put, spot 110 → 10% of room below.
    expect(shortLegCushion('P', 100, 110)).toBeCloseTo(0.1, 10)
  })

  it('goes negative exactly when the strike is breached', () => {
    expect(shortLegCushion('C', 100, 104)).toBeCloseTo(-0.04, 10)
    expect(shortLegCushion('P', 100, 96)).toBeCloseTo(-0.04, 10)
  })

  it('refuses nonsense inputs rather than returning a comfortable number', () => {
    expect(shortLegCushion('C', 0, 90)).toBeNull()
    expect(shortLegCushion('X', 100, 90)).toBeNull()
    expect(shortLegCushion('C', 100, Number.NaN)).toBeNull()
  })
})

describe('summarizeCushion', () => {
  const spots: Record<string, number> = { A: 96 }
  const spotOf = () => spots.A ?? null

  it('reports the tightest short leg, not the average', () => {
    const s = summarizeCushion(
      [leg({ strike: 200, qty: -1 }), leg({ strike: 100, qty: -1 }), leg({ strike: 150, qty: -1 })],
      spotOf,
    )
    // 100 call vs spot 96 → 4%; the 200 leg's comfortable 52% must not mask it.
    expect(s.cushionPct).toBeCloseTo(0.04, 10)
    expect(s.leg?.strike).toBe(100)
    expect(s.spot).toBe(96)
    expect(s.shortLegCount).toBe(3)
  })

  it('ignores long legs — a long going ITM is not a risk', () => {
    const s = summarizeCushion([leg({ strike: 90, qty: 2 }), leg({ strike: 120, qty: -1 })], spotOf)
    expect(s.leg?.strike).toBe(120)
    expect(s.shortLegCount).toBe(1)
    expect(s.itmShortCount).toBe(0)
  })

  it('counts breached shorts', () => {
    const s = summarizeCushion(
      [leg({ strike: 90, qty: -1 }), leg({ strike: 95, qty: -1 }), leg({ strike: 120, qty: -1 })],
      spotOf,
    )
    expect(s.itmShortCount).toBe(2)
    expect(s.cushionPct).toBeCloseTo((90 - 96) / 90, 10)
  })

  it('counts an unpriced short as unpriced, never as safe', () => {
    const s = summarizeCushion([leg({ strike: 100, qty: -1 })], () => null)
    expect(s.cushionPct).toBeNull()
    expect(s.unpricedShortCount).toBe(1)
    expect(s.itmShortCount).toBe(0)
  })

  it('reports no cushion when the group has no short legs', () => {
    const s = summarizeCushion([leg({ qty: 1 }), leg({ qty: 3 })], spotOf)
    expect(s.cushionPct).toBeNull()
    expect(s.shortLegCount).toBe(0)
    expect(s.unpricedShortCount).toBe(0)
  })
})

describe('cushionBand', () => {
  it('separates breached from merely tight, at the line it was given', () => {
    expect(cushionBand(-0.001, 0.03)).toBe('breached')
    expect(cushionBand(0, 0.03)).toBe('tight')
    expect(cushionBand(0.029, 0.03)).toBe('tight')
    expect(cushionBand(0.03, 0.03)).toBe('comfortable')
  })

  it('follows the trader\u2019s line rather than a built-in one', () => {
    expect(cushionBand(0.04, 0.08)).toBe('tight')
    expect(cushionBand(0.04, 0.01)).toBe('comfortable')
  })

  it('never lets the line reclassify a breached strike', () => {
    // In the money is a fact about the strike, not a preference.
    expect(cushionBand(-0.02, 0)).toBe('breached')
    expect(cushionBand(-0.02, 0.5)).toBe('breached')
  })
})

describe('summarizeBreakeven', () => {
  it('picks the breakeven closest to spot, not the first one', () => {
    const s = summarizeBreakeven([120, 180], 175)
    expect(s.nearest).toBe(180)
    expect(s.distancePct).toBeCloseTo((175 - 180) / 180, 10)
  })

  it('sorts what it reports', () => {
    expect(summarizeBreakeven([180, 120], null).prices).toEqual([120, 180])
  })

  it('still gives the prices when spot is unknown', () => {
    const s = summarizeBreakeven([120, 180], null)
    expect(s.nearest).toBe(120)
    expect(s.distancePct).toBeNull()
  })

  it('handles an empty profile', () => {
    expect(summarizeBreakeven([], 100)).toEqual({ prices: [], nearest: null, distancePct: null })
  })
})

describe('buildExpiryLadder', () => {
  const mk = (o: Partial<LadderLeg>): LadderLeg => ({
    strike: 100,
    expiry: '20250620',
    right: 'C',
    qty: -1,
    underlying: 'AAA',
    instanceKey: 'i1',
    ...o,
  })

  it('groups by expiry in chronological order', () => {
    pin('2025-06-02T12:00:00')
    const rows = buildExpiryLadder(
      [mk({ expiry: '20250718' }), mk({ expiry: '20250620' }), mk({ expiry: '20250620' })],
      () => 96,
    )
    expect(rows.map((r) => r.expiry)).toEqual(['20250620', '20250718'])
    expect(rows[0]?.legCount).toBe(2)
    expect(rows[0]?.dte).toBe(18)
  })

  it('keeps short and long contracts apart so a hedge does not net to zero', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder([mk({ qty: -2 }), mk({ qty: 2, strike: 120 })], () => 96)
    expect(row?.shortContracts).toBe(2)
    expect(row?.longContracts).toBe(2)
  })

  it('counts breached shorts and reports the tightest cushion on the date', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder(
      [mk({ strike: 90, qty: -1 }), mk({ strike: 130, qty: -1 })],
      () => 96,
    )
    expect(row?.itmShortCount).toBe(1)
    // 90 call breached by 6/90; the comfortable 130 leg must not mask it.
    expect(row?.tightestCushionPct).toBeCloseTo((90 - 96) / 90, 10)
  })

  it('leaves the cushion unset when every short on the date is unpriced', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder([mk({ qty: -1 })], () => null)
    expect(row?.tightestCushionPct).toBeNull()
  })

  it('has no cushion for an all-long expiry', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder([mk({ qty: 2 })], () => 96)
    expect(row?.tightestCushionPct).toBeNull()
    expect(row?.longContracts).toBe(2)
  })

  it('collects distinct symbols and instances', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder(
      [
        mk({ underlying: 'BBB', instanceKey: 'i1' }),
        mk({ underlying: 'AAA', instanceKey: 'i2' }),
        mk({ underlying: 'AAA', instanceKey: 'i2' }),
      ],
      () => 96,
    )
    expect(row?.symbols).toEqual(['AAA', 'BBB'])
    expect(row?.instanceCount).toBe(2)
  })

  it('drops legs it cannot place on the calendar', () => {
    pin('2025-06-02T12:00:00')
    const rows = buildExpiryLadder([mk({ expiry: '' }), mk({ expiry: '20250620' })], () => 96)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.expiry).toBe('20250620')
  })

  it('marks unpriced shorts instead of calling them safe', () => {
    pin('2025-06-02T12:00:00')
    const [row] = buildExpiryLadder([mk({ qty: -1 })], () => null)
    expect(row?.unpricedShortCount).toBe(1)
    expect(row?.itmShortCount).toBe(0)
  })
})

describe('expiryBucket', () => {
  it('buckets on the boundaries a roll schedule actually uses', () => {
    expect(expiryBucket(-1)).toBe('expired')
    expect(expiryBucket(0)).toBe('this_week')
    expect(expiryBucket(7)).toBe('this_week')
    expect(expiryBucket(8)).toBe('next_week')
    expect(expiryBucket(14)).toBe('next_week')
    expect(expiryBucket(35)).toBe('this_month')
    expect(expiryBucket(36)).toBe('later')
    expect(expiryBucket(null)).toBe('later')
  })
})
