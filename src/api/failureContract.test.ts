/**
 * The four routers api 0.2.2 moved to real failure statuses and `{ items }`
 * lists (TD-16, TD-17): portfolio config, trading executions, watchlist,
 * monitor config. Each write shows the server's `detail`; each list reads
 * `items` first and its one legacy key while api 0.2.1 is still serving.
 * Every id, symbol and message here is invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPositionCategory, fetchPositionCategories, tagPosition } from '@/api/portfolio'
import {
  createExecution,
  createOptionStockLink,
  deleteExecution,
  fetchExecutions,
  fetchOptionStockLinks,
  fetchPositionAttribution,
  fetchStockLinkCandidates,
  getTransactions,
  postTwsFetch,
  updateExecution,
} from '@/api/trading'
import { deleteWatchlistItem, fetchWatchlist, postWatchlistItem } from '@/api/market'
import { fetchOpenOrders, postIbConfig } from '@/api/monitor'
import { setActiveAllocation } from '@/api/strategy'

/** api 0.2.2 failure body. */
function failure(status: number, message: string, legacy: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ detail: message, ok: false, error: message, ...legacy }), { status })
}

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('portfolio config', () => {
  it('a refused create shows the detail (0.2.2: 400)', async () => {
    fetchMock.mockResolvedValue(failure(400, 'name is required.', { id: null }))
    await expect(createPositionCategory('  ')).rejects.toThrow('name is required.')
  })

  it('a refused tag shows the error (0.2.1: 200 ok:false)', async () => {
    fetchMock.mockResolvedValue(ok({ ok: false, error: 'Failed to set tag.' }))
    await expect(tagPosition({ account_id: 'U0000001', contract_key: 'ZZZ', category_id: 1 })).rejects.toThrow(
      'Failed to set tag.',
    )
  })

  it('reads the category list from items', async () => {
    fetchMock.mockResolvedValue(ok({ items: [{ id: 1, name: 'Core' }], count: 1, ok: true }))
    expect((await fetchPositionCategories()).items).toEqual([{ id: 1, name: 'Core' }])
  })
})

describe('trading executions', () => {
  it('a refused create shows the detail (400)', async () => {
    fetchMock.mockResolvedValue(failure(400, 'instance_allocations must be a list.', { account_executions_id: null }))
    await expect(createExecution({} as Parameters<typeof createExecution>[0])).rejects.toThrow(
      'instance_allocations must be a list.',
    )
  })

  it('a refused delete shows the error from either release', async () => {
    const msg = 'Delete failed (account_executions_id missing or database error).'
    fetchMock.mockResolvedValueOnce(failure(404, msg))
    await expect(deleteExecution(7)).rejects.toThrow(msg)
    fetchMock.mockResolvedValueOnce(ok({ ok: false, error: msg }))
    await expect(deleteExecution(7)).rejects.toThrow(msg)
  })

  it('a gateway failure on fetch is the server reason, not a bare 503', async () => {
    fetchMock.mockResolvedValue(failure(503, 'IB Gateway client is not configured.', { count: 0 }))
    await expect(postTwsFetch(1)).rejects.toThrow('IB Gateway client is not configured.')
  })

  it('a duplicate link comes back as { ok: false, error } with the 409 detail', async () => {
    fetchMock.mockResolvedValue(failure(409, 'Link already exists or insert failed.', { link_id: null, warning: null }))
    await expect(
      createOptionStockLink({ account_id: 'U0000001', option_account_executions_id: 1, stock_account_executions_id: 2 }),
    ).resolves.toEqual({ ok: false, link_id: null, error: 'Link already exists or insert failed.', warning: null })
  })

  it('a refused update comes back as { ok: false, error }', async () => {
    fetchMock.mockResolvedValue(failure(404, 'Update failed (account_executions_id missing or database error).'))
    await expect(updateExecution(9, {} as Parameters<typeof updateExecution>[1])).resolves.toEqual({
      ok: false,
      error: 'Update failed (account_executions_id missing or database error).',
    })
  })

  it('reads executions from items, and from executions while 0.2.1 serves', async () => {
    fetchMock.mockResolvedValueOnce(ok({ items: [{ id: 'new' }], count: 1, executions: [{ id: 'old' }] }))
    expect((await fetchExecutions('all')).items).toEqual([{ id: 'new' }])
    fetchMock.mockResolvedValueOnce(ok({ executions: [{ id: 'old' }] }))
    expect((await fetchExecutions('all')).items).toEqual([{ id: 'old' }])
  })

  it('reads attributions and transactions the same way', async () => {
    fetchMock.mockResolvedValueOnce(ok({ attributions: [{ a: 1 }] }))
    expect((await fetchPositionAttribution()).items).toEqual([{ a: 1 }])
    fetchMock.mockResolvedValueOnce(ok({ items: [{ t: 2 }], count: 1, transactions: [{ t: 1 }] }))
    expect((await getTransactions()).transactions).toEqual([{ t: 2 }])
    fetchMock.mockResolvedValueOnce(ok({ transactions: [{ t: 1 }] }))
    expect((await getTransactions()).transactions).toEqual([{ t: 1 }])
  })

  it('link lists keep their error field from both releases', async () => {
    fetchMock.mockResolvedValueOnce(failure(503, 'database_unavailable', { links: [], slippage_total: null }))
    expect(await fetchOptionStockLinks('U0000001', 1)).toEqual({ links: [], slippage_total: null, error: 'database_unavailable' })

    fetchMock.mockResolvedValueOnce(ok({ links: [], slippage_total: null, error: 'database_unavailable' }))
    expect((await fetchOptionStockLinks('U0000001', 1)).error).toBe('database_unavailable')

    fetchMock.mockResolvedValueOnce(ok({ items: [{ link_id: 3 }], count: 1, links: [{ link_id: 3 }], slippage_total: 0.5 }))
    expect(await fetchOptionStockLinks('U0000001', 1)).toEqual({ links: [{ link_id: 3 }], slippage_total: 0.5, error: undefined })

    fetchMock.mockResolvedValueOnce(failure(404, 'Option execution not found in performance book.', { executions: [] }))
    expect(await fetchStockLinkCandidates({ account_id: 'U0000001', option_account_executions_id: 1 })).toEqual({
      executions: [],
      error: 'Option execution not found in performance book.',
    })
  })
})

describe('watchlist', () => {
  it('a refused add shows the detail (400)', async () => {
    fetchMock.mockResolvedValue(failure(400, 'contract_key is required.'))
    await expect(postWatchlistItem({ contract_key: '' })).rejects.toThrow('contract_key is required.')
  })

  it('a refused delete shows the error (0.2.1: 200 ok:false)', async () => {
    fetchMock.mockResolvedValue(ok({ ok: false, error: 'Delete failed (not found or database error).' }))
    await expect(deleteWatchlistItem('STK:ZZZ')).rejects.toThrow('Delete failed (not found or database error).')
  })

  it('reads the list from items', async () => {
    fetchMock.mockResolvedValue(ok({ items: [{ contract_key: 'STK:ZZZ' }], count: 1 }))
    expect((await fetchWatchlist()).items).toEqual([{ contract_key: 'STK:ZZZ' }])
  })
})

describe('monitor config', () => {
  it('a refused IB config write prints the detail', async () => {
    fetchMock.mockResolvedValue(failure(503, 'control via DB not available (postgres required)'))
    await expect(postIbConfig({ ib_host_account_id: 'U0000001' })).resolves.toEqual({
      ok: false,
      error: 'control via DB not available (postgres required)',
    })
  })

  it('reads the 0.2.1 failure, which had only error', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'failed to write settings' }), { status: 500 }))
    expect((await postIbConfig({})).error).toBe('failed to write settings')
  })

  it('a refused active strategy throws the 409 reason', async () => {
    fetchMock.mockResolvedValue(failure(409, 'active_strategy_allocation_id=99 does not exist in strategy_allocation'))
    await expect(setActiveAllocation(99)).rejects.toThrow('active_strategy_allocation_id=99 does not exist')
  })

  it('reads open orders from items first, else open_orders — no other key', async () => {
    fetchMock.mockResolvedValueOnce(ok({ items: [{ order_id: 2 }], open_orders: [{ order_id: 1 }] }))
    expect(await fetchOpenOrders()).toEqual([{ order_id: 2 }])
    fetchMock.mockResolvedValueOnce(ok({ open_orders: [{ order_id: 1 }] }))
    expect(await fetchOpenOrders()).toEqual([{ order_id: 1 }])
    fetchMock.mockResolvedValueOnce(ok({ orders: [{ order_id: 1 }] }))
    expect(await fetchOpenOrders()).toEqual([])
  })
})
