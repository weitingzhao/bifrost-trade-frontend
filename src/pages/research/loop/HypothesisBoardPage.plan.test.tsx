// @vitest-environment jsdom
/**
 * TD-177 ratchet: the hypothesis card's ＋ Plan opens the plan sheet and the
 * draft it saves carries source_kind 'hypothesis' with the card's id — the
 * pair Research reads to link the filled trade back (TD-143). The write is a
 * mock: nothing reaches an API.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'

// Invented hypotheses.
function hyp(over: Partial<Hypothesis>): Hypothesis {
  return {
    id: 'hyp-x',
    title: 'Invented belief',
    thesis: 'An invented thesis.',
    symbols: [],
    tags: [],
    status: 'active',
    origin_page: null,
    origin_ref: null,
    linked_opportunity_ids: [],
    linked_backtest_ids: [],
    conclusion: null,
    created_at: '2026-09-20T14:00:00Z',
    updated_at: '2026-09-20T14:00:00Z',
    retired_at: null,
    ...over,
  }
}

const ROWS: Hypothesis[] = [
  hyp({ id: 'qqq-holds-range-0001', title: 'QQQ holds its range', symbols: ['qqq'] }),
  hyp({ id: 'pair-call-0002', title: 'Two names move together', symbols: ['AAA', 'BBB'] }),
  hyp({ id: 'old-call-0003', title: 'An archived call', symbols: ['CCC'], status: 'archived' }),
]

const createMutate = vi.fn()

vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  listHypotheses: async () => ({ rows: ROWS, count: ROWS.length, limit: 100, offset: 0 }),
}))
vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  listResearchDrafts: async () => ({ rows: [], count: 0 }),
}))
vi.mock('@/lib/scrollWhenPresent', () => ({ scrollWhenPresent: () => () => {}, flashFound: () => {} }))
vi.mock('@/hooks/usePlanAccounts', () => ({
  usePlanAccounts: () => ({ defaultAccount: 'U1', accounts: ['U1'] }),
}))
vi.mock('@/hooks/useStrategies', () => ({
  useStructures: () => ({ data: { items: [] } }),
}))
vi.mock('@/hooks/useStrategyPlans', () => ({
  useCreateStrategyPlan: () => ({ mutate: createMutate, isPending: false, error: null }),
  useUpdateStrategyPlan: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useIntendStrategyPlan: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/pages/trade/plans/usePlanBacking', () => ({
  usePlanBacking: () => ({ account: null, sharesHeld: null, spot: null, ceiling: 0.5, intendedCash: 0 }),
}))
vi.mock('@/pages/trade/plans/MemoryHintLine', () => ({ MemoryHintLine: () => null }))

import HypothesisBoardPage from './HypothesisBoardPage'
import { PlanForm } from '@/pages/trade/plans/PlanForm'
import { planSeedFromParams } from '@/lib/plans/planSeed'

/** What Trade › Plans does with `?new=1&source_kind=…`: the sheet, seeded. */
function PlansSheet() {
  const [params] = useSearchParams()
  return <PlanForm editing={null} seed={planSeedFromParams(params)} onDone={() => {}} onCancel={() => {}} />
}

function renderBoard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/research/loop/hypotheses']}>
        <Routes>
          <Route path="/research/loop/hypotheses" element={<HypothesisBoardPage />} />
          <Route path="/trade/plans" element={<PlansSheet />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function cardOf(container: HTMLElement, id: string): Promise<HTMLElement> {
  await waitFor(() => expect(container.querySelector(`[data-hypothesis-id="${id}"]`)).not.toBeNull())
  return container.querySelector(`[data-hypothesis-id="${id}"]`) as HTMLElement
}

beforeEach(() => createMutate.mockReset())

describe('Hypothesis card — ＋ Plan (TD-177)', () => {
  it('saves a draft whose source is this hypothesis, its one symbol pre-filled', async () => {
    const { container } = renderBoard()
    const card = await cardOf(container, 'qqq-holds-range-0001')
    await userEvent.click(within(card).getByRole('link', { name: /Plan a trade from QQQ holds its range/ }))
    expect(screen.getByLabelText('Source ref')).toHaveValue('qqq-holds-range-0001')
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    expect(createMutate).toHaveBeenCalledTimes(1)
    const body = createMutate.mock.calls[0][0]
    expect(body.source_kind).toBe('hypothesis')
    expect(body.source_ref).toBe('qqq-holds-range-0001')
    expect(body.symbol).toBe('QQQ')
  })

  it('leaves the symbol to the reader when the hypothesis names several', async () => {
    const { container } = renderBoard()
    const card = await cardOf(container, 'pair-call-0002')
    await userEvent.click(within(card).getByRole('link', { name: /Plan a trade from/ }))
    const symbol = screen.getByPlaceholderText('NVDA')
    expect(symbol).toHaveValue('')
    await userEvent.type(symbol, 'bbb')
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }))
    const body = createMutate.mock.calls[0][0]
    expect(body.source_kind).toBe('hypothesis')
    expect(body.source_ref).toBe('pair-call-0002')
    expect(body.symbol).toBe('BBB')
  })

  it('offers no Plan on an archived hypothesis', async () => {
    const { container } = renderBoard()
    const card = await cardOf(container, 'old-call-0003')
    expect(within(card).queryByRole('link', { name: /Plan a trade from/ })).toBeNull()
  })
})
