import { describe, expect, it } from 'vitest'
import { SLICE, sliceOf, stageState } from './slice'
import { PAGE_ROUTES } from './routeRegistry'

describe('the vertical slice', () => {
  it('reads the five stages in the design’s order', () => {
    expect(SLICE.map((s) => s.label)).toEqual(['Analyze', 'Plan', 'Order', 'Position', 'Review'])
  })

  it('places a page by its own route, and its sibling views with it', () => {
    expect(sliceOf('/research/symbol')).toBe(0)
    expect(sliceOf('/research/compare')).toBe(0)
    expect(sliceOf('/trade/plans')).toBe(1)
    expect(sliceOf('/trade/fills')).toBe(2)
    expect(sliceOf('/portfolio/positions')).toBe(3)
    expect(sliceOf('/review/fit')).toBe(4)
    expect(sliceOf('/review')).toBe(4)
  })

  it('counts a prefix only at a path boundary, and leaves the rest of the app off the slice', () => {
    expect(sliceOf('/review/queue')).toBe(4)
    expect(sliceOf('/review/fitness')).toBe(4) // by /review, not by /review/fit
    expect(sliceOf('/research/symbolic')).toBe(-1)
    expect(sliceOf('/portfolio/backing')).toBe(-1)
    expect(sliceOf('/research/overview')).toBe(-1)
  })

  it('names each stage against the current one', () => {
    expect([0, 1, 2, 3, 4].map((i) => stageState(i, 2))).toEqual([
      'done',
      'done',
      'current',
      'next',
      'future',
    ])
  })

  it('sends every chip to a page this app routes', () => {
    // Not `routeFor(...).label`: that answers with a fallback for any path.
    const routed = new Set(PAGE_ROUTES.map((r) => r.path))
    for (const s of SLICE) expect(routed.has(s.to), s.to).toBe(true)
  })
})
