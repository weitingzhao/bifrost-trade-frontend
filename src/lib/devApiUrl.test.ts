/**
 * One gateway prefix per API process (TD-55, Owner option B). Each helper is pinned to the
 * prefix of the process that serves it; the account aliases (/api/trading, /api/strategy,
 * /api/portfolio) still answer until B2 but nothing here builds them.
 */
import { describe, expect, it } from 'vitest'
import {
  accountUrl,
  domainOrigin,
  marketUrl,
  monitorUrl,
  portfolioUrl,
  strategyUrl,
  tradeResearchUrl,
  tradingUrl,
} from '@/lib/devApiUrl'

describe('devApiUrl prefix map', () => {
  it.each([
    ['monitorUrl', monitorUrl, '/status', '/api/monitor/status'],
    ['accountUrl', accountUrl, '/health', '/api/account/health'],
    ['tradingUrl', tradingUrl, '/executions?limit=1', '/api/account/executions?limit=1'],
    ['strategyUrl', strategyUrl, '/strategies/plans', '/api/account/strategies/plans'],
    ['portfolioUrl', portfolioUrl, '/portfolio/model-analysis', '/api/account/portfolio/model-analysis'],
    ['marketUrl', marketUrl, '/quotes/stream', '/api/market/quotes/stream'],
    ['tradeResearchUrl', tradeResearchUrl, '/research/screener', '/api/research/research/screener'],
  ])('%s routes to its process prefix', (_name, helper, path, want) => {
    expect(helper(path)).toBe(want)
  })

  it('adds the leading slash a bare path lacks', () => {
    expect(strategyUrl('trades')).toBe('/api/account/trades')
  })

  it('builds no call to an alias prefix', () => {
    for (const helper of [tradingUrl, strategyUrl, portfolioUrl]) {
      expect(helper('/x')).not.toMatch(/^\/api\/(trading|strategy|portfolio)\//)
    }
    expect(domainOrigin('account')).toBe('/api/account')
  })
})
