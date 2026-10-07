import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { fetchNavHistory, fetchPnlAttribution, snapshotQuery } from './snapshots'

/**
 * An API older than 0.12.0 answers the snapshot routes 404: that is "not
 * served here", which the pages show as their not-wired state — never an empty
 * history. Any other failure stays a failure.
 */
function answer(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('snapshot reads', () => {
  it('reads 404 as not served (null)', async () => {
    answer(404, { detail: 'Not Found' })
    await expect(fetchNavHistory()).resolves.toBeNull()
    await expect(fetchPnlAttribution({ from: '2031-03-01', to: '2031-03-31' })).resolves.toBeNull()
  })

  it('keeps a 503 a failure', async () => {
    answer(503, { detail: 'the daily snapshot could not be read: database unavailable', reason: 'read_failed' })
    await expect(fetchNavHistory()).rejects.toBeInstanceOf(HttpError)
  })

  it('returns the body on 200 and sends the canonical query names', async () => {
    answer(200, { items: [], count: 0, dropped: [], sessions: [] })
    await expect(fetchNavHistory({ from: '2031-03-01' })).resolves.toMatchObject({ sessions: [] })
    const url = String((fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0])
    expect(url).toContain('/api/account/portfolio/nav-history?from_date=2031-03-01')
    expect(snapshotQuery({ to: '2031-03-31', tradeId: 7, accountId: 'UZZ1' })).toBe(
      '?to_date=2031-03-31&account_id=UZZ1&trade_id=7',
    )
  })
})
