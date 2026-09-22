import { describe, expect, it } from 'vitest'
import {
  RATING_LENSES,
  SERVER_WEIGHTS,
  WEIGHT_PRESETS,
  GROWTH_CHECKS,
  TREND_CHECKS,
  composite,
  compositeParts,
  flagOf,
  lensSpread,
  pathVariant,
  ratingsTape,
  toRatingRow,
  type RatingRow,
} from './stockRatingsModel'
import { presetOf, weightSum } from '@/components/research/weightModel'

const row = (over: Partial<RatingRow['scores']> = {}, rest: Partial<RatingRow> = {}): RatingRow => ({
  symbol: 'X',
  scores: { trend: 80, growth: 60, momentum: 50, structure: 40, ...over },
  serverScore: null,
  grade: null,
  path: null,
  stage: null,
  close: null,
  rangePos: null,
  passes: { trend: null, growth: null },
  ...rest,
})

describe('composite', () => {
  it('reproduces the server’s own score at the server’s own weights', () => {
    // The page has to open agreeing with sepa_score, or every move away from
    // it is measured against a number nobody recognises.
    const r = row({ trend: 100, growth: 75, momentum: 60, structure: 80.8307 })
    const { score } = composite(r, SERVER_WEIGHTS)
    const expected = (100 * 35 + 75 * 30 + 60 * 20 + 80.8307 * 15) / 100
    expect(score).toBeCloseTo(expected, 6)
  })

  it('leaves an unscored lens out of both halves, never counting it as zero', () => {
    // A name with no fundamental reading is not a name with bad fundamentals.
    const noGrowth = composite(row({ growth: null }), SERVER_WEIGHTS)
    const asZero = (80 * 35 + 0 * 30 + 50 * 20 + 40 * 15) / 100
    expect(noGrowth.score).not.toBeCloseTo(asZero, 3)
    expect(noGrowth.score).toBeCloseTo((80 * 35 + 50 * 20 + 40 * 15) / 70, 6)
    expect(noGrowth.scoredOn).toBe(3)
  })

  it('keeps a three-lens row on the same scale as a four-lens one', () => {
    // Both are 0–100, so they can sit in one ranked list without the thinner
    // row being pushed down for being thin.
    const all80 = composite(row({ trend: 80, growth: 80, momentum: 80, structure: 80 }), SERVER_WEIGHTS)
    const three80 = composite(row({ trend: 80, growth: null, momentum: 80, structure: 80 }), SERVER_WEIGHTS)
    expect(all80.score).toBeCloseTo(80, 6)
    expect(three80.score).toBeCloseTo(80, 6)
  })

  it('ignores a lens whose weight is zero, and answers null when all are', () => {
    const off = composite(row(), { trend: 0, growth: 0, momentum: 0, structure: 0 })
    expect(off.score).toBeNull()
    expect(off.scoredOn).toBe(0)
  })

  it('does not call a lens you turned off a lens the name is missing', () => {
    // The first version conflated the two, and dropping one weight to zero
    // put the "incomplete" mark on all five hundred rows — a mark that says
    // nothing about any of them. Found by moving the slider.
    const noGrowthWeight = composite(row(), { ...SERVER_WEIGHTS, growth: 0 })
    expect(noGrowthWeight.missing).toBe(0)

    const noGrowthScore = composite(row({ growth: null }), SERVER_WEIGHTS)
    expect(noGrowthScore.missing).toBe(1)

    // And a lens both unweighted and unscored is still not missing.
    expect(composite(row({ growth: null }), { ...SERVER_WEIGHTS, growth: 0 }).missing).toBe(0)
  })
})

describe('the weights themselves', () => {
  it('every preset sums to 100, so two composites are comparable', () => {
    for (const p of WEIGHT_PRESETS) expect(weightSum(RATING_LENSES, p.weights), p.id).toBe(100)
  })

  it('names the preset you are on, and stops naming one once you move', () => {
    expect(presetOf(WEIGHT_PRESETS, RATING_LENSES, SERVER_WEIGHTS)).toBe('model')
    expect(
      presetOf(WEIGHT_PRESETS, RATING_LENSES, { ...SERVER_WEIGHTS, trend: 36 }),
    ).toBeNull()
  })

  it('opens on the server’s weights', () => {
    expect(WEIGHT_PRESETS[0].id).toBe('model')
    expect(WEIGHT_PRESETS[0].weights).toEqual(SERVER_WEIGHTS)
  })
})

describe('toRatingRow', () => {
  it('reads the four lenses and where the close sits in its own year', () => {
    const r = toRatingRow({
      symbol: 'amd',
      trend_template_score: 100,
      fundamental_score: 75,
      momentum_score: 60,
      structure_score: 80,
      sepa_score: 81.6,
      latest_close: 150,
      low_52w: 100,
      high_52w: 200,
    })
    expect(r).toMatchObject({ symbol: 'AMD', serverScore: 81.6, rangePos: 0.5 })
    expect(r?.scores).toEqual({ trend: 100, growth: 75, momentum: 60, structure: 80 })
  })

  it('has no range when the year has no width, and no row without a symbol', () => {
    expect(toRatingRow({ symbol: 'A', latest_close: 5, low_52w: 5, high_52w: 5 })?.rangePos).toBeNull()
    expect(toRatingRow({ symbol: '  ' })).toBeNull()
  })
})

describe('lensSpread', () => {
  it('counts a lens three ways and says how many it could read at all', () => {
    const rows = [
      row({ trend: 90 }),
      row({ trend: 50 }),
      row({ trend: 10 }),
      row({ trend: null }),
    ]
    expect(lensSpread(rows, 'trend')).toEqual({ hot: 1, mid: 1, cold: 1, scored: 3 })
  })
})

describe('RATING_LENSES', () => {
  it('is the four the model combines, in the design’s reading order', () => {
    expect(RATING_LENSES.map((l) => l.key)).toEqual(['trend', 'growth', 'momentum', 'structure'])
  })
})


describe('the checklists behind the two scores that have one', () => {
  it('reads the pass counts the row reports', () => {
    const r = toRatingRow({
      symbol: 'x',
      trend_template_score: 81.8182,
      tech_pass_count: 9,
      fundamental_score: 37.5,
      fund_pass_count: 3,
    })
    expect(r?.passes).toEqual({ trend: 9, growth: 3 })
  })

  it('keeps the count absent rather than deriving it from the score', () => {
    // The two agree on DEV — 9/11 is 81.8182 — but a score without its count
    // is a score, and inventing `Math.round(v / 100 * 11)` would print a
    // checklist result nobody counted.
    const r = toRatingRow({ symbol: 'x', trend_template_score: 81.8182 })
    expect(r?.passes.trend).toBeNull()
    expect(r?.scores.trend).toBeCloseTo(81.8182, 4)
  })

  it('counts eleven trend checks and eight fundamental ones', () => {
    expect([TREND_CHECKS, GROWTH_CHECKS]).toEqual([11, 8])
  })
})

describe('flagOf', () => {
  it('cuts hot at 70 and cold at 35, and calls the gap neutral', () => {
    expect(flagOf(70)).toBe('hot')
    expect(flagOf(69.9)).toBe('neutral')
    expect(flagOf(35)).toBe('cold')
    expect(flagOf(35.1)).toBe('neutral')
  })

  it('does not call an unscored name cold', () => {
    // No composite is not a bad composite.
    expect(flagOf(null)).toBe('neutral')
  })
})

describe('pathVariant', () => {
  it('colours by what the model says to do', () => {
    expect(pathVariant('PIVOT')).toBe('success')
    expect(pathVariant('SETUP')).toBe('info')
    expect(pathVariant('AVOID')).toBe('danger')
    expect(pathVariant('WATCH')).toBe('neutral')
    expect(pathVariant(null)).toBe('neutral')
  })
})

describe('ratingsTape', () => {
  it('calls breadth constructive at a quarter of the set', () => {
    expect(ratingsTape(5, 0, 20).label).toBe('Constructive tape')
    expect(ratingsTape(4, 0, 20).label).toBe('Mixed tape')
  })

  it('has a floor of three, so a tiny set does not read as breadth', () => {
    expect(ratingsTape(2, 0, 4).label).toBe('Mixed tape')
    expect(ratingsTape(3, 0, 4).label).toBe('Constructive tape')
  })

  it('says so when nothing is scored rather than reading as mixed', () => {
    expect(ratingsTape(0, 0, 0).label).toBe('Nothing scored')
  })

  it('names the counts it read the verdict from', () => {
    expect(ratingsTape(1, 1, 10).sentence).toContain('1 strong · 1 weak of 10')
  })
})

describe('compositeParts', () => {
  it('splits the composite into points that add back up to it', () => {
    const r = row({ trend: 80, growth: 60, momentum: 40, structure: 20 })
    const w = { trend: 40, growth: 30, momentum: 20, structure: 10 }
    const parts = compositeParts(r, w)
    const total = parts.reduce((a, p) => a + (p.points ?? 0), 0)
    expect(total).toBeCloseTo(composite(r, w).score ?? 0, 10)
  })

  it('leaves a missing lens without points and still adds up', () => {
    const r = row({ growth: null })
    const w = { trend: 40, growth: 30, momentum: 20, structure: 10 }
    const parts = compositeParts(r, w)
    expect(parts.find((p) => p.key === 'growth')?.points).toBeNull()
    const total = parts.reduce((a, p) => a + (p.points ?? 0), 0)
    expect(total).toBeCloseTo(composite(r, w).score ?? 0, 10)
  })

  it('lists a lens you turned off rather than hiding it', () => {
    const parts = compositeParts(row(), { trend: 100, growth: 0, momentum: 0, structure: 0 })
    const growth = parts.find((p) => p.key === 'growth')
    expect(growth?.weight).toBe(0)
    expect(growth?.points).toBeNull()
    expect(parts).toHaveLength(4)
  })
})
