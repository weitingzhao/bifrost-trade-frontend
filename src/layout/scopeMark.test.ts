/**
 * The trailing marks on a sidebar row: the unit of analysis, and whether the
 * page has a method face.
 */
import { describe, expect, it } from 'vitest'
import { DESIGN_SCOPE } from '@/lib/design/designRoutes.generated'
import { hasMethodFace } from '@/lib/design/faces'
import { PAGE_ROUTES } from './routeRegistry'

describe('the unit mark', () => {
  it('is read from the design, not from a copy of it', () => {
    // The route table still carries a hand-typed `scope`, and it is now only
    // the fallback for pages the design has no row for. When this side and
    // the design disagree about a page they both carry, the design wins and
    // the stale copy should be deleted rather than left to be read by
    // accident — so any disagreement fails here.
    for (const r of PAGE_ROUTES) {
      const theirs = DESIGN_SCOPE[r.path]
      if (!theirs || !r.scope) continue
      expect(r.scope, `${r.path}: this side says ${r.scope}, the design says ${theirs}`).toBe(theirs)
    }
  })

  it('covers the four Discover leaves the design names', () => {
    // `Stock ratings ⧉ stk · Vol ratings opt · Stock screen ⧉ stk ·
    // Option screen opt` — the design's own line (DECISIONS 2026-09-23).
    // Two of the four were unmarked while the other two were not, which is
    // worse than none: an absent mark read as "this page has no unit".
    expect(DESIGN_SCOPE['/research/ratings/stocks']).toBe('underlying')
    expect(DESIGN_SCOPE['/research/scan']).toBe('contract')
    expect(DESIGN_SCOPE['/research/screener']).toBe('underlying')
    expect(DESIGN_SCOPE['/research/contract-screener']).toBe('contract')
  })

  it('says what a row *answers*, not where its data comes from', () => {
    // Vol ratings reads the option chain and answers per contract; Vol Regime
    // reads the same chain and answers once per symbol. The mark follows the
    // answer, which is the whole reason it is worth drawing.
    expect(DESIGN_SCOPE['/research/vol-regime']).toBe('underlying')
    expect(DESIGN_SCOPE['/research/scan']).toBe('contract')
  })
})

describe('the method-face mark', () => {
  it('rides the readings that have one, and nothing else', () => {
    const marked = Object.keys(DESIGN_SCOPE).filter((p) => hasMethodFace(p))
    expect(marked.sort()).toEqual([
      '/research/history',
      '/research/ratings/stocks',
      '/research/screener',
      '/research/symbol',
    ])
  })

  it('never rides the method side — that page is the face, not its owner', () => {
    for (const p of ['/research/lab/today', '/research/lab/screener', '/research/lab/symbol']) {
      expect(hasMethodFace(p), p).toBe(false)
    }
  })
})
