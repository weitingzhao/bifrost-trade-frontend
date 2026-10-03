// @vitest-environment jsdom
/**
 * What the Plans desk must not do, and what it must say.
 *
 * The two order-intent entries in the prototype stay out (D10), the two columns
 * nothing computes say so instead of showing a number, a refusal is shown in the
 * server's words, and a filled plan offers no action.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

const fetchStrategyPlans = vi.fn()
const intendStrategyPlan = vi.fn()

vi.mock('@/api/strategyPlans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/strategyPlans')>()
  return {
    ...actual,
    fetchStrategyPlans: (...args: unknown[]) => fetchStrategyPlans(...args),
    intendStrategyPlan: (...args: unknown[]) => intendStrategyPlan(...args),
  }
})

vi.mock('@/hooks/useMonitorStatus', () => ({
  useMonitorStatus: () => ({ data: undefined, isLoading: false, isError: false }),
}))

vi.mock('@/hooks/useStrategies', () => ({
  useStructures: () => ({ data: { items: [] } }),
  useTrades: () => ({ data: { items: [] } }),
  useOpportunities: () => ({ data: { items: [] } }),
  useAllocations: () => ({ data: { items: [] } }),
}))

import TradePlansPage from './TradePlansPage'

function plan(over: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    strategy_plan_id: 1,
    account_id: 'U1',
    symbol: 'NVDA',
    structure_label: 'Cash-secured put',
    strategy_structure_id: null,
    strategy_opportunity_id: null,
    legs_json: [
      {
        side: 'sell',
        sec_type: 'OPT',
        right: 'P',
        strike: 180,
        expiry: '2026-11-20',
        ratio: 1,
        contract_key: null,
        mid_at_plan: null,
        quote_asof: null,
      },
    ],
    qty: 2,
    price_effect: 'credit',
    limit_price: 3.4,
    target_kind: null,
    target_value: null,
    stop_kind: null,
    stop_value: null,
    exit_by: null,
    rationale: null,
    source_kind: 'manual',
    source_ref: null,
    source_json: [],
    status: 'draft',
    effective_status: 'draft',
    expires_at: null,
    intended_at: null,
    filled_at: null,
    cancelled_at: null,
    trade_id: null,
    parent_strategy_plan_id: null,
    created_at: '2026-09-15T12:00:00Z',
    updated_at: '2026-09-15T12:00:00Z',
    ...over,
  }
}

function renderPage(route = '/trade/plans') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <TradePlansPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Trading › Plans', () => {
  it('offers no way to place an order', async () => {
    fetchStrategyPlans.mockResolvedValue({ items: [plan()], count: 1 })
    renderPage()
    expect(await screen.findByText('Cash-secured put')).toBeTruthy()
    expect(screen.queryByText(/Create order intent/i)).toBeNull()
    // Import from Inbox is a signpost to the Decision Inbox, not a write —
    // the prototype's own button navigates there.
    expect(
      screen.getByRole('link', { name: /Import from Inbox/ }).getAttribute('title'),
    ).toContain('opens the Decision Inbox')
    expect(screen.getByRole('button', { name: /Plan a trade/ })).toBeTruthy()
  })

  it('shows the cash a secured put reserves, and says pressure is not computed', async () => {
    fetchStrategyPlans.mockResolvedValue({ items: [plan()], count: 1 })
    renderPage()
    // Cash / margin is read off the plan's own legs (Rev .84, business first):
    // strike 180 × 100 × ratio 1 × qty 2 — not a margin estimate, and titled so.
    const cash = await screen.findByTitle('Cash secured: strike × 100 × ratio × qty')
    expect(cash.textContent).toBe('$36,000')
    // Pressure after needs a per-plan margin, which nothing estimates.
    const cells = await screen.findAllByText('Not computed')
    expect(cells).toHaveLength(1)
    for (const cell of cells) {
      expect(cell.getAttribute('title')).toBe(
        'Needs a per-plan margin estimate; no service computes it yet.',
      )
      expect(cell.className).toContain('text-muted-foreground')
    }
    // The prototype's footnote named a 70% ceiling; the desk's is 50% and set
    // elsewhere, so no ceiling is quoted here at all.
    expect(screen.queryByText(/70%/)).toBeNull()
  })

  it('says what a draft lacks before it can be marked intended, and holds nothing', async () => {
    // Mark intended is held behind its toast (Rev .138), so the reason the
    // server would give is said at once, in its words, and nothing is sent.
    fetchStrategyPlans.mockResolvedValue({ items: [plan()], count: 1 })
    renderPage('/trade/plans?plan=1')
    const intend = await screen.findByRole('button', { name: 'Mark intended' })
    await userEvent.click(intend)
    await waitFor(() =>
      expect(
        screen.getByText(
          'Write a target, a stop or an exit-by date. Without one there is nothing to compare the outcome against.',
        ),
      ).toBeTruthy(),
    )
    expect(intendStrategyPlan).not.toHaveBeenCalled()
  })

  it('leaves a filled plan read-only', async () => {
    fetchStrategyPlans.mockResolvedValue({
      items: [
        plan({
          status: 'filled',
          effective_status: 'filled',
          filled_at: '2026-09-16T14:30:00Z',
          trade_id: 77,
        }),
      ],
      count: 1,
    })
    renderPage('/trade/plans?plan=1')
    expect(await screen.findByRole('dialog', { name: 'Plan' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark intended' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete draft' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Plan' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Link fill' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  })
})
