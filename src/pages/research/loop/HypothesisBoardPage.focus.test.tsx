// @vitest-environment jsdom
/**
 * `?h=<id>` opens the board on that card: ringed (aria-current), its thesis
 * whole instead of cut to one sentence. A card the board cannot show says why.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Hypothesis } from '@/api/researchHypothesis'

// Invented hypotheses.
const ROWS: Hypothesis[] = [
  {
    id: 'hyp-a',
    title: 'ZZZ holds its range',
    thesis: 'First sentence of A. Second sentence of A.',
    symbols: ['ZZZ'],
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
  },
  {
    id: 'hyp-b',
    title: 'YYY rich vol persists',
    thesis: 'First sentence of B. The second sentence of B only shows when the card is opened.',
    symbols: ['YYY'],
    tags: [],
    status: 'active',
    origin_page: null,
    origin_ref: null,
    linked_opportunity_ids: [],
    linked_backtest_ids: [],
    conclusion: null,
    created_at: '2026-09-21T14:00:00Z',
    updated_at: '2026-09-21T14:00:00Z',
    retired_at: null,
  },
]

vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  listHypotheses: async () => ({ rows: ROWS, count: ROWS.length, limit: 100, offset: 0 }),
}))
vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  listResearchDrafts: async () => ({ rows: [], count: 0 }),
}))
vi.mock('@/lib/scrollWhenPresent', () => ({ scrollWhenPresent: () => () => {}, flashFound: () => {} }))

import HypothesisBoardPage from './HypothesisBoardPage'

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.search}</output>
}

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <HypothesisBoardPage />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HypothesisBoardPage — ?h=', () => {
  it('rings the named card and reads its thesis whole', async () => {
    const { container } = renderAt('/research/loop/hypotheses?h=hyp-b')
    await waitFor(() => expect(container.querySelector('[data-hypothesis-id="hyp-b"]')).not.toBeNull())
    const b = container.querySelector('[data-hypothesis-id="hyp-b"]')
    const a = container.querySelector('[data-hypothesis-id="hyp-a"]')
    expect(b?.getAttribute('aria-current')).toBe('true')
    expect(a?.getAttribute('aria-current')).toBeNull()
    expect(b?.textContent).toContain('only shows when the card is opened')
    expect(a?.textContent).not.toContain('Second sentence of A')
  })

  it('says so when the id is not on the board', async () => {
    renderAt('/research/loop/hypotheses?h=hyp-gone')
    await waitFor(() => expect(screen.getByText('Hypothesis hyp-gone is not on the board as it stands')).toBeTruthy())
  })
  it('a card the ?lane= hides says so, and Show all lanes puts the lane back in the URL', async () => {
    const { container } = renderAt('/research/loop/hypotheses?h=hyp-b&lane=validated')
    await waitFor(() => expect(screen.getByText('The lane picked hides it.')).toBeTruthy())
    expect(container.querySelector('[data-hypothesis-id="hyp-b"]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show all lanes' }))
    await waitFor(() => expect(container.querySelector('[data-hypothesis-id="hyp-b"]')).not.toBeNull())
    expect(screen.getByTestId('where').textContent).toBe('?h=hyp-b')
    expect(container.querySelector('[data-hypothesis-id="hyp-b"]')?.getAttribute('aria-current')).toBe('true')
  })
})
