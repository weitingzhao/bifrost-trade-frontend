import { describe, expect, it } from 'vitest'
import {
  FUNNEL_STAGES,
  atLeast,
  chipCount,
  funnelReadings,
  type DistBucket,
} from './screenerFunnel'
import { SCREENER_PRESETS } from './screenerPresets'

// Invented buckets in the endpoint's shape, not a copy of DEV's.
const dist: DistBucket[] = [
  { conditions_passed: 3, symbol_count: 10 },
  { conditions_passed: 2, symbol_count: 20 },
  { conditions_passed: 1, symbol_count: 30 },
  { conditions_passed: 0, symbol_count: 40 },
]

describe('atLeast', () => {
  it('is the tail of the distribution, which is what the min stepper means', () => {
    expect(atLeast(dist, 3)).toBe(10)
    expect(atLeast(dist, 2)).toBe(30)
    expect(atLeast(dist, 0)).toBe(100)
  })

  it('answers every step, not only the two the API pre-sums', () => {
    expect(atLeast(dist, 1)).toBe(60)
  })

  it('is null with no distribution — unknown, never zero', () => {
    expect(atLeast(null, 2)).toBeNull()
    expect(atLeast([], 2)).toBeNull()
  })
})

describe('chipCount', () => {
  it('reads a condition’s own count, and says nothing rather than zero when absent', () => {
    const counts = [{ id: 'sma50_gt_sma150', pass: 2411 }]
    expect(chipCount(counts, 'sma50_gt_sma150')).toBe(2411)
    expect(chipCount(counts, 'fcf_positive')).toBeNull()
    expect(chipCount(undefined, 'anything')).toBeNull()
  })
})

describe('FUNNEL_STAGES', () => {
  it('keeps all seven the design draws, in its order', () => {
    expect(FUNNEL_STAGES.map((s) => s.id)).toEqual([
      'trend',
      'growth',
      'momentum',
      'structure',
      'quality',
      'catalyst',
      'options',
    ])
  })

  it('gives every uncountable stage a reason, not a blank', () => {
    // "no data" is not a reason. A mart still accumulating history and a
    // condition nothing scores are different problems with different answers.
    for (const s of FUNNEL_STAGES) {
      if (s.missing != null) expect(s.missing.length).toBeGreaterThan(40)
    }
    // Momentum is in this list because the radar answers it, even though the
    // tier mart behind the other endpoint does not. A stage is dead only when
    // every source for it is.
    expect(FUNNEL_STAGES.filter((s) => s.missing == null).map((s) => s.id)).toEqual([
      'trend',
      'growth',
      'momentum',
      'catalyst',
    ])
  })

  it('keeps a live stage’s dead chips in place, each with its reason', () => {
    // Catalyst went half live at Rev .43: the four SEC 8-K chips count, the
    // five Event Radar chips still have no source and say why.
    const catalyst = FUNNEL_STAGES.find((s) => s.id === 'catalyst')
    const dead = catalyst?.chips.filter((c) => c.missing != null) ?? []
    expect(dead.map((c) => c.id)).toEqual(['earn_gt_10d', 'earn_10_30d', 'earn_lt_10d', 'news_theme', 'no_event_30d'])
    for (const c of dead) expect(c.missing?.length).toBeGreaterThan(40)
  })

  it('marks the design’s four 8-K conditions as the narrative column, and nothing else', () => {
    const narrative = FUNNEL_STAGES.flatMap((s) => s.chips.filter((c) => c.narrative != null).map((c) => [s.id, c.id]))
    expect(narrative).toEqual([
      ['catalyst', 'n8k_202_7d'],
      ['catalyst', 'n8k_101_7d'],
      ['catalyst', 'n8k_502_7d'],
      ['catalyst', 'n8k_any_7d'],
    ])
  })
})

describe('funnelReadings', () => {
  it('measures every stage against the universe, never against the stage above', () => {
    // The divergence, asserted: the prototype runs an intersection down the
    // column. This side reads each stage on its own, so the second stage's
    // drop is from 5000 and not from 1600 — and nothing claims otherwise.
    const out = funnelReadings(5000, { trend: 1600, growth: 400 })
    expect(out.map((r) => r.n)).toEqual([1600, 400, null, null, null, null, null])
    expect(out[1].dropped).toBe(4600)
    expect(out[2].dropped).toBeNull()
  })

  it('measures the bar against the universe, so the fall is comparable', () => {
    const out = funnelReadings(1000, { trend: 250 })
    expect(out[0].share).toBe(0.25)
  })

  it('reads the first stage against the universe it started from', () => {
    const out = funnelReadings(5000, { trend: 1600 })
    expect(out[0].dropped).toBe(3400)
  })

  it('knows nothing rather than zero when the universe has not answered', () => {
    const out = funnelReadings(null, {})
    expect(out.every((r) => r.n == null && r.dropped == null && r.share == null)).toBe(true)
  })
})

describe('SCREENER_PRESETS', () => {
  it('offers the design’s four, and only greys the ones with no source', () => {
    expect(SCREENER_PRESETS.map((p) => p.label)).toEqual([
      'SEPA Daily Core',
      'Momentum Radar',
      'Event Radar',
      'Premium seller',
    ])
    // The correction this file exists to record: an earlier pass called all
    // four unavailable. Two of them are pages that work today.
    expect(SCREENER_PRESETS.filter((p) => p.load != null).map((p) => p.id)).toEqual([
      'sepa-daily-core',
      'momentum-radar',
    ])
  })

  it('gives every unavailable preset a reason on the row, not a blank', () => {
    for (const p of SCREENER_PRESETS) {
      if (p.load == null) expect(p.missing && p.missing.length).toBeGreaterThan(40)
      else expect(p.missing).toBeNull()
    }
  })
})
