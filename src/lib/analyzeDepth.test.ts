import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import {
  calibrationLine,
  fwd20Line,
  hitCellText,
  pinMagnetLine,
  richCheapStrikes,
  skewPercentileText,
  termStructureView,
  vrpLinkLine,
} from './analyzeDepth'

const exhibit = (over: Partial<ExhibitPayload>): ExhibitPayload => ({
  lens: 'skew',
  symbol: 'NVDA',
  as_of: '2026-09-04',
  freshness: 'fresh',
  readings: {},
  history_summary: {},
  caveats: [],
  ...over,
})

describe('C2 depth lines', () => {
  it('reads skew as a percentile of the symbol’s own year', () => {
    expect(skewPercentileText({ slope_pctile_252d: 91.5, history_days: 120 })).toBe(
      '92nd percentile of its own year (120 days)',
    )
    expect(skewPercentileText({ slope_pctile_252d: 3 })).toBe('3rd percentile of its own year')
    expect(skewPercentileText({ slope_pctile_252d: 11 })).toBe('11th percentile of its own year')
    expect(skewPercentileText({ slope_pctile_252d: 0, history_days: 9 })).toBe('bottom of its own year (9 days)')
    expect(skewPercentileText({ slope_pctile_252d: 100 })).toBe('top of its own year')
    expect(skewPercentileText({})).toBeNull()
  })

  it('names the term structure with both legs', () => {
    const v = termStructureView(
      exhibit({
        lens: 'term_slope',
        readings: { backwardation: 0.03, term_structure: 'backwardation', near_vol: 0.418, far_vol: 0.388, near_dte: 28, far_dte: 91 },
      }),
    )
    expect(v?.label).toBe('backwardation')
    expect(v?.line).toBe('Backwardation +3.0 pts — near 41.8% (28d) vs far 38.8% (91d)')
    expect(termStructureView(exhibit({ readings: { backwardation: -0.04, term_structure: 'contango' } }))?.line).toBe('Contango −4.0 pts')
    expect(termStructureView(exhibit({ readings: {} }))).toBeNull()
  })

  it('lists rich and cheap strikes a full z away from the fit', () => {
    const rows = [
      { strike: 220, residual_z: 1.8 },
      { strike: 225, residual_z: 0.4 },
      { strike: 230, residual_z: -2.1 },
      { strike: 235, residual_z: -1.2 },
      { strike: 240, residual_z: 2.5 },
      { strike: null, residual_z: 3 },
      { strike: 370, residual_z: 1.8, log_moneyness: 0.48 },
      { strike: 65, residual_z: -3.5, log_moneyness: -1.26 },
    ].map((r) => ({ symbol: 'NVDA', trade_date: null, expiry: null, log_moneyness: null, iv_market: null, iv_fitted: null, residual: null, computed_at: null, ...r }))
    const { rich, cheap } = richCheapStrikes(rows)
    expect(rich.map((s) => s.strike)).toEqual([240, 220])
    expect(cheap.map((s) => s.strike)).toEqual([230, 235])
  })

  it('states the pin magnet with its record', () => {
    expect(
      pinMagnetLine(
        exhibit({ lens: 'opex_pin', readings: { max_pain_strike: 230, close: 225.7, pin_pct_distance: 0.019 }, history_summary: { cycles: 24, pinned: 4, pin_rate: 4 / 24 } }),
      ),
    ).toBe('Pin magnet 230 (1.9% above spot) · pinned 4 of 24 cycles (17%)')
    expect(
      pinMagnetLine(exhibit({ readings: { max_pain_strike: 220, close: 230.36, pin_pct_distance: 0.045 }, history_summary: { cycles: 1, pinned: 0, pin_rate: 0 } })),
    ).toBe('Pin magnet 220 (4.5% below spot) · pinned 0 of 1 cycles (0%)')
    expect(pinMagnetLine(exhibit({ readings: { max_pain_strike: 230 }, history_summary: { cycles: 0, pin_rate: null } }))).toBe(
      'Pin magnet 230 · no settled cycles yet',
    )
    expect(pinMagnetLine(exhibit({ readings: {} }))).toBeNull()
  })

  it('links the gamma regime to realised vol', () => {
    expect(
      vrpLinkLine(
        exhibit({ lens: 'gex_regime', readings: { regime: 'positive', vrp_link: { rv_20d: 0.241, atm_iv_30d: 0.337, vrp_pct_252d: 21, consistent: true } } }),
      ),
    ).toBe('RV20 24.1% vs IV30 33.7% (VRP 21st pctl) — realised vol sits where the regime says — positive gamma should keep realised below implied')
    expect(vrpLinkLine(exhibit({ readings: { regime: 'negative', vrp_link: { rv_20d: 0.5, atm_iv_30d: 0.3, consistent: true } } }))).toContain('lets realised run over')
    expect(vrpLinkLine(exhibit({ readings: {} }))).toBeNull()
  })

  it('reads the VRP lab’s own 20-session record', () => {
    expect(
      fwd20Line(exhibit({ lens: 'vrp', history_summary: { fwd20_by_band: { hot: { n: 12, median_fwd: 0.0142, share_positive: 0.583 }, cold: { n: 0 } } } })),
    ).toBe('Own record: VRP ≥ 80 → 20d median +1.4%, 58% positive (n=12) · VRP ≤ 20 → no settled readings')
    expect(
      fwd20Line(exhibit({ history_summary: { days: 165, fwd20_by_band: { hot: { n: 0 }, cold: { n: 0 } } } })),
    ).toBe('Own 20d record: no settled readings at either VRP extreme yet (165 days of history)')
    expect(fwd20Line(exhibit({ history_summary: {} }))).toBeNull()
  })

  it('shows the radar row’s own hit rates on its side', () => {
    const records = { NVDA: { hot: { n: 22, evaluated_5d: 22, hit_rate_5d: 0.6154, evaluated_20d: 14, hit_rate_20d: 0.4286 } } }
    expect(hitCellText(records, 'nvda', 'high')).toBe('62% / 43% (n=22)')
    expect(hitCellText(records, 'NVDA', 'low')).toBe('—')
    expect(hitCellText(records, 'NVDA', 'neutral')).toBe('—')
    expect(hitCellText(undefined, 'NVDA', 'high')).toBe('—')
  })

  it('reads the calibration for the regime the playbook is in', () => {
    const rows = [
      { regime: 'range', n: 13, hits: 8, hit_rate: 8 / 13, avg_top_prob: 0.58, calibration_gap: 0.035, avg_close_miss_pct: null },
      { regime: 'trending', n: 0, hits: 0, hit_rate: null, avg_top_prob: null, calibration_gap: null, avg_close_miss_pct: null },
    ]
    expect(calibrationLine(rows, 'Range')).toBe('Paths in range regimes hit 62% of the time against 58% claimed (n=13)')
    expect(calibrationLine(rows, 'trending')).toBeNull()
    expect(calibrationLine(rows, null)).toBeNull()
  })
})
