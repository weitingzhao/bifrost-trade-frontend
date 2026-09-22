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
    // The design's cut: the faces are this page's own tabs, in the order the
    // tab strip draws them. Positioning split into Dealer levels and Flow,
    // Forecast became Scenario, and Validation left the grid for the rail.
    expect(DOSSIER_FACES.map((f) => f.id)).toEqual([
      'trend',
      'volatility',
      'dealer',
      'scenario',
      'flow',
      'events',
    ])
    // Every tab face opens its own tab, and the one that is not a tab says so.
    expect(DOSSIER_FACES.filter((f) => f.isTab).map((f) => f.openTo)).toEqual([
      'volatility',
      'dealer',
      'scenario',
      'flow',
      'chain',
    ])
    expect(face('trend').isTab).toBe(false)
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
    // The verdict alone, not `lens · verdict`: the row below names the lens,
    // and the design's headline is the conclusion (Rev 2026-09-18.2).
    expect(v.headline).toBe(labelForBand('iv_rank', 'cold')) // cold beats lean_cold, whatever the order
    expect(v.means).toBe('premium is cheap')
    expect(v.tone).toBe('danger')
    expect(v.coverage).toEqual({ read: 2, of: 4 })
    expect(v.lamp).toBe('yellow')
    expect(v.rows.map((r) => r.id)).toEqual(['iv_rank', 'vrp', 'skew']) // the face's order, not the payload's
    expect(v.rows[0].record).toContain('cold 72%')
    expect(v.rows[0].recordDetail).toContain('cold side hit 5d 72%')
    expect(v.rows[2].verdict).toBe('no reading')
    // Its full reading is a tab of this page, so the link is a tab of this page.
    expect(v.href).toBe('/research/symbol?tab=volatility&symbol=NVDA')
  })

  it('reads as empty before any exhibit lands, and fully green only when every lens is fresh and read', () => {
    expect(faceView(face('scenario'), [], 'NVDA', noSpec)).toMatchObject({
      headline: 'No reading yet',
      // Grey, not red: no reading is not a fault (DESIGN_CONTRACTS 2026-09-13.1).
      lamp: 'gray',
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
    expect(faceView(face('scenario'), all, 'NVDA', noSpec)).toMatchObject({
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
    expect(v).toMatchObject({ headline: NOT_MEASURED, rows: [], coverage: null, lamp: 'gray' })
    expect(v.href).toBe('/research/symbol?tab=chain&symbol=NVDA')
  })

  it('carries the readings that are not lenses, printed as the page handed them over', () => {
    const v = faceView(face('events'), [], 'NVDA', noSpec, {
      rows: [
        { id: 'opex', label: 'OpEx', value: '5 days' },
        { id: 'held', label: 'Held', value: 'not held' },
      ],
    })
    // A gate, not a lens: nothing here is scored, so nothing is coloured, and
    // the record columns are a dash rather than a rate.
    expect(v.headline).toBe('A gate, not a lens')
    expect(v.rows.map((r) => [r.label, r.value, r.band, r.rates])).toEqual([
      ['OpEx', '5 days', null, null],
      ['Held', 'not held', null, null],
    ])
    expect(v.coverage).toBeNull()
  })

  it('prints a lens value in the form the page asked for, and counts it read all the same', () => {
    const exhibits = [
      exhibit('sepa', {
        verdict: { band: 'hot', label: 'Hot', value: 100, unit: 'pct', means: 'setup' },
      }),
    ]
    const v = faceView(face('trend'), exhibits, 'NVDA', noSpec, {
      values: { sepa: '11 / 11' },
      rows: [{ id: 'structure', label: 'Structure · VCP', value: '80.8' }],
    })
    expect(v.rows[0].value).toBe('11 / 11')
    // The override is a form, not a reading: the band, the tone and the count
    // of what was read are untouched by it.
    expect(v.rows[0].band).toBe('hot')
    expect(v.coverage).toEqual({ read: 1, of: 2 })
    expect(v.rows[v.rows.length - 1].label).toBe('Structure · VCP')
  })
})
