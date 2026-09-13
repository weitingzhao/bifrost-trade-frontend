import { describe, expect, it } from 'vitest'
import {
  SYMBOL_TABS,
  isSymbolTab,
  symbolRedirectTarget,
  symbolTabHref,
  tabFor,
  analyzeRedirect,
} from './symbolTabs'
import { LAB_VIEW_LENS, RETIRED_ANALYZE_PATHS } from './analyzeHubs'

describe('tabFor', () => {
  it('takes an explicit tab first', () => {
    expect(tabFor('dealer', 'vrp')).toBe('dealer')
  })

  it('falls back to the tab a pre-merge deep link meant', () => {
    // `?view=vrp` was written when Volatility was its own page. The link still
    // means the VRP section; it just lives in a tab now.
    expect(tabFor(null, 'vrp')).toBe('volatility')
    expect(tabFor(null, 'opex')).toBe('dealer')
    expect(tabFor(null, 'playbook')).toBe('scenario')
  })

  it('lands on Overview when the URL says nothing usable', () => {
    expect(tabFor(null, null)).toBe('overview')
    expect(tabFor('nonsense', null)).toBe('overview')
    expect(tabFor('nonsense', 'gibberish')).toBe('overview')
  })
})

describe('symbolRedirectTarget', () => {
  it('keeps the symbol a bookmark was followed for', () => {
    expect(symbolRedirectTarget('/research/vol-regime', '?symbol=NVDA&view=vrp', '')).toBe(
      '/research/symbol?symbol=NVDA&tab=volatility#vrp',
    )
  })

  it('turns the retired view into the section anchor, not a lost parameter', () => {
    expect(symbolRedirectTarget('/research/dealer-levels', '?view=opex', '')).toBe(
      '/research/symbol?tab=dealer#opex',
    )
  })

  it('uses the hub own tab when there is no view', () => {
    expect(symbolRedirectTarget('/research/dossier', '', '')).toBe('/research/symbol?tab=overview')
    expect(symbolRedirectTarget('/research/discovery', '?symbol=AAPL', '')).toBe(
      '/research/symbol?symbol=AAPL&tab=chain',
    )
  })

  it('leaves an explicit hash alone', () => {
    expect(symbolRedirectTarget('/research/flow', '?symbol=X', '#multi-leg')).toBe(
      '/research/symbol?symbol=X&tab=flow#multi-leg',
    )
  })

  it('declines a path it does not own', () => {
    expect(symbolRedirectTarget('/research/scan', '', '')).toBeNull()
  })
})

describe('the tab table', () => {
  it('reaches every lens the retired hubs were skins of', () => {
    // The dot on a tab is the worst of its lenses. A lens that fell out of the
    // table in the merge would go unreported on every tab.
    const inTabs = new Set(SYMBOL_TABS.flatMap((t) => t.lenses))
    for (const lens of Object.values(LAB_VIEW_LENS)) {
      expect(inTabs.has(lens), `${lens} is not on any tab`).toBe(true)
    }
  })

  it('has a home for every hub the merge retires', () => {
    for (const { hub } of Object.values(RETIRED_ANALYZE_PATHS)) {
      expect(symbolRedirectTarget(hub, '', ''), `${hub} has no tab`).not.toBeNull()
    }
  })

  it('carries the symbol on a tab link', () => {
    expect(symbolTabHref('volatility', 'NVDA')).toBe('/research/symbol?tab=volatility&symbol=NVDA')
    expect(symbolTabHref('overview', null)).toBe('/research/symbol?tab=overview')
  })

  it('knows its own tabs', () => {
    expect(isSymbolTab('chain')).toBe(true)
    expect(isSymbolTab('payoff')).toBe(false)
    expect(isSymbolTab(null)).toBe(false)
  })
})

describe('analyzeRedirect', () => {
  it('resolves both generations of rename in one navigation', () => {
    // `/research/vrp-lab` became `/research/vol-regime?view=vrp` (C1), which is
    // now the Volatility tab's VRP section. Bouncing through the middle URL
    // would be a redirect off a route that no longer exists.
    expect(analyzeRedirect('/research/vrp-lab', '?symbol=NVDA', '')).toBe(
      '/research/symbol?symbol=NVDA&tab=volatility#vrp',
    )
    expect(analyzeRedirect('/research/opex-cycle-lab', '', '')).toBe(
      '/research/symbol?tab=dealer#opex',
    )
    expect(analyzeRedirect('/research/order-sentiment', '?symbol=X', '')).toBe(
      '/research/symbol?symbol=X&tab=flow',
    )
  })

  it('still handles a hub path directly', () => {
    expect(analyzeRedirect('/research/scenario', '?view=sessions', '')).toBe(
      '/research/symbol?tab=scenario#sessions',
    )
  })

  it('declines what it does not own', () => {
    expect(analyzeRedirect('/research/screener', '', '')).toBeNull()
  })
})
