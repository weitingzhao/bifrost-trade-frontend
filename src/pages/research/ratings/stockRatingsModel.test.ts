import { describe, expect, it } from 'vitest'
import {
  RATING_LENSES,
  SERVER_WEIGHTS,
  WEIGHT_PRESETS,
  composite,
  lensSpread,
  presetOf,
  toRatingRow,
  weightSum,
  type RatingRow,
} from './stockRatingsModel'

const row = (over: Partial<RatingRow['scores']> = {}, rest: Partial<RatingRow> = {}): RatingRow => ({
  symbol: 'X',
  scores: { trend: 80, growth: 60, momentum: 50, structure: 40, ...over },
  serverScore: null,
  grade: null,
  path: null,
  stage: null,
  close: null,
  rangePos: null,
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
    for (const p of WEIGHT_PRESETS) expect(weightSum(p.weights), p.id).toBe(100)
  })

  it('names the preset you are on, and stops naming one once you move', () => {
    expect(presetOf(SERVER_WEIGHTS)).toBe('model')
    expect(presetOf({ ...SERVER_WEIGHTS, trend: 36 })).toBeNull()
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
