import { describe, expect, it } from 'vitest'
import { bandChanges, formatReadingDisplay, type SymbolExhibitSnapshot } from './bandChanges'

function snap(
  asOf: string | null,
  lenses: { lens: string; band: 'hot' | 'cold' | 'neutral' | null; display: string }[],
): SymbolExhibitSnapshot {
  return { asOf, lenses }
}

describe('formatReadingDisplay', () => {
  it('prefers a finite number with unit', () => {
    expect(formatReadingDisplay({ band: 'hot', value: 82.4, unit: '%' })).toBe('82%')
  })

  it('falls back to the band label then the band id', () => {
    expect(formatReadingDisplay({ band: 'hot', label: 'Sell premium bias' })).toBe('Sell premium bias')
    expect(formatReadingDisplay({ band: 'cold' })).toBe('cold')
  })
})

describe('bandChanges', () => {
  it('returns nothing without a prior snapshot', () => {
    expect(bandChanges(null, snap('2026-09-14', [{ lens: 'iv_rank', band: 'hot', display: '82' }]))).toEqual([])
  })

  it('returns nothing when as_of has not advanced', () => {
    const prior = snap('2026-09-14', [{ lens: 'iv_rank', band: 'cold', display: '20' }])
    const cur = snap('2026-09-14', [{ lens: 'iv_rank', band: 'hot', display: '82' }])
    expect(bandChanges(prior, cur)).toEqual([])
  })

  it('lists band flips before within-band moves', () => {
    const prior = snap('2026-09-11', [
      { lens: 'iv_rank', band: 'cold', display: '18' },
      { lens: 'vrp', band: 'hot', display: '70' },
      { lens: 'terrain', band: 'neutral', display: 'Range' },
    ])
    const cur = snap('2026-09-14', [
      { lens: 'iv_rank', band: 'hot', display: '82' },
      { lens: 'vrp', band: 'hot', display: '75' },
      { lens: 'terrain', band: 'neutral', display: 'Range' },
    ])
    const rows = bandChanges(prior, cur)
    expect(rows.map((r) => r.lens)).toEqual(['iv_rank', 'vrp'])
    expect(rows[0]).toMatchObject({ kind: 'flip', from: '18', to: '82' })
    expect(rows[1]).toMatchObject({ kind: 'within', from: '70', to: '75' })
  })

  it('treats terrain and terrain_regime as the same lens', () => {
    const prior = snap('2026-09-11', [{ lens: 'terrain_regime', band: 'hot', display: 'Trending' }])
    const cur = snap('2026-09-14', [{ lens: 'terrain', band: 'neutral', display: 'Range' }])
    expect(bandChanges(prior, cur)).toEqual([
      expect.objectContaining({ lens: 'terrain', kind: 'flip', from: 'Trending', to: 'Range' }),
    ])
  })
})
