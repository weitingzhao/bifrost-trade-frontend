/**
 * Trade writes carry the operator token, and nothing writes to Trade around it
 * (debt TD-23). Tokens here are invented.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tradeApiPath, tradeFetch } from '@/lib/tradeFetch'
import { closeTradeOperatorDialog, tradeOperatorStore } from '@/lib/auth/tradeOperator'

const TOKEN = 'test-operator-token-0001'

function authOf(call: unknown[]): string | null {
  const init = call[1] as RequestInit | undefined
  return new Headers(init?.headers).get('Authorization')
}

describe('tradeFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    tradeOperatorStore.setToken(TOKEN)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    tradeOperatorStore.clear()
    closeTradeOperatorDialog()
  })

  it('knows the Trade prefixes and nothing else', () => {
    // One prefix per process (TD-55): monitor, account, market, research.
    expect(tradeApiPath('/api/account/strategies/allocations')).toBe('/api/account/strategies/allocations')
    expect(tradeApiPath('/api/market/watchlist')).toBe('/api/market/watchlist')
    // The account aliases went in TD-55 B2: the gateway no longer routes them.
    expect(tradeApiPath('/api/strategy/strategies/allocations')).toBeNull()
    expect(tradeApiPath('/api/trading/executions/1')).toBeNull()
    expect(tradeApiPath('/api/portfolio/instrument-classes/X')).toBeNull()
    expect(tradeApiPath('/api/accounts/x')).toBeNull()
    expect(tradeApiPath('http://host:30882/api/monitor/control/flatten')).toBe('/api/monitor/control/flatten')
    expect(tradeApiPath('/api/research/research/feedback/reports')).not.toBeNull()
    expect(tradeApiPath('/api/plugin/research/research/copilot/chat')).toBeNull()
    expect(tradeApiPath('/api/plugin/market-data/market/doctor')).toBeNull()
    expect(tradeApiPath('/api/platform/plugins/ib-gateway/status')).toBeNull()
  })

  it('puts the token on a write to Trade', async () => {
    await tradeFetch('/api/account/strategies/allocations', { method: 'POST', body: '{}' })
    expect(authOf(fetchMock.mock.calls[0])).toBe(`Bearer ${TOKEN}`)
  })

  it('sends no token to a retired account alias (TD-55 B2)', async () => {
    await tradeFetch('/api/strategy/strategies/allocations', { method: 'POST', body: '{}' })
    expect(authOf(fetchMock.mock.calls[0])).toBeNull()
  })

  it('leaves a read alone', async () => {
    await tradeFetch('/api/account/strategies/allocations')
    expect(fetchMock.mock.calls[0][1]).toBeUndefined()
  })

  it('leaves a write to the Research engine alone', async () => {
    await tradeFetch('/api/plugin/research/research/drafts', { method: 'POST' })
    expect(authOf(fetchMock.mock.calls[0])).toBeNull()
  })

  it('keeps an Authorization the caller set', async () => {
    await tradeFetch('/api/market/watchlist', { method: 'DELETE', headers: { Authorization: 'Bearer other' } })
    expect(authOf(fetchMock.mock.calls[0])).toBe('Bearer other')
  })

  it('sends a write without a token when none is saved', async () => {
    tradeOperatorStore.clear()
    await tradeFetch('/api/market/watchlist', { method: 'POST' })
    expect(authOf(fetchMock.mock.calls[0])).toBeNull()
  })

  it('opens the sign-in naming a refused write, and still returns the 403', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: false, required_role: 'admin', current_role: 'operator' }), { status: 403 }),
    )
    const res = await tradeFetch('/api/monitor/control/monitor_connect', { method: 'POST' })
    expect(res.status).toBe(403)
    const s = tradeOperatorStore.getState()
    expect(s.open).toBe(true)
    expect(s.refused).toEqual({
      method: 'POST',
      path: '/api/monitor/control/monitor_connect',
      requiredRole: 'admin',
      currentRole: 'operator',
    })
  })

  it('does not open the sign-in for a 403 that is not a role refusal', async () => {
    fetchMock.mockResolvedValue(new Response('forbidden', { status: 403 }))
    await tradeFetch('/api/market/watchlist', { method: 'POST' })
    expect(tradeOperatorStore.getState().open).toBe(false)
  })
})

/** Every source file under `src`, tests excluded. Walked, not `git ls-files`, so a new file counts. */
function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p))
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(p)
  }
  return out
}

describe('nothing writes to Trade around tradeFetch', () => {
  const TRADE_URL_HELPER = /\b(monitorUrl|marketUrl|tradingUrl|strategyUrl|portfolioUrl|tradeResearchUrl)\b/
  const BARE_FETCH = /(?<![\w.$])fetch\(/

  it('a module that builds a Trade URL fetches through tradeFetch', () => {
    const offenders = sourceFiles('src')
      .filter((f) => !f.endsWith('lib/tradeFetch.ts') && !f.endsWith('lib/devApiUrl.ts'))
      .filter((f) => {
        const src = readFileSync(f, 'utf8')
        return TRADE_URL_HELPER.test(src) && BARE_FETCH.test(src)
      })
    expect(offenders).toEqual([])
  })

  it('still finds the Trade API modules (the scan has not gone quiet)', () => {
    // `requestJson` (lib/http, TD-50) sends through tradeFetch, so its callers count.
    const users = sourceFiles('src').filter((f) => /\b(tradeFetch\(|requestJson[<(])/.test(readFileSync(f, 'utf8')))
    expect(users.length).toBeGreaterThanOrEqual(14)
    expect(readFileSync('src/lib/http.ts', 'utf8')).toMatch(/await tradeFetch\(/)
  })
})
