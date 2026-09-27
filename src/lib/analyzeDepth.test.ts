import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import {
  bandFromScore,
  calibrationLine,
  dailyLevelSignals,
  fwd20Line,
  hitCellText,
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

  it('shows a row’s own hit rates only on a side that actually triggers', () => {
    const records = { NVDA: { hot: { n: 22, evaluated_5d: 22, hit_rate_5d: 0.6154, evaluated_20d: 14, hit_rate_20d: 0.4286 } } }
    expect(hitCellText(records, 'nvda', 'hot')).toBe('62% / 43% (n=22)')
    expect(hitCellText(records, 'NVDA', 'cold')).toBe('—')
    // Only hot and cold trigger; a lean reading has no record of its own to show, and
    // used to be handed the hot side's because the coarse bucket called it "High".
    expect(hitCellText(records, 'NVDA', 'lean_hot')).toBe('—')
    expect(hitCellText(records, 'NVDA', 'neutral')).toBe('—')
    expect(hitCellText(records, 'NVDA', null)).toBe('—')
    expect(hitCellText(undefined, 'NVDA', 'hot')).toBe('—')
  })

  it('bands a 0-100 score exactly as the registry does, including at 40 and 60', () => {
    expect(bandFromScore(95)).toBe('hot')
    expect(bandFromScore(80)).toBe('hot')
    expect(bandFromScore(61)).toBe('lean_hot')
    expect(bandFromScore(60)).toBe('neutral')   // inclusive end of neutral on the backend
    expect(bandFromScore(40)).toBe('neutral')   // and the other end
    expect(bandFromScore(39)).toBe('lean_cold')
    expect(bandFromScore(20)).toBe('cold')
    expect(bandFromScore(null)).toBeNull()
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

  it('puts the daily dealer levels the verdict rests on next to the intraday snapshot', () => {
    expect(
      dailyLevelSignals(exhibit({ lens: 'gex_regime', readings: { zero_gamma: 246.2, major_put_wall: 200, major_call_wall: 250 } })),
    ).toEqual([
      { label: 'Daily zero-γ', value: '246' },
      { label: 'Daily walls', value: '200 / 250' },
      { label: 'As of', value: '2026-09-04' },
    ])
    expect(dailyLevelSignals(exhibit({ readings: {} }))).toEqual([])
  })
})
