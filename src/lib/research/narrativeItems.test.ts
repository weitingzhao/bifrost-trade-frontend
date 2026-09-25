/**
 * The two shapes the Stock screen and Symbol read from the narrative window.
 * Fixtures are invented.
 */
import { describe, expect, it } from 'vitest'
import type { NarrativeTag } from '@/api/research/narrative'
import { NARRATIVE_CONDITIONS, namesByCondition, namesPassing, rowsForSymbol } from './narrativeItems'

function tag(p: Partial<NarrativeTag> & Pick<NarrativeTag, 'symbol' | 'accession'>): NarrativeTag {
  return {
    kind: 'event',
    basis: 'sec',
    item: null,
    category: null,
    reading: 'reading',
    quote: '',
    form: '8-K',
    filing_date: '2031-03-11',
    filing_url: null,
    measured: null,
    ...p,
  }
}

const TAGS: NarrativeTag[] = [
  tag({ symbol: 'ZZA', accession: 'a1', item: '2.02', reading: 'Results of operations', quote: 'Item 2.02 …' }),
  tag({ symbol: 'ZZA', accession: 'a1', basis: 'vendor', reading: 'Earnings release' }),
  tag({ symbol: 'ZZB', accession: 'b1', item: '1.01', filing_date: '2031-03-09' }),
  tag({ symbol: 'ZZB', accession: 'b2', item: '5.02', filing_date: '2031-03-10' }),
  // A vendor label calling something "2.02-like" is not an item 2.02.
  tag({ symbol: 'ZZC', accession: 'c1', basis: 'vendor', reading: 'Earnings release', item: null }),
]

describe('namesByCondition', () => {
  const by = namesByCondition(TAGS)

  it('keeps the design’s four conditions, in its order', () => {
    expect(NARRATIVE_CONDITIONS.map((c) => c.id)).toEqual(['n8k_202_7d', 'n8k_101_7d', 'n8k_502_7d', 'n8k_any_7d'])
  })

  it('counts an item condition off SEC items only, and "any" off every filing', () => {
    expect([...(by.get('n8k_202_7d') ?? [])]).toEqual(['ZZA'])
    expect([...(by.get('n8k_101_7d') ?? [])]).toEqual(['ZZB'])
    expect([...(by.get('n8k_any_7d') ?? [])].sort()).toEqual(['ZZA', 'ZZB', 'ZZC'])
  })

  it('passes a name that meets any picked condition, once', () => {
    expect([...namesPassing(by, ['n8k_101_7d', 'n8k_502_7d'])]).toEqual(['ZZB'])
    expect(namesPassing(by, []).size).toBe(0)
  })
})

describe('rowsForSymbol', () => {
  it('gives one row per SEC item, newest first, with the vendor’s label as a second word', () => {
    const rows = rowsForSymbol(TAGS, 'ZZB')
    expect(rows.map((r) => r.item)).toEqual(['5.02', '1.01'])
    const a = rowsForSymbol(TAGS, 'ZZA')
    expect(a).toHaveLength(1)
    expect(a[0].what).toBe('Results of operations — Item 2.02 …')
    expect(a[0].basis).toContain('Earnings release')
  })

  it('keeps a filing only the vendor labelled, marked as the vendor’s word', () => {
    const rows = rowsForSymbol(TAGS, 'ZZC')
    expect(rows).toHaveLength(1)
    expect(rows[0].item).toBeNull()
    expect(rows[0].basis).toMatch(/^vendor classification/)
  })

  it('reads nothing for a name with no filing', () => {
    expect(rowsForSymbol(TAGS, 'ZZD')).toEqual([])
  })
})
