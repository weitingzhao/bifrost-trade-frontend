/**
 * The vol composite's arithmetic, checked against hand-computed numbers.
 *
 * Every row here is invented — the point of these cases is that the algebra
 * is checkable by eye, which a copy of a real DEV row would not be. That the
 * formula matches the *engine* is a separate claim, measured against the live
 * route and recorded in `volRatingsModel.ts`; what this file pins is that the
 * formula does not change underneath that measurement.
 */
import { describe, expect, it } from 'vitest'
import {
  COLD_AT,
  HOT_AT,
  SERVER_PRESETS,
  SERVER_WEIGHTS,
  composite,
  compositeParts,
  flagOf,
  lensReading,
  lensSpread,
  normalizeSigned,
  regimeVariant,
  ruleIndex,
  toVolRow,
  volTape,
  type VolRow,
} from './volRatingsModel'
import type { ScanRow } from '@/api/research/scan'

function scanRow(over: Partial<ScanRow> = {}): ScanRow {
  return {
    trade_date: '2026-01-05',
    symbol: 'TEST',
    close: 100,
    iv_rank_1y: 60,
    vrp_pct_252d: 40,
    atm_slope_30d: 0.05,
    pin_pct_distance: -0.1,
    dte_to_opex: 9,
    zero_gamma_offset: null,
    gex_notional: null,
    terrain_regime: 'range',
    pin_score: 80,
    tail_risk: null,
    trend_release: null,
    composite_score: 55,
    lens_flags: { iv_rank: 'hot', vrp: 'neutral', pin: 'cold' },
    ...over,
  }
}

function row(over: Partial<ScanRow> = {}): VolRow {
  const built = toVolRow(scanRow(over))
  if (!built) throw new Error('fixture has no symbol')
  return built
}

describe('normalizeSigned', () => {
  it('is the engine’s line: 50 at zero, ±200 per unit, saturating at ±0.25', () => {
    expect(normalizeSigned(0)).toBe(50)
    expect(normalizeSigned(0.1)).toBe(70)
    expect(normalizeSigned(-0.1)).toBe(30)
    expect(normalizeSigned(0.25)).toBe(100)
    expect(normalizeSigned(9)).toBe(100)
    expect(normalizeSigned(-9)).toBe(0)
    expect(normalizeSigned(null)).toBeNull()
  })
})

describe('toVolRow', () => {
  it('reads the five lenses onto one scale and keeps the raw readings', () => {
    const r = row()
    expect(r.scores.iv_rank).toBe(60)
    expect(r.scores.vrp).toBe(40)
    expect(r.scores.atm_slope).toBe(60) // 50 + 0.05 × 200
    expect(r.scores.pin).toBe(30) // 50 - 0.1 × 200
    expect(r.scores.terrain).toBe(80) // pin_score, from the terrain table
    expect(r.raw.slope).toBe(0.05)
  })

  it('drops a flag value the engine did not send', () => {
    const r = row({ lens_flags: { iv_rank: 'hot', vrp: 'unheard-of' } })
    expect(r.flags).toEqual({ iv_rank: 'hot' })
  })

  it('has no row without a symbol', () => {
    expect(toVolRow(scanRow({ symbol: '   ' }))).toBeNull()
  })
})

describe('composite', () => {
  it('is the weighted average of the five, at the server’s weights', () => {
    // 60×25 + 40×25 + 60×15 + 30×15 + 80×20 = 1500+1000+900+450+1600 = 5450
    expect(composite(row(), SERVER_WEIGHTS).score).toBeCloseTo(54.5, 10)
  })

  it('leaves a lens the row cannot supply out of both halves', () => {
    const r = row({ iv_rank_1y: null })
    // 1000+900+450+1600 = 3950 over 75 of weight, not over 100
    const out = composite(r, SERVER_WEIGHTS)
    expect(out.score).toBeCloseTo(3950 / 75, 10)
    expect(out.missing).toBe(1)
    expect(out.scoredOn).toBe(4)
  })

  it('substitutes 50 for a missing terrain score, the way the engine does', () => {
    const r = row({ pin_score: null })
    // terrain counts as 50 and its weight stays in the divisor
    expect(composite(r, SERVER_WEIGHTS).score).toBeCloseTo(
      (1500 + 1000 + 900 + 450 + 50 * 20) / 100,
      10,
    )
    expect(composite(r, SERVER_WEIGHTS).missing).toBe(0)
  })

  it('re-ranks when a weight moves — the page’s whole promise', () => {
    const rich = row({ iv_rank_1y: 90, pin_score: 20 })
    const terrainy = row({ symbol: 'OTHER', iv_rank_1y: 20, pin_score: 95 })
    const onIv = { iv_rank: 50, vrp: 0, atm_slope: 0, pin: 0, terrain: 0 }
    const onTerrain = { iv_rank: 0, vrp: 0, atm_slope: 0, pin: 0, terrain: 50 }
    expect(composite(rich, onIv).score).toBeGreaterThan(composite(terrainy, onIv).score!)
    expect(composite(rich, onTerrain).score).toBeLessThan(composite(terrainy, onTerrain).score!)
  })

  it('has no score when every weight is zero', () => {
    const zero = { iv_rank: 0, vrp: 0, atm_slope: 0, pin: 0, terrain: 0 }
    expect(composite(row(), zero).score).toBeNull()
  })
})

describe('compositeParts', () => {
  it('sums to the composite, including when a lens is missing', () => {
    for (const r of [row(), row({ iv_rank_1y: null }), row({ pin_score: null })]) {
      const total = compositeParts(r, SERVER_WEIGHTS).reduce((n, p) => n + (p.points ?? 0), 0)
      expect(total).toBeCloseTo(composite(r, SERVER_WEIGHTS).score!, 10)
    }
  })

  it('lists a lens you turned off with no points rather than hiding it', () => {
    const parts = compositeParts(row(), { ...SERVER_WEIGHTS, pin: 0 })
    const pin = parts.find((p) => p.key === 'pin')!
    expect(pin.weight).toBe(0)
    expect(pin.points).toBeNull()
    expect(parts).toHaveLength(5)
  })
})

describe('flagOf', () => {
  it('cuts where the design cuts', () => {
    expect(flagOf(HOT_AT)).toBe('hot')
    expect(flagOf(HOT_AT - 0.1)).toBe('neutral')
    expect(flagOf(COLD_AT)).toBe('cold')
    expect(flagOf(null)).toBe('neutral')
  })
})

describe('lensSpread', () => {
  it('counts the engine’s own flags and ignores a lens it did not call', () => {
    const rows = [
      row({ lens_flags: { iv_rank: 'hot', vrp: 'cold' } }),
      row({ lens_flags: { iv_rank: 'hot' } }),
      row({ lens_flags: { iv_rank: 'neutral', vrp: 'cold' } }),
    ]
    expect(lensSpread(rows, 'iv_rank')).toEqual({ hot: 2, mid: 1, cold: 0, scored: 3 })
    expect(lensSpread(rows, 'vrp')).toEqual({ hot: 0, mid: 0, cold: 2, scored: 2 })
    expect(lensSpread(rows, 'terrain').scored).toBe(0)
  })
})

describe('volTape', () => {
  it('reads rich, cheap and mixed at the design’s quarter', () => {
    expect(volTape(5, 1, 20).label).toBe('Rich tape')
    expect(volTape(1, 5, 20).label).toBe('Cheap tape')
    expect(volTape(2, 2, 20).label).toBe('Mixed tape')
    expect(volTape(0, 0, 0).label).toBe('Nothing scored')
  })

  it('names the earnings absence rather than dropping the warning', () => {
    expect(volTape(5, 1, 20).sentence).toContain('no earnings calendar')
  })
})

describe('ruleIndex', () => {
  it('indexes active opportunities by symbol and skips the retired ones', () => {
    const index = ruleIndex([
      { strategy_opportunity_id: 3, name: 'Covered call book', symbols: ['aaa', 'BBB'], is_active: true },
      { strategy_opportunity_id: 4, name: 'Old idea', symbols: ['AAA'], is_active: false },
      { strategy_opportunity_id: 5, name: 'Put book', symbols: ['AAA'], is_active: true },
    ])
    expect(index.get('AAA')).toEqual([
      { id: 3, name: 'Covered call book' },
      { id: 5, name: 'Put book' },
    ])
    expect(index.get('BBB')).toEqual([{ id: 3, name: 'Covered call book' }])
    expect(index.has('CCC')).toBe(false)
  })
})

describe('the page’s vocabulary', () => {
  it('prints each lens in its own units', () => {
    const r = row()
    expect(lensReading(r, 'iv_rank')).toBe('60')
    expect(lensReading(r, 'atm_slope')).toBe('0.050')
    expect(lensReading(r, 'pin')).toBe('-10.0%')
    expect(lensReading(r, 'terrain')).toBe('range')
    expect(lensReading(row({ atm_slope_30d: null }), 'atm_slope')).toBe('—')
  })

  it('tags the regimes the engine actually sends', () => {
    expect(regimeVariant('range')).toBe('success')
    expect(regimeVariant('trending')).toBe('warning')
    expect(regimeVariant('crash-risk')).toBe('danger')
    expect(regimeVariant(null)).toBe('neutral')
  })

  it('keeps every server preset summing to 100', () => {
    for (const p of SERVER_PRESETS) {
      const sum = Object.values(p.weights).reduce((n, w) => n + w, 0)
      expect(sum, p.id).toBe(100)
    }
  })
})
