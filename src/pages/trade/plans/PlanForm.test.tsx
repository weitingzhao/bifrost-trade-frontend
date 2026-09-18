// @vitest-environment jsdom
/**
 * The form does not pick buy or sell for the reader.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

const createMutate = vi.fn()
const updateMutate = vi.fn()

vi.mock('@/hooks/usePlanAccounts', () => ({
  usePlanAccounts: () => ({ defaultAccount: 'U1', accounts: ['U1'] }),
}))

vi.mock('@/hooks/useStrategies', () => ({
  useStructures: () => ({ data: { items: [] } }),
}))

vi.mock('@/hooks/useStrategyPlans', () => ({
  useCreateStrategyPlan: () => ({ mutate: createMutate, isPending: false, error: null }),
  useUpdateStrategyPlan: () => ({ mutate: updateMutate, isPending: false, error: null }),
}))

import { PlanForm } from './PlanForm'

function plan(over: Partial<StrategyPlan> = {}): StrategyPlan {
  return {
    strategy_plan_id: 4,
    account_id: 'U1',
    symbol: 'NVDA',
    structure_label: 'Unspecified',
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
    source_kind: 'symbol',
    source_ref: 'symbol',
    source_json: [{ kind: 'contract', text: 'NVDA 2026-11-20 245C' }],
    status: 'draft',
    effective_status: 'draft',
    expires_at: null,
    intended_at: null,
    filled_at: null,
    cancelled_at: null,
    strategy_instance_id: null,
    parent_strategy_plan_id: null,
    created_at: '2026-09-15T12:00:00Z',
    updated_at: '2026-09-15T12:00:00Z',
    ...over,
  }
}

function renderForm(editing: StrategyPlan | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PlanForm editing={editing} onDone={() => undefined} onCancel={() => undefined} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  createMutate.mockReset()
  updateMutate.mockReset()
})

describe('PlanForm sides', () => {
  it('adds a contract leg with an empty side', async () => {
    renderForm(plan())
    await userEvent.click(screen.getByRole('button', { name: /Add leg from NVDA 2026-11-20 245C/ }))
    const side = screen.getByLabelText('Leg 1 side') as HTMLSelectElement
    expect(side.value).toBe('')
    expect(screen.getByLabelText('Leg 1 strike')).toHaveValue('245')
    expect(screen.getByLabelText('Leg 1 expiry')).toHaveValue('2026-11-20')
  })

  it('refuses to save a written leg whose side is still empty', async () => {
    renderForm(plan())
    await userEvent.click(screen.getByRole('button', { name: /Add leg from NVDA 2026-11-20 245C/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(updateMutate).not.toHaveBeenCalled()
    expect(screen.getByText('Choose buy or sell')).toBeTruthy()
  })
})
