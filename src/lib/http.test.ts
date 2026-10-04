/**
 * The one JSON client (debt TD-50). Tokens and payloads here are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { HttpError, listItems, readJsonResponse, requestDelete, requestJson } from '@/lib/http'
import { ResearchHttpError, researchHttpStatus } from '@/lib/auth/researchHttpError'
import { closeTradeOperatorDialog, tradeOperatorStore } from '@/lib/auth/tradeOperator'

const TOKEN = 'test-operator-token-0002'

function json(body: unknown, status = 200, statusText = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' },
  })
}

function initOf(call: unknown[]): RequestInit {
  return (call[1] ?? {}) as RequestInit
}

async function caught(p: Promise<unknown>): Promise<HttpError> {
  try {
    await p
  } catch (e) {
    if (e instanceof HttpError) return e
    throw e
  }
  throw new Error('expected the request to throw')
}

describe('requestJson', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    tradeOperatorStore.clear()
    closeTradeOperatorDialog()
  })

  it('returns the parsed body of a 2xx', async () => {
    fetchMock.mockResolvedValue(json({ rows: [1, 2] }))
    await expect(requestJson('/api/account/strategies/plans')).resolves.toEqual({ rows: [1, 2] })
  })

  it('serialises a body and sets the JSON header only when there is one', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }))
    await requestJson('/api/plugin/research/research/hypothesis', { method: 'POST', body: { title: 'x' } })
    const sent = initOf(fetchMock.mock.calls[0])
    expect(sent.method).toBe('POST')
    expect(sent.body).toBe('{"title":"x"}')
    expect(new Headers(sent.headers).get('Content-Type')).toBe('application/json')

    await requestJson('/api/plugin/research/research/hypothesis')
    const read = initOf(fetchMock.mock.calls[1])
    expect(read.body).toBeUndefined()
    expect(new Headers(read.headers).has('Content-Type')).toBe(false)
  })

  it('throws HttpError with the server detail on a non-2xx', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'Plan 7 is not a draft' }, 409, 'Conflict'))
    const err = await caught(requestJson('/api/account/strategies/plans/7', { method: 'DELETE' }))
    expect(err.status).toBe(409)
    expect(err.detail).toBe('Plan 7 is not a draft')
    expect(err.message).toBe('Plan 7 is not a draft')
    expect(err.body).toEqual({ detail: 'Plan 7 is not a draft' })
  })

  it('prefers detail over the legacy error, and falls back to error, then message', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, detail: 'new reason', error: 'old reason' }, 400))
    expect((await caught(requestJson('/x'))).message).toBe('new reason')

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'old reason' }, 400))
    expect((await caught(requestJson('/x'))).message).toBe('old reason')

    fetchMock.mockResolvedValueOnce(json({ message: 'framework reason' }, 400))
    expect((await caught(requestJson('/x'))).message).toBe('framework reason')
  })

  it('reads a 422 detail list as its messages', async () => {
    fetchMock.mockResolvedValue(
      json({ detail: [{ loc: ['body', 'qty'], msg: 'must be > 0' }, { loc: ['body', 'symbol'], msg: 'required' }] }, 422),
    )
    expect((await caught(requestJson('/x'))).message).toBe('must be > 0; required')
  })

  it('falls back to the status line, labelled, when the server gives no reason', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 502, statusText: 'Bad Gateway' }))
    const err = await caught(requestJson('/x', { label: 'Drafts API' }))
    expect(err.status).toBe(502)
    expect(err.detail).toBeNull()
    expect(err.message).toBe('Drafts API: HTTP 502 Bad Gateway')
  })

  it('names an HTML page from the proxy instead of failing to parse it', async () => {
    fetchMock.mockResolvedValue(
      new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    const err = await caught(requestJson('/x', { label: 'Research Engine' }))
    expect(err.message).toMatch(/^Research Engine: got HTML instead of JSON/)
  })

  it('throws on a 2xx ok:false (the legacy failure shape)', async () => {
    fetchMock.mockResolvedValue(json({ ok: false, error: 'feedback store error' }))
    const err = await caught(requestJson('/api/research/research/feedback/summary'))
    expect(err.status).toBe(200)
    expect(err.message).toBe('feedback store error')
  })

  it("hands a 2xx ok:false back with okFalse: 'return'", async () => {
    fetchMock.mockResolvedValue(json({ ok: false, error: '[1018]', raw_count: 0 }))
    await expect(requestJson('/api/plugin/flex-query/flex/ingest/trigger', { okFalse: 'return' })).resolves.toEqual({
      ok: false,
      error: '[1018]',
      raw_count: 0,
    })
  })

  it("unwraps Research's { ok, data } envelope", async () => {
    fetchMock.mockResolvedValue(json({ ok: true, data: { rows: ['a'] } }))
    await expect(requestJson('/api/plugin/research/x', { envelope: 'research' })).resolves.toEqual({ rows: ['a'] })
  })

  it('returns a body without data as it came (bare-payload routes)', async () => {
    fetchMock.mockResolvedValue(json({ rows: ['a'] }))
    await expect(requestJson('/api/plugin/research/x', { envelope: 'research' })).resolves.toEqual({ rows: ['a'] })
  })

  it('validates strictly against a schema', async () => {
    const schema = z.object({ count: z.number() })
    fetchMock.mockResolvedValueOnce(json({ count: 3 }))
    await expect(requestJson('/x', { schema })).resolves.toEqual({ count: 3 })

    fetchMock.mockResolvedValueOnce(json({ count: 'three' }))
    const err = await caught(requestJson('/x', { schema }))
    expect(err.message).toMatch(/unexpected response shape at count/)
  })

  it('reads an empty 2xx as null', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(requestJson('/x', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('sends a Trade write through tradeFetch: the operator Bearer goes on', async () => {
    tradeOperatorStore.setToken(TOKEN)
    fetchMock.mockResolvedValue(json({ ok: true }))
    await requestJson('/api/account/strategies/plans/7/cancel', { method: 'POST' })
    expect(new Headers(initOf(fetchMock.mock.calls[0]).headers).get('Authorization')).toBe(`Bearer ${TOKEN}`)
  })

  it('a refused Trade write opens the operator sign-in and still throws the reason', async () => {
    tradeOperatorStore.setToken(TOKEN)
    fetchMock.mockResolvedValue(
      json({ ok: false, detail: 'operator role required', required_role: 'operator', current_role: 'viewer' }, 403),
    )
    const err = await caught(requestJson('/api/account/strategies/plans', { method: 'POST', body: {} }))
    expect(err.status).toBe(403)
    expect(err.message).toBe('operator role required')
    expect(tradeOperatorStore.getState().open).toBe(true)
  })

  it('leaves a Research engine write without the operator Bearer', async () => {
    tradeOperatorStore.setToken(TOKEN)
    fetchMock.mockResolvedValue(json({ ok: true, data: {} }))
    await requestJson('/api/plugin/research/research/drafts', { method: 'POST', body: {}, envelope: 'research' })
    expect(new Headers(initOf(fetchMock.mock.calls[0]).headers).get('Authorization')).toBeNull()
  })

  it('is the class the Research 401 empty-state reads', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'token expired' }, 401))
    const err = await caught(requestJson('/api/plugin/research/research/journal/notes'))
    expect(err).toBeInstanceOf(ResearchHttpError)
    expect(researchHttpStatus(err)).toBe(401)
  })
})

describe('readJsonResponse', () => {
  it('reads a Response the module already holds', async () => {
    await expect(readJsonResponse(json({ ok: true, data: 5 }), { envelope: 'research' })).resolves.toBe(5)
  })
})

describe('listItems', () => {
  it('reads items first', () => {
    expect(listItems({ items: [1], rows: [2] }, 'rows')).toEqual([1])
  })

  it('falls back to the one named legacy key', () => {
    expect(listItems({ rows: [2] }, 'rows')).toEqual([2])
  })

  it('does not guess at other keys', () => {
    expect(listItems({ rows: [2] })).toEqual([])
    expect(listItems({ data: [3] }, 'rows')).toEqual([])
    expect(listItems(null, 'rows')).toEqual([])
    expect(listItems({ items: 'not a list' })).toEqual([])
  })
})

describe('requestDelete (strict deletes, api 0.3.0)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    tradeOperatorStore.clear()
    closeTradeOperatorDialog()
  })

  it('returns the body with how it was deleted', async () => {
    fetchMock.mockResolvedValue(json({ deleted: 'hard', strategy_plan_id: 12, ok: true }))
    await expect(requestDelete('/api/account/strategies/plans/12')).resolves.toEqual({
      deleted: 'hard',
      strategy_plan_id: 12,
      ok: true,
    })
    expect(initOf(fetchMock.mock.calls[0]).method).toBe('DELETE')
  })

  it('keeps a soft delete soft', async () => {
    fetchMock.mockResolvedValue(json({ deleted: 'soft', strategy_structure_id: 3, ok: true }))
    expect((await requestDelete('/api/account/strategies/structures/3')).deleted).toBe('soft')
  })

  it('reads a 404 that names the row as already gone', async () => {
    fetchMock.mockResolvedValue(json({ detail: 'No plan 12.', ok: false, error: 'No plan 12.' }, 404))
    await expect(requestDelete('/api/account/strategies/plans/12')).resolves.toEqual({
      deleted: 'gone',
      detail: 'No plan 12.',
    })
  })

  it("still throws on a route miss (FastAPI's bare Not Found) or a 404 with no reason", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'Not Found' }, 404))
    expect((await caught(requestDelete('/api/account/nope'))).status).toBe(404)
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
    expect((await caught(requestDelete('/api/account/nope'))).status).toBe(404)
  })

  it('throws the 409 and 503 reasons', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'It has 2 trades; a rule with trades stays.', ok: false }, 409))
    const e = await caught(requestDelete('/api/account/strategies/opportunities/5'))
    expect(e.status).toBe(409)
    expect(e.message).toBe('It has 2 trades; a rule with trades stays.')
    fetchMock.mockResolvedValueOnce(
      json({ detail: 'Cannot write strategy instance 7: the Golden Source is unreachable.', ok: false }, 503),
    )
    await expect(requestDelete('/api/account/strategies/instances/7')).rejects.toThrow('Golden Source is unreachable')
  })
})
