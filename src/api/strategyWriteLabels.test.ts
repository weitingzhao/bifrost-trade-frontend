/**
 * TD-62: the Rules inspectors' endpoint label is the request the app makes — built from
 * STRATEGY_WRITES, which the writers send. Each case stubs fetch, calls the writer and
 * checks the label against the method and path that actually went out. Ids are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STRATEGY_WRITES, createStructure, patchOpportunity, strategyWriteLabel, updateAllocation, updateStructure } from '@/api/strategy'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function sent(): string {
  const [input, init] = fetchMock.mock.calls[0]
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return `${init?.method ?? 'GET'} ${new URL(url, 'http://local').pathname}`
}

describe('the inspector label is the request that goes out', () => {
  it('allocation', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await updateAllocation(42, { name: 'x' }).catch(() => undefined)
    expect(strategyWriteLabel(STRATEGY_WRITES.allocation, 42)).toBe(sent())
    expect(sent()).toBe('PATCH /api/strategy/strategies/allocations/42')
  })

  it('opportunity', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }))
    await patchOpportunity(7, { name: 'x' }).catch(() => undefined)
    expect(strategyWriteLabel(STRATEGY_WRITES.opportunity, 7)).toBe(sent())
    expect(sent()).toBe('PATCH /api/strategy/strategies/opportunities/7')
  })

  it('structure, and its refusal names the same request', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }))
    await expect(updateStructure(9, { name: 'x' } as never)).rejects.toThrow('PUT /api/strategy/strategies/structures/9: HTTP 503')
    expect(strategyWriteLabel(STRATEGY_WRITES.structure, 9)).toBe(sent())
  })

  it('creating a structure', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 503 }))
    await expect(createStructure({ name: 'x' } as never)).rejects.toThrow('POST /api/strategy/strategies/structures: HTTP 503')
    expect(strategyWriteLabel(STRATEGY_WRITES.createStructure)).toBe(sent())
  })
})
