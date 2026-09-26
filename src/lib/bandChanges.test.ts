import { describe, expect, it } from 'vitest'
import { bandChanges, earningsChange, formatReadingDisplay, type SymbolExhibitSnapshot } from './bandChanges'

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

describe('earningsChange', () => {
  const at = (asOf: string, earnings: SymbolExhibitSnapshot['earnings']): SymbolExhibitSnapshot => ({
    asOf,
    lenses: [],
    earnings,
  })

  it('counts the days down, grey, outside the gate', () => {
    const row = earningsChange(at('2031-09-24', { date: '2031-11-03', daysAway: 40 }), at('2031-09-25', { date: '2031-11-03', daysAway: 39 }))
    expect(row).toEqual({ lens: 'earnings', label: 'Earnings (est.)', from: '40d', to: '39d', kind: 'within' })
  })

  it('flips, red, on crossing into the 10-day gate', () => {
    const row = earningsChange(at('2031-10-23', { date: '2031-11-03', daysAway: 11 }), at('2031-10-24', { date: '2031-11-03', daysAway: 10 }))
    expect(row).toMatchObject({ from: '11d', to: '10d', kind: 'flip', tone: 'danger' })
  })

  it('flips with both dates when the estimate rolled on after the print', () => {
    const row = earningsChange(at('2031-11-02', { date: '2031-11-03', daysAway: 1 }), at('2031-11-05', { date: '2032-02-02', daysAway: 89 }))
    expect(row).toMatchObject({ from: '1d · 3 Nov', to: '89d · 2 Feb', kind: 'flip' })
    expect(row?.tone).toBeUndefined()
  })

  it('flips when the print goes late', () => {
    expect(earningsChange(at('2031-11-03', { date: '2031-11-03', daysAway: 0 }), at('2031-11-04', { date: '2031-11-03', daysAway: -1 }))).toMatchObject({
      from: '0d',
      to: 'late · ~3 Nov',
      kind: 'flip',
    })
  })

  it('says nothing before both halves exist, or inside one session', () => {
    const cur = at('2031-09-25', { date: '2031-11-03', daysAway: 39 })
    expect(earningsChange(null, cur)).toBeNull()
    expect(earningsChange({ asOf: '2031-09-24', lenses: [] }, cur)).toBeNull()
    expect(earningsChange(at('2031-09-25', { date: '2031-11-03', daysAway: 40 }), cur)).toBeNull()
    expect(earningsChange(at('2031-09-24', null), at('2031-09-25', null))).toBeNull()
  })
})

