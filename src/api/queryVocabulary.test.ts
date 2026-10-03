/**
 * TD-51 (api 0.6.6): the Trade API's one query vocabulary — `expiry`, `option_right`,
 * `from_ts` / `to_ts` (Unix seconds), `from_date` / `to_date` (YYYY-MM-DD). The API still
 * accepts the old names for one release; this pins that the app sends only the new ones.
 * Symbols, accounts and ids are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as trading from '@/api/trading'
import * as strategy from '@/api/strategy'
import { fetchGreeks } from '@/api/research'
import { fetchLiquiditySummary, fetchOptionSnapshotsPg, fetchRelativeValue } from '@/api/research/optionDiscovery'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () =>
    new Response(JSON.stringify({ items: [], count: 0, rows: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const OLD_NAMES = ['since_ts', 'until_ts', 'opened_at_from', 'opened_at_until', 'trade_date_from', 'trade_date_to', 'expiration', 'right']

function sentQuery(): URLSearchParams {
  const calls = fetchMock.mock.calls
  const url = String(calls[calls.length - 1]?.[0] ?? '')
  return new URL(url, 'http://localhost').searchParams
}

function expectNoOldNames(q: URLSearchParams): void {
  for (const name of OLD_NAMES) expect(q.has(name), name).toBe(false)
}

describe('query vocabulary (TD-51)', () => {
  it('time ranges are from_ts / to_ts', async () => {
    const calls: [() => Promise<unknown>, string, string][] = [
      [() => trading.fetchExecutionsRange({ from_ts: 10, to_ts: 20 }), '10', '20'],
      [() => trading.fetchPerformance({ from_ts: 10, to_ts: 20 }), '10', '20'],
      [() => trading.getTransactions({ from_ts: 10, to_ts: 20 }), '10', '20'],
      [() => strategy.fetchWinRate({ sinceTs: 10, untilTs: 20 }), '10', '20'],
    ]
    for (const [call, from, to] of calls) {
      await call().catch(() => undefined)
      const q = sentQuery()
      expect([q.get('from_ts'), q.get('to_ts')]).toEqual([from, to])
      expectNoOldNames(q)
    }
    await strategy.fetchTrades({ openedAtFrom: 10 }).catch(() => undefined)
    expect(sentQuery().get('from_ts')).toBe('10')
    expectNoOldNames(sentQuery())
  })

  it('date ranges are from_date / to_date', async () => {
    await trading.fetchStockLinkCandidates({
      account_id: 'U0000001',
      option_account_executions_id: 4,
      from_date: '2026-01-02',
      to_date: '2026-01-09',
    })
    const q = sentQuery()
    expect([q.get('from_date'), q.get('to_date')]).toEqual(['2026-01-02', '2026-01-09'])
    expectNoOldNames(q)
  })

  it('option contracts are expiry / option_right', async () => {
    const calls: [() => Promise<unknown>, boolean][] = [
      [() => fetchOptionSnapshotsPg('ZZQ', '2026-10-16'), false],
      [() => fetchLiquiditySummary('ZZQ', '2026-10-16', 10, 'C'), true],
      [() => fetchRelativeValue('ZZQ', '2026-10-16', 10, 'C'), true],
      [() => fetchGreeks({ symbol: 'ZZQ', trade_date: '2026-10-01', expiry: '2026-10-16', right: 'C' }), true],
    ]
    for (const [call, hasRight] of calls) {
      await call().catch(() => undefined)
      const q = sentQuery()
      expect(q.get('expiry')).toBe('2026-10-16')
      if (hasRight) expect(q.get('option_right')).toBe('C')
      expectNoOldNames(q)
    }
  })
})
