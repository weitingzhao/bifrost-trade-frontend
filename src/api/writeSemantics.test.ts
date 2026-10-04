/**
 * TD-15 batch 3b-2 (api 0.3.0): partial writes are PATCHes of the fields the
 * caller changed, and every strict DELETE reads a 404 naming the row as
 * "already gone" while 409 / 503 throw the server's reason.
 * Every id, symbol, account and message here is invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteAllocation,
  deleteTrade,
  deleteTemplate,
  patchOpportunity,
  patchTrade,
  updateAllocation,
  updateTemplate,
} from '@/api/strategy'
import { deleteStrategyPlan, updateStrategyPlan } from '@/api/strategyPlans'
import { deleteSavedSearch } from '@/api/savedSearches'
import { saveTradeReview } from '@/api/tradeReviews'
import { deleteExecution, deleteOptionStockLink, patchExecutionAttribution, updateExecution } from '@/api/trading'
import { deletePositionCategory, setInstrumentClass } from '@/api/portfolio'
import { deleteWatchlistItem, patchWatchlistItem } from '@/api/market'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function refusal(status: number, detail: string): Response {
  return json({ detail, ok: false, error: detail }, status)
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

function call(i = 0): { url: string; method: string; body: unknown } {
  const [u, init] = fetchMock.mock.calls[i]
  return {
    url: String(u),
    method: init?.method ?? 'GET',
    body: init?.body == null ? undefined : JSON.parse(String(init.body)),
  }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('plans', () => {
  it('the plan editor writes one field per PATCH — a cleared rationale is null', async () => {
    fetchMock.mockResolvedValue(json({ strategy_plan_id: 12, rationale: null }))
    await updateStrategyPlan(12, { rationale: null })
    expect(call()).toEqual({ url: '/api/account/strategies/plans/12', method: 'PATCH', body: { rationale: null } })
  })

  it('a field an intent refuses throws the 409 reason', async () => {
    fetchMock.mockResolvedValue(
      refusal(409, 'This plan is intended, so only its expiry (expires_at) can change, not qty.'),
    )
    await expect(updateStrategyPlan(12, { qty: 2 })).rejects.toThrow('only its expiry (expires_at) can change')
  })

  it('a draft delete: 409 past draft, 404 already gone', async () => {
    fetchMock.mockResolvedValueOnce(refusal(409, 'This plan is intended; only a draft can be deleted.'))
    await expect(deleteStrategyPlan(12)).rejects.toThrow('only a draft can be deleted')
    fetchMock.mockResolvedValueOnce(refusal(404, 'No plan 12.'))
    await expect(deleteStrategyPlan(12)).resolves.toEqual({ deleted: 'gone', detail: 'No plan 12.' })
    fetchMock.mockResolvedValueOnce(json({ deleted: 'hard', strategy_plan_id: 12, ok: true }))
    expect((await deleteStrategyPlan(12)).deleted).toBe('hard')
  })
})

describe('reviews', () => {
  it('PATCHes only what the reader changed and reads the row back', async () => {
    fetchMock.mockResolvedValue(
      json({ trade_id: 7, tags_added_json: [], tags_dropped_json: [], note: null, reviewed: true }),
    )
    const row = await saveTradeReview(7, { reviewed: true })
    expect(call()).toEqual({ url: '/api/account/trade-reviews/7', method: 'PATCH', body: { reviewed: true } })
    expect(row.reviewed).toBe(true)
  })

  it('tag lists go alone', async () => {
    fetchMock.mockResolvedValue(
      json({ trade_id: 7, tags_added_json: ['early-exit'], tags_dropped_json: [], note: 'kept', reviewed: false }),
    )
    await saveTradeReview(7, { tags_added_json: ['early-exit'], tags_dropped_json: [] })
    expect(call().body).toEqual({ tags_added_json: ['early-exit'], tags_dropped_json: [] })
  })
})

describe('execution attribution', () => {
  const attribution = {
    account_executions_id: 41,
    account_id: 'U0000001',
    strategy_opportunity_id: 3,
    trade_id: 30,
    fill_splits: [],
  }

  it('PATCHes /executions/{id}/attribution with the two ids — not the fill PUT', async () => {
    fetchMock.mockResolvedValue(json(attribution))
    const res = await patchExecutionAttribution(41, { strategy_opportunity_id: 3, trade_id: 30 })
    expect(call()).toEqual({
      url: '/api/account/executions/41/attribution',
      method: 'PATCH',
      body: { strategy_opportunity_id: 3, trade_id: 30 },
    })
    expect(res).toEqual({ ok: true, attribution })
  })

  it('a split fill without fill_splits: [] comes back as { ok: false } with the 409 reason', async () => {
    const msg =
      'This execution is split across 2 instances; send instance_allocations: [] with the ids to replace the split.'
    fetchMock.mockResolvedValue(refusal(409, msg))
    await expect(patchExecutionAttribution(41, { trade_id: 30 })).resolves.toEqual({ ok: false, error: msg })
  })

  it('the fill edit stays on PUT /executions/{id}', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }))
    await updateExecution(41, { price: 1.25 })
    expect(call()).toMatchObject({ url: '/api/account/executions/41', method: 'PUT' })
  })

  it('delete: 409 while a link names it, 404 already gone', async () => {
    fetchMock.mockResolvedValueOnce(refusal(409, 'This execution is in 1 option/stock link; unlink it first.'))
    await expect(deleteExecution(41)).rejects.toThrow('unlink it first')
    fetchMock.mockResolvedValueOnce(refusal(404, 'No execution 41.'))
    expect((await deleteExecution(41)).deleted).toBe('gone')
  })

  it('a link already gone is ok; a blank account is the 400 reason', async () => {
    fetchMock.mockResolvedValueOnce(refusal(404, 'No option/stock link 5 on account U0000001.'))
    await expect(deleteOptionStockLink(5, 'U0000001')).resolves.toEqual({ ok: true })
    fetchMock.mockResolvedValueOnce(refusal(400, 'account_id is required.'))
    await expect(deleteOptionStockLink(5, ' ')).resolves.toEqual({ ok: false, error: 'account_id is required.' })
  })
})

describe('strategy rules', () => {
  it('template info is a PATCH; an emptied text goes as null', async () => {
    fetchMock.mockResolvedValue(json({ strategy_template_id: 4 }))
    await updateTemplate(4, { display_name: 'Covered call', explanation: null })
    expect(call()).toEqual({
      url: '/api/account/strategies/templates/4',
      method: 'PATCH',
      body: { display_name: 'Covered call', explanation: null },
    })
  })

  it('template delete: 409 names the structures, 404 already gone', async () => {
    const msg = '2 structures use this template: CC 30 delta and Old CC (deactivated). Point them at another template first.'
    fetchMock.mockResolvedValueOnce(refusal(409, msg))
    await expect(deleteTemplate(4)).rejects.toThrow(msg)
    fetchMock.mockResolvedValueOnce(refusal(404, 'No template 4.'))
    await expect(deleteTemplate(4)).resolves.toEqual({ deleted: 'gone', detail: 'No template 4.' })
  })

  it('opportunity and allocation edits are PATCHes', async () => {
    fetchMock.mockResolvedValue(json({}))
    await patchOpportunity(5, { is_active: false })
    expect(call(0)).toEqual({ url: '/api/account/strategies/opportunities/5', method: 'PATCH', body: { is_active: false } })
    await updateAllocation(6, { allocation_limits: { max_positions: null, max_bp_pct: 0.25 } })
    expect(call(1)).toEqual({
      url: '/api/account/strategies/allocations/6',
      method: 'PATCH',
      body: { allocation_limits: { max_positions: null, max_bp_pct: 0.25 } },
    })
  })

  it('a rule delete: 409 in use throws, 404 already gone resolves', async () => {
    fetchMock.mockResolvedValueOnce(refusal(409, 'The daemon runs this allocation; set another one active first.'))
    await expect(deleteAllocation(6)).rejects.toThrow('set another one active first')
    fetchMock.mockResolvedValueOnce(refusal(404, 'No allocation 6.'))
    expect((await deleteAllocation(6)).deleted).toBe('gone')
  })

  it('instance: PATCH answers the row; delete 409 / 503 throw their reasons', async () => {
    fetchMock.mockResolvedValueOnce(json({ trade_id: 7, label: null }))
    await patchTrade(7, { label: null })
    expect(call(0)).toEqual({ url: '/api/account/trades/7', method: 'PATCH', body: { label: null } })
    fetchMock.mockResolvedValueOnce(refusal(409, '3 executions are attributed to this instance.'))
    await expect(deleteTrade(7)).rejects.toThrow('3 executions are attributed')
    fetchMock.mockResolvedValueOnce(refusal(503, 'Cannot write strategy instance 7: the Golden Source is unreachable.'))
    await expect(deleteTrade(7)).rejects.toThrow('Golden Source is unreachable')
  })

  it('a saved search already gone resolves', async () => {
    fetchMock.mockResolvedValue(refusal(404, 'No saved search 9.'))
    expect((await deleteSavedSearch(9)).deleted).toBe('gone')
  })
})

describe('portfolio', () => {
  it('a category already gone resolves ok', async () => {
    fetchMock.mockResolvedValue(refusal(404, 'No position category 3.'))
    await expect(deletePositionCategory(3)).resolves.toMatchObject({ ok: true, deleted: 'gone' })
  })

  it('instrument class: PATCH when registered, PUT the first time, DELETE to drop', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }))
    await setInstrumentClass('ZZFI|STK|||', 'fixed_income', true)
    expect(call(0)).toEqual({
      url: '/api/account/instrument-classes/ZZFI%7CSTK%7C%7C%7C',
      method: 'PATCH',
      body: { instrument_class: 'fixed_income' },
    })
    await setInstrumentClass('ZZFI|STK|||', 'cash_like', false)
    expect(call(1)).toMatchObject({ method: 'PUT', body: { instrument_class: 'cash_like' } })
    await setInstrumentClass('ZZFI|STK|||', null, true)
    expect(call(2)).toMatchObject({ method: 'DELETE' })
  })

  it('a PATCH the server answers 404 for (registration dropped elsewhere) registers with PUT', async () => {
    fetchMock
      .mockResolvedValueOnce(refusal(404, 'ZZFI|STK||| has no instrument class registered.'))
      .mockResolvedValueOnce(json({ ok: true }))
    await expect(setInstrumentClass('ZZFI|STK|||', 'stock', true)).resolves.toEqual({ ok: true })
    expect([call(0).method, call(1).method]).toEqual(['PATCH', 'PUT'])
  })

  it('dropping a class that is already gone resolves ok', async () => {
    fetchMock.mockResolvedValue(refusal(404, 'ZZFI|STK||| has no instrument class registered.'))
    await expect(setInstrumentClass('ZZFI|STK|||', null, false)).resolves.toEqual({ ok: true })
  })
})

describe('watchlist', () => {
  it('the None list is an explicit category_id: null on PATCH /watchlist/{key}', async () => {
    fetchMock.mockResolvedValue(json({ contract_key: 'ZZQ|STK|||', category_id: null }))
    await patchWatchlistItem('ZZQ|STK|||', { category_id: null })
    expect(call()).toEqual({
      url: '/api/market/watchlist/ZZQ%7CSTK%7C%7C%7C',
      method: 'PATCH',
      body: { category_id: null },
    })
  })

  it('a contract already off the list resolves as gone', async () => {
    fetchMock.mockResolvedValue(refusal(404, 'ZZQ|STK||| is not on the watchlist.'))
    expect((await deleteWatchlistItem('ZZQ|STK|||')).deleted).toBe('gone')
  })
})
