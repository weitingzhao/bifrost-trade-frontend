/**
 * The split by tier, and the one line the old page could not write.
 */
import { describe, expect, it } from 'vitest'
import type { LensCoverage } from '@/api/research/lensCoverage'
import {
  coverageMatrix,
  coverageStrip,
  everyFaceBlocker,
  reachBars,
  tierColumns,
  unscreenableRows,
} from './coverageModel'

function cov(
  universe: number,
  reads: Record<string, number | null>,
  over: Partial<LensCoverage> = {},
): LensCoverage {
  return {
    universe,
    tiers: ['resident', 'core', 'edge'],
    lenses: Object.entries(reads).map(([lens, read]) => ({
      lens,
      label: lens === 'iv_rank' ? 'IV Rank' : lens === 'skew' ? 'Skew' : lens,
      face: lens === 'skew' || lens === 'iv_rank' ? 'volatility' : 'trend',
      read,
      of: universe,
      unscreenable: lens === 'skew' ? 'needs a 252-day percentile' : null,
    })),
    every_face: 0,
    no_option_face: 0,
    screenable_lenses: Object.keys(reads).length - 1,
    unscreenable: { skew: 'needs a 252-day percentile' },
    ...over,
  }
}

const ALL = cov(647, { sepa: 572, iv_rank: 628, skew: null, order_sentiment: 0 })
const BY_TIER = {
  resident: cov(22, { sepa: 15, iv_rank: 21, skew: null, order_sentiment: 0 }),
  core: cov(577, { sepa: 515, iv_rank: 573, skew: null, order_sentiment: 0 }),
  edge: cov(48, { sepa: 42, iv_rank: 34, skew: null, order_sentiment: 0 }),
}

describe('the tier split', () => {
  it('gives every tier a column and keeps the whole universe as the last', () => {
    const cols = tierColumns(ALL, BY_TIER)
    expect(cols.map((c) => c.label)).toEqual(['resident', 'core', 'edge', 'all'])
    expect(cols.map((c) => c.universe)).toEqual([22, 577, 48, 647])
  })

  it('shows the gap one number over the universe hides', () => {
    // 97% across everything; 99% of core and 71% of edge. The design's own
    // reason for splitting: those are different problems.
    const cols = tierColumns(ALL, BY_TIER)
    const iv = coverageMatrix(ALL, BY_TIER, cols)
      .flatMap((f) => f.rows)
      .find((r) => r.lens === 'iv_rank')
    expect(iv?.cells.map((c) => c.text)).toEqual(['95%', '99%', '71%', '97%'])
    expect(iv?.cells.map((c) => c.lamp)).toEqual(['green', 'green', 'yellow', 'green'])
  })

  it('greys an unscreenable lens in every tier and carries its reason', () => {
    const cols = tierColumns(ALL, BY_TIER)
    const skew = coverageMatrix(ALL, BY_TIER, cols)
      .flatMap((f) => f.rows)
      .find((r) => r.lens === 'skew')
    expect(skew?.blocked).toBe('needs a 252-day percentile')
    expect(skew?.cells.every((c) => c.lamp === 'gray' && c.text === '—')).toBe(true)
  })

  it('keeps a measured zero red, because that is a reading', () => {
    const cols = tierColumns(ALL, BY_TIER)
    const dead = coverageMatrix(ALL, BY_TIER, cols)
      .flatMap((f) => f.rows)
      .find((r) => r.lens === 'order_sentiment')
    expect(dead?.cells.every((c) => c.lamp === 'red')).toBe(true)
  })

  it('groups by face and reads each face in one line', () => {
    const faces = coverageMatrix(ALL, BY_TIER, tierColumns(ALL, BY_TIER))
    expect(faces.map((f) => f.face)).toEqual(['trend', 'volatility'])
    expect(faces[1].summary).toContain('1 unscreenable')
  })
})

describe('everyFaceBlocker', () => {
  it('names the one lens that makes every_face zero', () => {
    // Without this the zero reads as a coverage disaster; it is one lens.
    expect(everyFaceBlocker(ALL)).toBe(
      'order_sentiment reads nothing, so no symbol can read all 3',
    )
  })

  it('says nothing when the zero has no single cause', () => {
    expect(everyFaceBlocker(cov(10, { sepa: 5, skew: null }))).toBeNull()
    expect(everyFaceBlocker({ ...ALL, every_face: 4 })).toBeNull()
  })
})

describe('reachBars', () => {
  it('splits each tier into every-face, partial and no-option-face', () => {
    const bars = reachBars(
      { ...BY_TIER, edge: { ...BY_TIER.edge, no_option_face: 7 } },
      tierColumns(ALL, BY_TIER),
    )
    expect(bars.map((b) => b.tier)).toEqual(['resident', 'core', 'edge'])
    expect(bars[2]).toMatchObject({ universe: 48, everyFace: 0, noOptionFace: 7, partial: 41 })
  })
})

describe('coverageStrip', () => {
  it('puts the breakdown under every headline, never the headline alone', () => {
    const strip = coverageStrip(ALL, BY_TIER, tierColumns(ALL, BY_TIER))
    expect(strip.map((s) => s.k)).toEqual([
      'Universe',
      'Every face readable',
      'Stock-side only',
      'Screenable lenses',
    ])
    expect(strip[0].note).toBe('resident 22 · core 577 · edge 48')
    // A zero that is the same zero in every tier is a different story from a
    // zero concentrated in one, and the note is where that shows.
    expect(strip[1]).toMatchObject({ v: '0', lamp: 'red' })
    expect(strip[1].note).toBe('0% · resident 0/22 · core 0/577 · edge 0/48')
    expect(strip[3]).toMatchObject({ v: '3 / 4', lamp: 'yellow' })
  })

  it('is empty rather than inventing a reading before one arrives', () => {
    expect(coverageStrip(undefined, {}, [])).toEqual([])
  })
})

describe('unscreenableRows', () => {
  it('resolves each blocked lens to the label the matrix shows', () => {
    expect(unscreenableRows(ALL)).toEqual([
      { lens: 'skew', label: 'Skew', why: 'needs a 252-day percentile' },
    ])
  })
})
