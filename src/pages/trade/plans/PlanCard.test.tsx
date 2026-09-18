// @vitest-environment jsdom
/**
 * Link fill shortlist: opportunity.symbols, never a name substring.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import type { StrategyInstance } from '@/types/strategy'

const instances: StrategyInstance[] = [
  {
    strategy_instance_id: 11,
    strategy_opportunity_id: 1,
    account_id: 'U1',
    label: 'MU cash-secured put',
    notes: null,
    opened_at: '2026-09-16T10:00:00Z',
    opened_at_epoch: 1,
    created_at: '2026-09-16T10:00:00Z',
    created_at_epoch: 1,
    updated_at: null,
    strategy_opportunity_name: 'MU cash-secured put',
    strategy_structure_id: null,
    strategy_structure_name: null,
    executions_count: 1,
  },
  {
    strategy_instance_id: 22,
    strategy_opportunity_id: 2,
    account_id: 'U1',
    label: 'Premium MU lookalike book',
    notes: null,
    opened_at: '2026-09-16T11:00:00Z',
    opened_at_epoch: 2,
    created_at: '2026-09-16T11:00:00Z',
    created_at_epoch: 2,
    updated_at: null,
    strategy_opportunity_name: 'Premium MU lookalike book',
    strategy_structure_id: null,
    strategy_structure_name: null,
    executions_count: 1,
  },
]

vi.mock('@/hooks/useStrategies', () => ({
  useStrategyInstances: () => ({ data: { items: instances } }),
  useOpportunities: () => ({
    data: {
      items: [
        { strategy_opportunity_id: 1, symbols: ['MU'] },
        { strategy_opportunity_id: 2, symbols: ['NVDA'] },
      ],
    },
  }),
  useAllocations: () => ({ data: { items: [] } }),
}))

vi.mock('@/hooks/useStrategyPlans', () => ({
  useIntendStrategyPlan: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useCancelStrategyPlan: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useLinkStrategyPlanFill: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useUpdateStrategyPlan: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

import { PlanCard } from './PlanCard'

function intendedMu(): StrategyPlan {
  return {
    strategy_plan_id: 9,
    account_id: 'U1',
    symbol: 'MU',
    structure_label: 'Cash-secured put',
    strategy_structure_id: null,
    strategy_opportunity_id: null,
    legs_json: [],
    qty: 1,
    price_effect: 'credit',
    limit_price: null,
    target_kind: 'credit_pct',
    target_value: 50,
    stop_kind: null,
    stop_value: null,
    exit_by: null,
    rationale: null,
    source_kind: 'manual',
    source_ref: null,
    source_json: [],
    status: 'intended',
    effective_status: 'intended',
    expires_at: null,
    intended_at: '2026-09-15T12:00:00Z',
    filled_at: null,
    cancelled_at: null,
    strategy_instance_id: null,
    parent_strategy_plan_id: null,
    created_at: '2026-09-15T12:00:00Z',
    updated_at: '2026-09-15T12:00:00Z',
  }
}

describe('PlanCard link fill', () => {
  it('does not offer an instance whose name contains MU but whose opportunity does not list MU', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PlanCard plan={intendedMu()} onClose={() => undefined} onEdit={() => undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Link fill' }))
    expect(screen.getByText('MU cash-secured put')).toBeTruthy()
    expect(screen.queryByText('Premium MU lookalike book')).toBeNull()
  })
})

describe('PlanCard · the reserved order route', () => {
  function renderCard() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PlanCard plan={intendedMu()} onClose={() => undefined} onEdit={() => undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('draws Send to IB on an intent and leaves it disabled', () => {
    // Drawn rather than hidden: omitting it reads as "there is no such thing"
    // when the truth is that it exists and is not connected. D10 governs until
    // it does.
    renderCard()
    const send = screen.getByRole('button', { name: /Send to IB/ })
    expect(send.hasAttribute('disabled')).toBe(true)
    expect(send.textContent).toContain('not wired')
  })

  it('says a plan no opportunity covers is outside the rules', () => {
    renderCard()
    expect(screen.getByText(/No opportunity covers MU/)).toBeTruthy()
    expect(screen.getByText('OUTSIDE RULES')).toBeTruthy()
  })
})
