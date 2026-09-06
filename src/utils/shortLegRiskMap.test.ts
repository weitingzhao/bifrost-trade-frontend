import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  buildRiskMapLegs,
  fmtDte,
  fmtTickDte,
  fmtTightPct,
  labelTicks,
  layoutRiskMap,
  pointRadius,
  riskMapLegTitle,
  CUSHION_MAX,
  CUSHION_MIN,
  labelPoints,
  PLOT_PAD_Y,
  RIGHT_GUTTER_W,
  type RiskMapLeg,
  type RiskMapTick,
} from './shortLegRiskMap'
import { buildExpiryLadder, type LadderLeg } from './positionsOptionRisk'

type InputLeg = LadderLeg & { instanceKey: string; contractKey: string }

function pin(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

const inputLeg = (o: Partial<InputLeg> = {}): InputLeg => ({
  strike: 100,
  expiry: '20250620',
  right: 'C',
  qty: -1,
  underlying: 'AAA',
  instanceKey: 'inst-1',
  contractKey: 'AAA|OPT|20250620|100|C',
  ...o,
})

const mapLeg = (o: Partial<RiskMapLeg> = {}): RiskMapLeg => ({
  key: 'k',
  instanceKey: 'inst-1',
  symbol: 'AAA',
  right: 'C',
  strike: 100,
  expiry: '20250620',
  dte: 18,
  contracts: 1,
  cushionPct: 0.1,
  ...o,
})

const OPTS = { width: 650, height: 84, tightPct: 0.03 }

describe('buildRiskMapLegs', () => {
  it('keeps short legs only and prices them the way the ladder does', () => {
    pin('2025-06-02T12:00:00')
    const legs = [
      inputLeg({ qty: -3 }),
      inputLeg({ qty: 2, contractKey: 'AAA|OPT|20250620|120|C', strike: 120 }),
      inputLeg({ right: 'P', strike: 90, contractKey: 'AAA|OPT|20250620|90|P' }),
    ]
    const spotOf = () => 95
    const out = buildRiskMapLegs({ legs, spotOf })
    expect(out).toHaveLength(2)
    expect(out[0]?.contracts).toBe(3)
    expect(out[0]?.dte).toBe(18)
    expect(out[0]?.cushionPct).toBeCloseTo(0.05)
    expect(out[1]?.right).toBe('P')
    expect(out[1]?.cushionPct).toBeCloseTo(5 / 90)

    const ladder = buildExpiryLadder(legs, spotOf)
    expect(ladder[0]?.tightestCushionPct).toBeCloseTo(out[0]?.cushionPct as number)
    expect(ladder[0]?.shortContracts).toBe(out.reduce((n, l) => n + l.contracts, 0))
  })

  it('reports no cushion when the underlying has no quote, matching the ladder', () => {
    pin('2025-06-02T12:00:00')
    const legs = [inputLeg(), inputLeg({ underlying: 'BBB', contractKey: 'BBB|OPT|20250620|100|C' })]
    const spotOf = (leg: LadderLeg) => (leg.underlying === 'AAA' ? 110 : null)
    const out = buildRiskMapLegs({ legs, spotOf })
    expect(out.map((l) => l.cushionPct)).toEqual([-0.1, null])
    const ladder = buildExpiryLadder(legs, spotOf)
    expect(ladder[0]?.unpricedShortCount).toBe(out.filter((l) => l.cushionPct == null).length)
    expect(ladder[0]?.itmShortCount).toBe(out.filter((l) => (l.cushionPct ?? 0) < 0).length)
  })

  it('keeps a leg whose expiry will not parse, with dte null — where the ladder drops it', () => {
    pin('2025-06-02T12:00:00')
    const legs = [inputLeg({ expiry: 'soon' })]
    const out = buildRiskMapLegs({ legs, spotOf: () => 90 })
    expect(out).toHaveLength(1)
    expect(out[0]?.dte).toBeNull()
    expect(out[0]?.cushionPct).toBeCloseTo(0.1)
    // Documented divergence: the ladder is chronological and cannot place the
    // row; the map has a gutter for exactly this and keeps it visible.
    expect(buildExpiryLadder(legs, () => 90)).toHaveLength(0)
  })

  it('normalises right, recovers it from the contract key, and drops a leg with no side anywhere', () => {
    pin('2025-06-02T12:00:00')
    const legs = [
      inputLeg({ right: 'put', strike: 90, contractKey: 'AAA|OPT|20250620|90|P' }),
      inputLeg({ right: '', strike: 95, contractKey: 'AAA|OPT|20250620|95|P' }),
      inputLeg({ right: '?', contractKey: 'x' }),
    ]
    const spotOf = () => 100
    const out = buildRiskMapLegs({ legs, spotOf })
    expect(out.map((l) => [l.right, l.strike, l.cushionPct])).toEqual([
      ['P', 90, expect.closeTo(10 / 90, 6)],
      // The row's own right is blank so the ladder cannot price it; the map
      // draws the side from the key but keeps the ladder's verdict: unpriced.
      ['P', 95, null],
    ])
    // Documented divergence: a leg with no side in either field is dropped
    // here because RiskMapLeg.right must be 'C' | 'P', while the ladder counts
    // it as unpriced. The header count can read one lower than the ladder's
    // on that row, and only on that row.
    const ladder = buildExpiryLadder(legs, spotOf)
    expect(ladder[0]?.unpricedShortCount).toBe(2)
    expect(out.filter((l) => l.cushionPct == null)).toHaveLength(1)
  })

  it('keeps keys unique when the same contract appears twice in one instance', () => {
    pin('2025-06-02T12:00:00')
    const out = buildRiskMapLegs({ legs: [inputLeg(), inputLeg()], spotOf: () => 100 })
    expect(new Set(out.map((l) => l.key)).size).toBe(2)
  })
})

describe('layoutRiskMap', () => {
  it('places priced legs by dte and cushion inside the plot area', () => {
    const l = layoutRiskMap(
      [mapLeg({ key: 'a', dte: 0, cushionPct: 0 }), mapLeg({ key: 'b', dte: 40, cushionPct: 0.2 })],
      OPTS,
    )
    expect(l.points).toHaveLength(2)
    const [a, b] = l.points
    expect(a?.x).toBe(l.bands.plot.x0)
    expect(b?.x).toBe(l.bands.plot.x1)
    expect(a?.y).toBe(l.bands.zeroY)
    expect(b?.y).toBeLessThan(a?.y as number)
    expect(a?.x).toBeGreaterThan(0)
    expect(l.bands.rightGutter).toBeNull()
    expect(l.bands.plot.x1).toBeLessThan(OPTS.width)
  })

  it('never draws an unpriced leg in the priced area, whatever its dte', () => {
    const l = layoutRiskMap(
      [mapLeg({ key: 'u', dte: 5, cushionPct: null }), mapLeg({ key: 'p', dte: 5, cushionPct: 0.1 })],
      OPTS,
    )
    expect(l.points.map((p) => p.leg.key)).toEqual(['p'])
    // Listed by name under the plot, never placed in it.
    expect(l.unpriced.map((p) => p.key)).toEqual(['u'])
    expect(l.labels.map((x) => x.key)).toEqual(['p'])
  })

  it('treats a non-finite cushion as unpriced and a non-finite dte as no expiry', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'nan', dte: 5, cushionPct: Number.NaN }),
        mapLeg({ key: 'inf', dte: 5, cushionPct: Number.POSITIVE_INFINITY }),
        mapLeg({ key: 'nand', dte: Number.NaN, cushionPct: 0.1 }),
        mapLeg({ key: 'ok', dte: 5, cushionPct: 0.1 }),
      ],
      OPTS,
    )
    expect(l.points.map((p) => p.leg.key)).toEqual(['ok'])
    expect(l.unpriced.map((p) => p.key).sort()).toEqual(['inf', 'nan'])
    expect(l.noExpiry.map((p) => p.leg.key)).toEqual(['nand'])
    for (const p of [...l.points, ...l.noExpiry]) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
    expect(l.ticks.every((t) => Number.isFinite(t.x))).toBe(true)
  })

  it('orders the unpriced list by dte, nulls last', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'far', dte: 60, cushionPct: null }),
        mapLeg({ key: 'none', dte: null, cushionPct: null }),
        mapLeg({ key: 'near', dte: 2, cushionPct: null }),
      ],
      OPTS,
    )
    expect(l.unpriced.map((p) => p.key)).toEqual(['near', 'far', 'none'])
    // A priced-less leg with no date still lands on the unpriced side.
    expect(l.noExpiry).toHaveLength(0)
    expect(l.bands.rightGutter).toBeNull()
  })

  it('puts priced legs with no expiry in a right gutter at their cushion', () => {
    const l = layoutRiskMap(
      [mapLeg({ key: 'x', dte: null, cushionPct: -0.05 }), mapLeg({ key: 'p', dte: 10, cushionPct: 0.1 })],
      OPTS,
    )
    expect(l.noExpiry).toHaveLength(1)
    const g = l.bands.rightGutter
    expect(g).toEqual({ x0: OPTS.width - RIGHT_GUTTER_W, x1: OPTS.width })
    expect(l.noExpiry[0]?.x).toBeGreaterThan(g?.x0 as number)
    expect(l.noExpiry[0]?.band).toBe('breached')
    expect(l.noExpiry[0]?.clamped).toBeNull()
    expect(l.noExpiry[0]?.y).toBeGreaterThan(l.bands.zeroY)
    expect(l.bands.plot.x1).toBeLessThan(g?.x0 as number)
  })

  it('clamps cushion to the drawn range, says so, and keeps the pinned point off the axis', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'deep', dte: 1, cushionPct: -0.3 }),
        mapLeg({ key: 'edge', dte: 1, cushionPct: CUSHION_MIN }),
        mapLeg({ key: 'far', dte: 1, cushionPct: 0.9 }),
        mapLeg({ key: 'top', dte: 1, cushionPct: CUSHION_MAX }),
        mapLeg({ key: 'deepNoDate', dte: null, cushionPct: -0.3 }),
      ],
      OPTS,
    )
    const by = Object.fromEntries(l.points.map((p) => [p.leg.key, p]))
    expect(by.deep?.y).toBe(by.edge?.y)
    expect(by.deep?.y).toBe(l.bands.plot.y1 - PLOT_PAD_Y)
    expect(by.deep?.y).toBeLessThan(l.bands.plot.y1)
    expect(by.deep?.clamped).toBe('low')
    expect(by.edge?.clamped).toBeNull()
    expect(by.far?.y).toBe(by.top?.y)
    expect(by.far?.y).toBe(l.bands.plot.y0 + PLOT_PAD_Y)
    expect(by.far?.clamped).toBe('high')
    // The right gutter keeps the clamp flag too; it only takes away the x.
    expect(l.noExpiry[0]?.clamped).toBe('low')
    expect(l.noExpiry[0]?.y).toBe(by.deep?.y)
  })

  it('bands the colour on the tight setting and pins past-expiry legs at day 0', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'itm', dte: -2, cushionPct: -0.01 }),
        mapLeg({ key: 'tight', dte: 3, cushionPct: 0.02 }),
        mapLeg({ key: 'ok', dte: 3, cushionPct: 0.05 }),
      ],
      { ...OPTS, tightPct: 0.03 },
    )
    const by = Object.fromEntries(l.points.map((p) => [p.leg.key, p]))
    expect(by.itm?.band).toBe('breached')
    expect(by.itm?.x).toBe(l.bands.plot.x0)
    expect(by.itm?.y).toBeGreaterThan(l.bands.zeroY)
    expect(by.tight?.band).toBe('tight')
    expect(by.ok?.band).toBe('comfortable')

    const wider = layoutRiskMap([mapLeg({ key: 'ok', dte: 3, cushionPct: 0.05 })], { ...OPTS, tightPct: 0.08 })
    expect(wider.points[0]?.band).toBe('tight')
    expect(wider.tightY).toBeLessThan(l.tightY)
  })

  it('draws the tight line between zero and the top of the plot', () => {
    const l = layoutRiskMap([mapLeg()], OPTS)
    expect(l.tightY).toBeLessThan(l.bands.zeroY)
    expect(l.tightY).toBeGreaterThan(l.bands.plot.y0)
  })

  it('emits one tick per expiry with its real dte, past ticks pinned at the left edge', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'a', expiry: '20250620', dte: 18 }),
        mapLeg({ key: 'b', expiry: '20250620', dte: 18 }),
        mapLeg({ key: 'c', expiry: '20250621', dte: 19 }),
        mapLeg({ key: 'd', expiry: '20250815', dte: 74 }),
        mapLeg({ key: 'e', expiry: '20250530', dte: -3 }),
      ],
      OPTS,
    )
    expect(l.ticks.map((t) => [t.expiry, t.dte])).toEqual([
      ['20250530', -3],
      ['20250620', 18],
      ['20250621', 19],
      ['20250815', 74],
    ])
    expect(l.ticks[0]?.x).toBe(l.bands.plot.x0)
    expect(l.ticks[3]?.x).toBe(l.bands.plot.x1)
  })

  it('honours an explicit maxDte and clips the background bands to the domain', () => {
    const short = layoutRiskMap([mapLeg({ dte: 3 })], OPTS)
    expect(short.points[0]?.x).toBe(short.bands.plot.x1)
    expect(short.bands.near.x1).toBe(short.bands.plot.x1)
    expect(short.bands.month.x1).toBe(short.bands.plot.x1)

    const fixed = layoutRiskMap([mapLeg({ dte: 3 })], { ...OPTS, maxDte: 70 })
    const { x0, x1 } = fixed.bands.plot
    expect(fixed.points[0]?.x).toBeCloseTo(x0 + (3 / 70) * (x1 - x0))
    expect(fixed.bands.near.x1).toBeLessThan(fixed.bands.month.x1)
    expect(fixed.bands.month.x1).toBeLessThan(fixed.bands.plot.x1)
    expect(fixed.points[0]?.x).toBeLessThan(fixed.bands.near.x1)
  })

  it('returns an empty layout for no legs without dividing by zero', () => {
    const l = layoutRiskMap([], OPTS)
    expect(l.points).toEqual([])
    expect(l.ticks).toEqual([])
    expect(Number.isFinite(l.tightY)).toBe(true)
    expect(Number.isFinite(l.bands.near.x1)).toBe(true)
  })
})

describe('labelPoints', () => {
  it('names each point beside it and nudges a second name on the same expiry clear of the first', () => {
    const l = layoutRiskMap(
      [
        mapLeg({ key: 'a', symbol: 'NVDA', strike: 245, dte: 76, cushionPct: 0.249 }),
        mapLeg({ key: 'b', symbol: 'NVDA', strike: 255, dte: 76, cushionPct: 0.279 }),
        // A farther leg, so the two above sit mid-plot rather than on the right edge.
        mapLeg({ key: 'far', symbol: 'DAVE', strike: 280, dte: 200, cushionPct: 0.2 }),
      ],
      OPTS,
    )
    const [a, b] = l.labels.filter((x) => x.key !== 'far')
    expect([a?.text, b?.text].sort()).toEqual(['NVDA 245C', 'NVDA 255C'])
    // Two names on one date never share a spot: the second takes the other
    // side of the point, or the next line when both sides are taken.
    const apart = a!.anchor !== b!.anchor || Math.abs(a!.y - b!.y) >= 9
    expect(apart).toBe(true)
    expect(a?.anchor).toBe('start')
  })
  it('flips a name to the left of a point at the right edge, and stays inside the plot', () => {
    const l = layoutRiskMap([mapLeg({ key: 'edge', symbol: 'DAVE', strike: 280, dte: 132, cushionPct: 0.2 })], OPTS)
    const label = l.labels[0]
    expect(label?.anchor).toBe('end')
    expect(label?.x).toBeLessThanOrEqual(l.bands.plot.x1)
    expect(labelPoints([], l.bands.plot)).toEqual([])
  })
})

describe('labelTicks', () => {
  const tick = (x: number, expiry: string): RiskMapTick => ({ dte: x, x, expiry })

  it('unlabels a tick that would overprint the last labelled one', () => {
    expect(labelTicks([tick(100, 'a'), tick(110, 'b'), tick(200, 'c')])).toEqual([true, false, true])
  })

  it('always labels the active expiry and measures the next gap from it', () => {
    expect(labelTicks([tick(100, 'a'), tick(110, 'b'), tick(130, 'c')], 'b')).toEqual([true, true, false])
    expect(labelTicks([], 'b')).toEqual([])
  })
})

describe('pointRadius', () => {
  it('grows with contracts and stays within 3..8', () => {
    expect(pointRadius(1)).toBeGreaterThanOrEqual(3)
    expect(pointRadius(1)).toBeLessThan(pointRadius(5))
    expect(pointRadius(5)).toBeLessThan(pointRadius(20))
    expect(pointRadius(500)).toBe(8)
    expect(pointRadius(0)).toBe(pointRadius(1))
    expect(pointRadius(Number.NaN)).toBe(pointRadius(1))
  })
})

describe('labels', () => {
  it('reads the tight setting as the user typed it', () => {
    expect(fmtTightPct(0.03)).toBe('3%')
    expect(fmtTightPct(0.025)).toBe('2.5%')
    expect(fmtTightPct(0.1)).toBe('10%')
  })

  it('names dte plainly, including past and unknown', () => {
    expect(fmtDte(76)).toBe('76d')
    expect(fmtDte(0)).toBe('0d')
    expect(fmtDte(-3)).toBe('3d past')
    expect(fmtDte(null)).toBe('no expiry')
    expect(fmtDte(Number.NaN)).toBe('no expiry')
    expect(fmtTickDte(-3)).toBe('past')
    expect(fmtTickDte(0)).toBe('0d')
  })

  it('builds the point title in the agreed shape', () => {
    expect(
      riskMapLegTitle(
        mapLeg({ symbol: 'MU', expiry: '20261120', right: 'C', strike: 250, contracts: 3, cushionPct: 0.124, dte: 76 }),
      ),
    ).toBe('MU 20261120 C 250 · 3 contracts · cushion +12.4% · 76d')
    expect(riskMapLegTitle(mapLeg({ contracts: 1, cushionPct: null, dte: 5 }))).toBe(
      'AAA 20250620 C 100 · 1 contract · cushion n/a (no quote) · 5d',
    )
    expect(riskMapLegTitle(mapLeg({ cushionPct: Number.NaN, dte: 5 }))).toContain('cushion n/a (no quote)')
    expect(riskMapLegTitle(mapLeg({ cushionPct: -0.02, dte: null }))).toContain('cushion -2.0% · no expiry')
  })
})
