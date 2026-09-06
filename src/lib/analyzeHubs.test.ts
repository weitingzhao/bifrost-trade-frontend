import { describe, expect, it } from 'vitest'
import {
  ANALYZE_HUB,
  RETIRED_ANALYZE_PATHS,
  flowHref,
  labHref,
  redirectTarget,
  withSymbolParam,
} from './analyzeHubs'

describe('analyze hubs', () => {
  it('appends the symbol whether or not the route has a query', () => {
    expect(withSymbolParam('/research/vol-regime?view=vrp', 'nvda')).toBe(
      '/research/vol-regime?view=vrp&symbol=NVDA',
    )
    expect(withSymbolParam('/research/flow', 'SPY')).toBe('/research/flow?symbol=SPY')
    expect(withSymbolParam('/research/flow#multi-leg', 'SPY')).toBe('/research/flow?symbol=SPY#multi-leg')
    expect(withSymbolParam('/research/flow', '')).toBe('/research/flow')
    expect(withSymbolParam('/research/flow', null)).toBe('/research/flow')
  })

  it('builds hub view links from the view id alone', () => {
    expect(labHref('iv-rank')).toBe('/research/vol-regime?view=iv-rank')
    expect(labHref('gex', 'NVDA')).toBe('/research/dealer-levels?view=gex&symbol=NVDA')
    expect(labHref('playbook', 'spy')).toBe('/research/scenario?view=playbook&symbol=SPY')
    expect(flowHref('NVDA', 'multi-leg')).toBe('/research/flow?symbol=NVDA#multi-leg')
    expect(flowHref()).toBe(ANALYZE_HUB.flow)
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
