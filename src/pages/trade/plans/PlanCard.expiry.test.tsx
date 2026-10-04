// @vitest-environment jsdom
/**
 * Extend 7 days / Re-issue intent (TD-15): PATCH `{expires_at}` on the intent.
 * The PUT they used refused anything but a draft, so both buttons always failed
 * with 409; api 0.3.0's PATCH takes `expires_at` on an intended plan. The card
 * reads the plan the PATCH answers, so it turns back into an intent at once.
 * Every id and value here is invented.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { useStrategyPlans, withPlan } from '@/hooks/useStrategyPlans'
import { extendedExpiry } from './planCardModel'

vi.mock('@/hooks/useStrategies', () => ({
  useTrades: () => ({ data: { items: [] } }),
  useOpportunities: () => ({ data: { items: [] } }),
  useAllocations: () => ({ data: { items: [] } }),
}))

import { PlanCard } from './PlanCard'

function plan(over: Partial<StrategyPlan>): StrategyPlan {
  return {
    strategy_plan_id: 9,
    account_id: 'U0000001',
    symbol: 'ZZQ',
    structure_label: 'Cash-secured put',
    strategy_structure_id: null,
    strategy_opportunity_id: null,
    legs_json: [],
    qty: 1,
    price_effect: 'credit',
    limit_price: null,
    target_kind: null,
    target_value: null,
    stop_kind: null,
    stop_value: null,
    exit_by: null,
    rationale: null,
    source_kind: 'manual',
    source_ref: null,
    source_json: [],
    status: 'intended',
    effective_status: 'intended',
    expires_at: '2026-01-02T00:00:00Z',
    intended_at: '2025-12-26T12:00:00Z',
    filled_at: null,
    cancelled_at: null,
    trade_id: null,
    parent_strategy_plan_id: null,
    created_at: '2025-12-26T12:00:00Z',
    updated_at: '2025-12-26T12:00:00Z',
    ...over,
  }
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** The page's wiring: the card reads its plan from the list query. */
function Harness() {
  const q = useStrategyPlans()
  const p = q.data?.items.find((x) => x.strategy_plan_id === 9)
  return p ? <PlanCard plan={p} accounts={[]} onClose={() => undefined} /> : null
}

function renderHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A store holding plan 9 as `before` until a PATCH of it, then as `after` (what the PATCH answers). */
function serve(before: StrategyPlan, after: StrategyPlan) {
  let stored = before
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input)
    if (init?.method === 'PATCH' && url.endsWith('/strategies/plans/9')) {
      stored = after
      return json(after)
    }
    if (url.includes('/strategies/plans')) return json({ items: [stored], count: 1 })
    return json({ detail: `unexpected ${url}` }, 500)
  })
}

function patchCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('PlanCard · expiry writes are a PATCH of expires_at', () => {
  it('Re-issue intent PATCHes {expires_at} alone and the expired card reads as an intent again', async () => {
    const want = extendedExpiry(new Date().toISOString())
    const extended = plan({ effective_status: 'intended', expires_at: `${want}T00:00:00Z` })
    serve(plan({ effective_status: 'expired' }), extended)
    renderHarness()

    await userEvent.click(await screen.findByRole('button', { name: 'Re-issue intent' }))

    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    const [url, init] = patchCalls()[0]
    expect(String(url)).toContain('/api/account/strategies/plans/9')
    expect(JSON.parse(String(init?.body))).toEqual({ expires_at: want })
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(false)

    // The answer is the plan as stored: the card is an intent with the new expiry.
    expect(await screen.findByRole('button', { name: 'Extend 7 days' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Re-issue intent' })).toBeNull()
    expect(screen.getByText(new RegExp(`"expires_at": "${want}T00:00:00Z"`))).toBeTruthy()
  })

  it('Extend 7 days sends the same PATCH on a live intent', async () => {
    const want = extendedExpiry(new Date().toISOString())
    const extended = plan({ expires_at: `${want}T00:00:00Z` })
    serve(plan({}), extended)
    renderHarness()

    await userEvent.click(await screen.findByRole('button', { name: 'Extend 7 days' }))

    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    expect(JSON.parse(String(patchCalls()[0][1]?.body))).toEqual({ expires_at: want })
    expect(await screen.findByText(new RegExp(`"expires_at": "${want}T00:00:00Z"`))).toBeTruthy()
  })

  it("shows the server's reason when the PATCH is refused", async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      if (init?.method === 'PATCH') {
        return json({ detail: 'This plan is filled, and cannot be edited.', ok: false }, 409)
      }
      return json({ items: [plan({})], count: 1 })
    })
    renderHarness()
    await userEvent.click(await screen.findByRole('button', { name: 'Extend 7 days' }))
    expect(await screen.findByText('This plan is filled, and cannot be edited.')).toBeTruthy()
  })
})

describe('withPlan', () => {
  it('puts the PATCH answer in place of the cached copy, by id, and nothing else', () => {
    const other = plan({ strategy_plan_id: 8 })
    const next = plan({ expires_at: '2026-02-01T00:00:00Z' })
    const out = withPlan({ items: [other, plan({})], count: 2 }, next)
    expect(out?.items).toEqual([other, next])
    expect(withPlan(undefined, next)).toBeUndefined()
  })
})
