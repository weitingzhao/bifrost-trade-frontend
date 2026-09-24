import { describe, expect, it } from 'vitest'
import { DESIGN_FACES } from './designRoutes.generated'
import { PAGE_ROUTES } from '@/layout/routeRegistry'
import { faceOf, hasMethodFace, readingsWithMethod } from './faces'

describe('faceOf', () => {
  it('reads both sides of a pair, and points each at the other', () => {
    const reading = faceOf('/research/symbol')
    expect(reading).toMatchObject({
      side: 'reading',
      reading: '/research/symbol',
      method: '/research/lab/symbol',
      other: '/research/lab/symbol',
    })
    const method = faceOf('/research/lab/symbol')
    expect(method).toMatchObject({ side: 'method', other: '/research/symbol' })
  })

  it('ignores a query and a hash — a face is a page, not a view of one', () => {
    // `/research/symbol?tab=greeks` is still the Symbol page: Greeks and
    // Narrative left the menu as deep links into it (Rev 2026-09-20.6).
    expect(faceOf('/research/symbol?tab=greeks')?.side).toBe('reading')
    expect(faceOf('/research/symbol#top')?.side).toBe('reading')
  })

  it('says nothing for a page with only one face', () => {
    expect(faceOf('/research/compare')).toBeNull()
    // Backtest is a Validate page and always was — it sat in the design's old
    // LAB map, which is how standing on it used to raise a Lab fold for a page
    // that is not one.
    expect(faceOf('/research/backtest')).toBeNull()
    expect(hasMethodFace('/research/backtest')).toBe(false)
  })

  it('only a reading carries the menu mark', () => {
    expect(hasMethodFace('/research/symbol')).toBe(true)
    // The method side is not marked: it is the back of a row, not a row.
    expect(hasMethodFace('/research/lab/symbol')).toBe(false)
    expect(readingsWithMethod()).toEqual(DESIGN_FACES.map((f) => f.reading))
  })

  it('tells the truth about whether the other face is built here', () => {
    const built = new Set(PAGE_ROUTES.map((r) => r.path))
    for (const { reading, method } of DESIGN_FACES) {
      expect(faceOf(reading)?.otherBuilt).toBe(built.has(method))
      expect(faceOf(method)?.otherBuilt).toBe(built.has(reading))
    }
    // The state this side is actually in: the design pairs four readings, and
    // the first method face landed 2026-09-24 — Ratings · Stocks flips to
    // Today's candidates; only the Screener's switch still renders its
    // method half disabled rather than navigating to a route with no page.
    expect(DESIGN_FACES.filter((f) => built.has(f.method)).map((f) => f.method)).toEqual([
      '/research/lab/today',
      '/research/lab/symbol',
      '/research/lab/history',
    ])
  })

  it('is generated, not typed — four pairs, eight distinct routes', () => {
    expect(DESIGN_FACES).toHaveLength(4)
    const all = DESIGN_FACES.flatMap((f) => [f.reading, f.method])
    expect(new Set(all).size).toBe(8)
    // Every method route lives under the reading's own root: same subject,
    // same endpoint, which is the whole argument for the switch being on the
    // page rather than in the tree.
    expect(DESIGN_FACES.every((f) => f.method.startsWith('/research/'))).toBe(true)
  })
})
