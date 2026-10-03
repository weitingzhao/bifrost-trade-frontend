/**
 * TD-57 (api 0.6.7): the app sends back what it reads and reads ids under the table's name.
 * Saved searches go out with `state_json`; option/stock links are read by
 * `account_execution_option_stock_link_id`; the candidate window by `from_date` / `to_date`;
 * a position category by `category_id`. Accounts, ids and symbols are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSavedSearch } from '@/api/savedSearches'
import { createOptionStockLink, fetchStockLinkCandidates } from '@/api/trading'
import { categoryIdForName } from '@/utils/watchlistHelpers'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

function answer(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('naming alignment (TD-57)', () => {
  it('a saved search is sent with state_json, the name it is read with', async () => {
    fetchMock.mockResolvedValueOnce(answer({ preference_saved_search_id: 7 }))
    await createSavedSearch({ route: '/trade/plans', label: 'ZZQ', state_json: { search: '?sym=ZZQ' } })
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(sent).toEqual({ route: '/trade/plans', label: 'ZZQ', state_json: { search: '?sym=ZZQ' } })
  })

  it('a new link is read by the table id', async () => {
    fetchMock.mockResolvedValueOnce(
      answer({ ok: true, link_id: 12, account_execution_option_stock_link_id: 12, warning: null }),
    )
    const res = await createOptionStockLink({
      account_id: 'U0000001',
      option_account_executions_id: 1,
      stock_account_executions_id: 2,
    })
    expect(res).toEqual({ ok: true, account_execution_option_stock_link_id: 12, warning: null })
  })

  it('the candidate window is read as from_date / to_date', async () => {
    fetchMock.mockResolvedValueOnce(
      answer({ items: [], count: 0, underlying_symbol: 'ZZQ', from_date: '2026-01-02', to_date: '2026-01-16' }),
    )
    const res = await fetchStockLinkCandidates({ account_id: 'U0000001', option_account_executions_id: 4 })
    expect([res.from_date, res.to_date]).toEqual(['2026-01-02', '2026-01-16'])
  })

  it('a category is found by category_id', () => {
    const cats = [{ category_id: 5, name: 'Watching', description: null, sort_order: 2 }]
    expect(categoryIdForName(cats, 'Watching')).toBe(5)
    expect(categoryIdForName(cats, 'Sizing')).toBeNull()
  })
})
