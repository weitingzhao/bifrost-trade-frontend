import { describe, expect, it } from 'vitest'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { labelForBand } from '@/lib/lensVerdict'
import { DOSSIER_FACES, DOSSIER_LENSES, NOT_MEASURED, faceView } from './dossier'

const REGISTRY_LENSES = [
  'iv_rank',
  'iv_percentile',
  'vrp',
  'skew',
  'term_slope',
  'opex_pin',
  'gex_regime',
  'terrain_regime',
  'momentum',
  'sepa',
  'order_sentiment',
  'forecast_path',
]

function exhibit(lens: string, over: Partial<ExhibitPayload> = {}): ExhibitPayload {
  return {
    lens,
    symbol: 'NVDA',
    as_of: '2026-09-08',
    freshness: 'fresh',
    readings: {},
    history_summary: {},
    caveats: [],
    ...over,
  }
}
const record = (n: number, hit: number, side: 'hot' | 'cold' = 'hot') => {
  const hits = { n, evaluated_5d: n, hit_rate_5d: hit, evaluated_20d: n, hit_rate_20d: hit }
  const none = { n: 0, evaluated_5d: 0, hit_rate_5d: null, evaluated_20d: 0, hit_rate_20d: null }
  return {
    lens: 'x',
    window_days: 90,
    symbol_scoped: true,
    n,
    hit_rate_5d: hit,
    hit_rate_20d: hit,
    by_side: side === 'hot' ? { hot: hits, cold: none } : { hot: none, cold: hits },
  }
}
const noSpec = () => undefined
const face = (id: string) => DOSSIER_FACES.find((f) => f.id === id)!

describe('the dossier faces', () => {
  it('fetch every registry lens exactly once between them', () => {
    expect([...DOSSIER_LENSES].sort()).toEqual([...REGISTRY_LENSES].sort())
    expect(DOSSIER_FACES.map((f) => f.id)).toEqual([
      'trend',
      'volatility',
      'positioning',
      'events',
      'forecast',
      'validation',
    ])
  })

  it('lead with the decisive lens, count what was read, and colour the lamp by coverage and freshness', () => {
    const exhibits = [
      exhibit('vrp', {
        verdict: {
          band: 'lean_cold',
          label: 'Lean cold',
          value: 0.2,
          unit: 'x',
          means: 'buying vol is cheap',
        },
      }),
      exhibit('iv_rank', {
        freshness: 'stale',
        verdict: { band: 'cold', label: 'Cold', value: 18, unit: 'pct', means: 'premium is cheap' },
        track_record: record(23, 0.72, 'cold'),
      }),
      exhibit('skew'),
    ]
    const v = faceView(face('volatility'), exhibits, 'NVDA', noSpec)
    expect(v.headline).toBe(`IV Rank · ${labelForBand('iv_rank', 'cold')}`) // cold beats lean_cold, whatever the order
    expect(v.tone).toBe('danger')
    expect(v.coverage).toEqual({ read: 2, of: 6 })
    expect(v.lamp).toBe('yellow')
    expect(v.rows.map((r) => r.id)).toEqual(['iv_rank', 'vrp', 'skew']) // the face's order, not the payload's
    expect(v.rows[0].record).toContain('cold 72%')
    expect(v.rows[0].recordDetail).toContain('cold side hit 5d 72%')
    expect(v.rows[2].verdict).toBe('no reading')
    expect(v.href).toBe('/research/vol-regime?symbol=NVDA')
  })

  it('reads as empty before any exhibit lands, and fully green only when every lens is fresh and read', () => {
    expect(faceView(face('forecast'), [], 'NVDA', noSpec)).toMatchObject({
      headline: 'No reading yet',
      lamp: 'red',
      coverage: { read: 0, of: 2 },
    })
    const all = [
      exhibit('terrain_regime', {
        verdict: { band: 'neutral', label: 'Neutral', value: 0, unit: 'x', means: 'range' },
      }),
      exhibit('forecast_path', {
        verdict: { band: 'hot', label: 'Hot', value: 0.6, unit: 'x', means: 'paths hit' },
      }),
    ]
    expect(faceView(face('forecast'), all, 'NVDA', noSpec)).toMatchObject({
      lamp: 'green',
      coverage: { read: 2, of: 2 },
    })
  })

  it('says a face without a lens is not measured instead of borrowing a reading', () => {
    const v = faceView(
      face('events'),
      [
        exhibit('sepa', {
          verdict: { band: 'hot', label: 'Hot', value: 80, unit: 'x', means: 'setup' },
        }),
      ],
      'NVDA',
      noSpec
    )
    expect(v).toMatchObject({ headline: NOT_MEASURED, rows: [], coverage: null, lamp: 'red' })
    expect(v.href).toBe('/docs/research-calibration?symbol=NVDA')
  })

  it('reports which lenses settled on this symbol instead of re-listing their readings', () => {
    const exhibits = [
      exhibit('sepa', {
        verdict: { band: 'hot', label: 'Hot', value: 80, unit: 'x', means: 'setup' },
        track_record: record(8, 0.33),
      }),
      exhibit('momentum', {
        verdict: { band: 'lean_hot', label: 'Lean hot', value: 66, unit: 'x', means: 'release' },
        track_record: record(0, 0),
      }),
      exhibit('vrp', {
        verdict: { band: 'cold', label: 'Cold', value: 0, unit: 'x', means: 'cheap' },
        track_record: record(23, 0.72, 'cold'),
      }),
      exhibit('gex_regime', {
        verdict: { band: 'hot', label: 'Hot', value: 0, unit: 'x', means: 'chase' },
        track_record: { ...record(5, 0.5), symbol_scoped: false },
      }),
    ]
    const v = faceView(face('validation'), exhibits, 'NVDA', noSpec)
    // No rows: FaceCard renders `record` on every face, so each of these lenses
    // already shows its track record on the face that owns it. Repeating them
    // here put the same eight lines on screen twice.
    expect(v.rows).toEqual([])
    // What only this face knows is the split — settled here versus borrowed
    // from a pooled record — and that is a list of names.
    expect(v.recordScopes?.scoped).toHaveLength(2)
    expect(v.recordScopes?.pooled).toHaveLength(1)
    expect(v.headline).toBe('2 lenses have a settled record on NVDA; 1 reads all symbols')
    expect(v.lamp).toBe('green')
    // A lens with no settled trigger is in neither list — momentum has n=0.
    expect([...(v.recordScopes?.scoped ?? []), ...(v.recordScopes?.pooled ?? [])]).toHaveLength(3)
    expect(faceView(face('validation'), [], 'NVDA', noSpec)).toMatchObject({
      headline: 'No settled track record on NVDA yet',
      lamp: 'yellow',
      recordScopes: { scoped: [], pooled: [] },
    })
  })
})
