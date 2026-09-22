/**
 * The Overview rail's ranking, and the three facts it must not blur.
 *
 * Every payload here is invented. What is real, and recorded in
 * `symbolRecord.ts` rather than here, is that DEV answers `symbol_scoped:
 * false` on every lens — which is why `scopedCount` exists at all.
 */
import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { THIN_SAMPLE, symbolRecord } from './symbolRecord'

function exhibit(
  lens: string,
  over: {
    band?: string | null
    hit?: number | null
    n?: number
    side?: 'hot' | 'cold'
    scoped?: boolean
  } = {},
): ExhibitPayload {
  const { band = 'hot', hit = 0.6, n = 40, side = 'hot', scoped = false } = over
  const live = { n, evaluated_5d: n, hit_rate_5d: hit, evaluated_20d: n, hit_rate_20d: hit }
  const none = { n: 0, evaluated_5d: 0, hit_rate_5d: null, evaluated_20d: 0, hit_rate_20d: null }
  return {
    lens,
    symbol: 'NVDA',
    as_of: '2026-01-05',
    freshness: 'fresh',
    readings: {},
    history_summary: {},
    caveats: [],
    verdict: band == null ? null : { band, label: 'Label', value: 1, unit: 'x', means: 'means' },
    track_record: {
      lens,
      window_days: 90,
      symbol_scoped: scoped,
      n,
      hit_rate_5d: hit,
      hit_rate_20d: hit,
      by_side: side === 'hot' ? { hot: live, cold: none } : { hot: none, cold: live },
    },
  } as ExhibitPayload
}

const noSpec = () => undefined

describe('symbolRecord', () => {
  it('ranks by the 20-day rate, best first', () => {
    const out = symbolRecord(
      [
        exhibit('iv_rank', { hit: 0.42 }),
        exhibit('gex_regime', { hit: 0.81 }),
        exhibit('vrp', { hit: 0.55 }),
      ],
      'NVDA',
      noSpec,
    )
    expect(out.rows.map((r) => r.id)).toEqual(['gex_regime', 'vrp', 'iv_rank'])
    expect(out.rows[0].hit).toBeCloseTo(0.81, 10)
  })

  it('reads the side the lens is sitting on, not the side with a record', () => {
    // Cold band, and only the cold side has settled triggers: a lens sitting
    // cold is judged on its cold triggers.
    const out = symbolRecord(
      [exhibit('vrp', { band: 'cold', side: 'cold', hit: 0.7, n: 30 })],
      'NVDA',
      noSpec,
    )
    expect(out.rows).toHaveLength(1)
    // The same lens with a hot band has no hot-side record, so it is unsettled
    // rather than borrowing the cold side's rate.
    const flipped = symbolRecord(
      [exhibit('vrp', { band: 'hot', side: 'cold', hit: 0.7, n: 30 })],
      'NVDA',
      noSpec,
    )
    expect(flipped.rows).toHaveLength(0)
    expect(flipped.unsettled).toEqual(['VRP'])
  })

  it('marks a thin sample without moving it down the list', () => {
    const out = symbolRecord(
      [
        exhibit('sepa', { hit: 1, n: THIN_SAMPLE - 1 }),
        exhibit('gex_regime', { hit: 0.8, n: 400 }),
      ],
      'NVDA',
      noSpec,
    )
    // 100% on n=9 genuinely tops the rate column; the amber says not to
    // believe it. Sorting it down would hide the sample problem in the order.
    expect(out.rows.map((r) => [r.id, r.thin])).toEqual([
      ['sepa', true],
      ['gex_regime', false],
    ])
  })

  it('separates a lens with no reading from one whose record never settled', () => {
    const out = symbolRecord(
      [
        // Read, but nothing settled at 20 days.
        exhibit('terrain_regime', { hit: null, n: 0 }),
        // Never read at all — the faces above already say so.
        exhibit('forecast_path', { band: null, hit: null, n: 0 }),
      ],
      'NVDA',
      noSpec,
    )
    expect(out.rows).toEqual([])
    // Labels, because the panel prints them in a sentence.
    expect(out.unsettled).toEqual(['Terrain'])
  })

  it('counts how many of the records are this symbol’s own', () => {
    const out = symbolRecord(
      [exhibit('iv_rank', { scoped: true }), exhibit('vrp', { scoped: false })],
      'NVDA',
      noSpec,
    )
    expect(out.scopedCount).toBe(1)
    expect(symbolRecord([exhibit('vrp')], 'NVDA', noSpec).scopedCount).toBe(0)
  })
})
