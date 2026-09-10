import { describe, it, expect } from 'vitest'
import {
  labelForBand,
  similarLine,
  toneForBand,
  trackRecordDetail,
  trackRecordLine,
  verdictView,
} from './lensVerdict'
import type { ExhibitPayload } from '@/api/research/exhibit'

const exhibit = (over: Partial<ExhibitPayload>): ExhibitPayload => ({
  lens: 'iv_rank',
  symbol: 'NVDA',
  as_of: '2026-09-04',
  freshness: 'fresh',
  readings: {},
  history_summary: {},
  caveats: [],
  ...over,
})

describe('band → tone', () => {
  it('rich vol is the seller edge, a chasing gamma regime is the risk', () => {
    expect(toneForBand('iv_rank', 'hot')).toBe('success')
    expect(toneForBand('iv_rank', 'cold')).toBe('danger')
    expect(toneForBand('vrp', 'lean_hot')).toBe('warning')
    expect(toneForBand('skew', 'hot')).toBe('danger')
    expect(toneForBand('skew', 'neutral')).toBe('success')
    expect(toneForBand('gex_regime', 'hot')).toBe('danger')
    expect(toneForBand('terrain_regime', 'neutral')).toBe('success')
    expect(toneForBand('opex_pin', 'hot')).toBe('warning')
    expect(toneForBand('iv_rank', null)).toBe('neutral')
    expect(toneForBand('moon_phase', 'hot')).toBe('neutral')
  })
  it('labels come from the band, with a wording fallback for lenses without a table', () => {
    expect(labelForBand('iv_rank', 'hot')).toBe('Sell premium bias')
    expect(labelForBand('vrp', 'cold')).toBe('Buy-vol edge')
    expect(labelForBand('term_slope', 'lean_cold')).toBe('Lean cold')
    expect(labelForBand('iv_rank', null)).toBe('No reading — wait')
    expect(labelForBand('iv_rank', null, 'No IV Rank — wait')).toBe('No IV Rank — wait')
  })
})

describe('verdictView', () => {
  it('reads the exhibit band and means, and marks trigger sides decisive', () => {
    const v = verdictView(
      'iv_rank',
      exhibit({ verdict: { band: 'cold', label: 'Cold', value: 16, unit: 'pct', means: 'premium is cheap' } }),
    )
    expect(v).toMatchObject({ band: 'cold', tone: 'danger', label: 'Buy premium bias', means: 'premium is cheap', decisive: true })
    const none = verdictView('order_sentiment', exhibit({ verdict: null, caveats: ['No options trades tape'] }))
    expect(none).toMatchObject({ band: null, tone: 'neutral', means: 'No options trades tape', decisive: false })
    expect(verdictView('vrp', undefined).label).toBe('No reading — wait')
  })
})

describe('evidence lines', () => {
  it('quotes the side and the scope, keeps every rate with its own n, and defers the pipeline', () => {
    const tr = {
      lens: 'iv_rank',
      window_days: 90,
      symbol_scoped: false,
      n: 20,
      hit_rate_5d: 0.5,
      hit_rate_20d: null,
      by_side: {
        hot: { n: 6, evaluated_5d: 6, hit_rate_5d: 0.6667, evaluated_20d: 0, hit_rate_20d: null },
        cold: { n: 14, evaluated_5d: 12, hit_rate_5d: 0.4167, evaluated_20d: 10, hit_rate_20d: 0.6 },
      },
    }
    // Each rate carries the count it was computed over. The old line printed the
    // trigger count beside both, so the cold side read "(n=14)" next to a 20d rate
    // computed over 10 — and the hot side's "20d —" over 0 looked like a sample of 6.
    // The caption keeps the rates, each with its own denominator, and the scope.
    // At these sample sizes a rate without its `n` would be the cheapest kind of
    // wrong — 60% over ten is not 60% over three hundred.
    expect(trackRecordLine(tr, 'cold')).toBe('cold 42% (n=12) · 60% (n=10) · all symbols')
    expect(trackRecordLine(tr, 'hot')).toBe('hot 67% (n=6) · — (n=0) · all symbols')

    // What moved to the hover is the pipeline behind the rates, and nothing is
    // only there: the detail still says everything the caption used to.
    expect(trackRecordDetail(tr, 'cold')).toContain('14 triggers')
    expect(trackRecordDetail(tr, 'cold')).toContain('4 still inside their forward window')
    expect(trackRecordDetail(tr, 'cold')).toContain('90d window')
    expect(trackRecordDetail(tr, 'cold')).toContain('5d 42% (n=12)')
    expect(trackRecordDetail(tr, 'cold')).toContain('all symbols')
    expect(trackRecordDetail(null, 'hot')).toBeNull()
    expect(trackRecordLine({ ...tr, n: 0 }, 'hot')).toBeNull()
    const hotEmpty = { ...tr, by_side: { ...tr.by_side, hot: { n: 0, evaluated_5d: 0, hit_rate_5d: null, evaluated_20d: 0, hit_rate_20d: null } } }
    // "nothing fired" is not a rate, so it reads the same in both forms.
    expect(trackRecordLine(hotEmpty, 'neutral')).toBe('hot side: no triggers in 90d (all symbols)')
    expect(trackRecordDetail(hotEmpty, 'neutral')).toBe('hot side: no triggers in 90d (all symbols)')
    expect(trackRecordLine(null, 'hot')).toBeNull()
  })
  it('summarises resolved neighbours only', () => {
    const sim = { lens: 'iv_rank', source: 't', horizon: 5, n: 8, n_resolved: 5, median_fwd: 0.026318, p25_fwd: -0.04, p75_fwd: 0.04, share_positive: 0.6 }
    expect(similarLine(sim)).toBe('similar readings: median +2.6% over 5d, 60% positive (n=5)')
    expect(similarLine({ ...sim, n_resolved: 0 })).toBeNull()
  })
})
