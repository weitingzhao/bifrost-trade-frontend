// @vitest-environment jsdom
/**
 * Signed out, the hypotheses and the candidates answer 401 (Research step 4).
 * The Book says the Research user is not set; their census bands read «—»,
 * and "Waiting on you" does not list every watched name as "no thesis" against
 * hypotheses nobody read. Fixtures made up.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'

const { refuse } = vi.hoisted(() => ({
  refuse: (what: string) => async () => {
    const { HttpError } = await import('@/lib/http')
    throw new HttpError(401, `${what} HTTP 401`)
  },
}))

vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  listHypotheses: refuse('Hypotheses'),
}))
vi.mock('@/api/research/candidates', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidates')>()),
  fetchCandidates: refuse('Candidates'),
}))
vi.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    data: { items: [{ symbol: 'AAA' }, { symbol: 'BBB' }] },
    isLoading: false,
    isError: false,
    dataUpdatedAt: 1,
  }),
}))
vi.mock('./BookLoopInstrument', () => ({ BookLoopInstrument: () => null }))

import ResearchBookPage from './ResearchBookPage'

describe('ResearchBookPage — signed out', () => {
  it('reads as not signed in, and lists nothing as waiting on an unread read', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ResearchBookPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(RESEARCH_AUTH_NOT_SET_LINE).length).toBeGreaterThan(0))
    expect(screen.queryByText('Nothing is waiting on you')).toBeNull()
    expect(screen.queryByText(/no thesis/)).toBeNull()
    expect(screen.queryByText('Failed to load data')).toBeNull()
    expect(screen.getAllByText('not read — Research user not set').length).toBe(2)
    expect(screen.getByText('thesis split not read')).toBeTruthy()
    expect(screen.queryByText('0 beliefs')).toBeNull()
    expect(screen.queryByText('0 open')).toBeNull()
    expect(screen.getByText('— beliefs')).toBeTruthy()
  })
})
