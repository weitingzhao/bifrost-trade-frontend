// @vitest-environment jsdom
/**
 * Signed out, the pool, the runs and the outcomes answer 401 (Research step 4).
 * The pool says the Research user is not set rather than "Couldn’t load the
 * pool", the curator cell does not claim "no run recorded", and the outcome
 * strip names the missing user rather than "unavailable".
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

vi.mock('@/api/research/candidates', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidates')>()),
  fetchCandidates: refuse('Candidates'),
}))
vi.mock('@/api/research/harness', async (orig) => ({
  ...(await orig<typeof import('@/api/research/harness')>()),
  fetchObjectives: refuse('Objectives'),
  fetchObjectiveRuns: refuse('Runs'),
}))
vi.mock('@/api/research/candidateOutcome', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidateOutcome')>()),
  fetchCandidateOutcomeSummary: refuse('Outcome'),
  fetchCandidateOutcomeRows: refuse('Outcome rows'),
}))

import CandidatePoolPage from './CandidatePoolPage'

describe('CandidatePoolPage — signed out', () => {
  it('reads as not signed in, never as an empty pool or a failure', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CandidatePoolPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(RESEARCH_AUTH_NOT_SET_LINE).length).toBeGreaterThanOrEqual(2))
    expect(screen.queryByText('Couldn’t load the pool')).toBeNull()
    expect(screen.queryByText('No candidates')).toBeNull()
    expect(screen.queryByText(/no run recorded/)).toBeNull()
    expect(screen.getByText(/runs not read — Research user not set/)).toBeTruthy()
    expect(screen.queryByText('Outcomes — unavailable')).toBeNull()
    expect(screen.getByText(/— shown/)).toBeTruthy()
    expect(screen.queryByText(/0 open in view/)).toBeNull()
  })
})
