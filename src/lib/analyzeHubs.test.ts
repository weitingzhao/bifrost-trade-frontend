import { describe, expect, it } from 'vitest'
import {
  LAB_VIEW_HUB,
  RETIRED_ANALYZE_PATHS,
  flowHref,
  labHref,
  redirectTarget,
  LAB_VIEW_LENS,
  type LabViewId,
} from './analyzeHubs'

describe('analyze hubs', () => {
  it('builds Symbol tab links from the view id alone', () => {
    // The point of the indirection: the hubs became tabs on one page and not
    // one of the thirty-odd call sites changed. A view is now a tab plus the
    // section anchor it used to be a page of.
    expect(labHref('iv-rank')).toBe('/research/symbol?tab=volatility#iv-rank')
    expect(labHref('gex', 'NVDA')).toBe('/research/symbol?tab=dealer&symbol=NVDA#gex')
    expect(labHref('playbook', 'spy')).toBe('/research/symbol?tab=scenario&symbol=SPY#playbook')
    expect(flowHref('NVDA', 'multi-leg')).toBe('/research/symbol?tab=flow&symbol=NVDA#multi-leg')
    expect(flowHref()).toBe('/research/symbol?tab=flow')
  })

  it('redirects every retired path and keeps what the link carried', () => {
    expect(redirectTarget('/research/iv-radar', '?symbol=NVDA', '')).toBe(
      '/research/vol-regime?symbol=NVDA&view=iv-rank',
    )
    expect(redirectTarget('/research/opex-cycle-lab', '?symbol=SPY&date=2026-09-04', '#pin')).toBe(
      '/research/dealer-levels?symbol=SPY&date=2026-09-04&view=opex#pin',
    )
    // An old ?view= on the way in loses to the path's own view.
    expect(redirectTarget('/research/vrp-lab', '?view=skew', '')).toBe('/research/vol-regime?view=vrp')
    expect(redirectTarget('/research/order-sentiment', '?symbol=NVDA', '#multi-leg')).toBe(
      '/research/flow?symbol=NVDA#multi-leg',
    )
    expect(redirectTarget('/research/order-sentiment', '', '')).toBe('/research/flow')
    expect(redirectTarget('/research/discovery', '', '')).toBeNull()
    expect(Object.keys(RETIRED_ANALYZE_PATHS)).toHaveLength(9)
  })
})

describe('LAB_VIEW_LENS', () => {
  it('names the registry lens behind every lab view except the two narrative ones', () => {
    for (const view of Object.keys(LAB_VIEW_HUB) as LabViewId[]) {
      const lens = LAB_VIEW_LENS[view]
      if (view === 'sessions' || view === 'playbook') expect(lens).toBeUndefined()
      else expect(lens).toMatch(/^[a-z_]+$/)
    }
  })
})
