// @vitest-environment jsdom
/**
 * Signed out, every Research read on the overview answers 401 (Research step
 * 4). One line says the Research user is not set; the Inbox link, the
 * objective count, the Book's rows and the machines read «—» or "not read"
 * rather than 0 waiting, 0 objectives, 0 in pool, or "No objective is running".
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

vi.mock('@/api/research/harness', async (orig) => ({
  ...(await orig<typeof import('@/api/research/harness')>()),
  fetchObjectives: refuse('Objectives'),
  fetchObjectiveRuns: refuse('Runs'),
  fetchAutopilotStanding: refuse('Standing'),
  fetchLoopTrust: refuse('Trust'),
}))
vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  listResearchDrafts: refuse('Drafts'),
}))
vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  listHypotheses: refuse('Hypotheses'),
}))
vi.mock('@/api/research/candidates', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidates')>()),
  fetchCandidates: refuse('Candidates'),
}))
vi.mock('@/api/research/candidateOutcome', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidateOutcome')>()),
  fetchCandidateOutcomeSummary: refuse('Outcomes'),
}))
vi.mock('@/api/research/orchestration', async (orig) => ({
  ...(await orig<typeof import('@/api/research/orchestration')>()),
  fetchOrchestrationStatus: async () => ({ schedules: [] }),
}))
vi.mock('@/hooks/useCopilotStanding', () => ({ useCopilotStanding: () => ({ data: undefined }) }))
vi.mock('@/hooks/useWatchlist', () => ({ useWatchlist: () => ({ data: { items: [] } }) }))

import ResearchOverviewPage from './ResearchOverviewPage'

describe('ResearchOverviewPage — signed out', () => {
  it('reads as not signed in, never as an empty loop', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/research']}>
          <ResearchOverviewPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(RESEARCH_AUTH_NOT_SET_LINE).length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByText(/Inbox · — waiting/)).toBeTruthy())
    expect(screen.queryByText(/Inbox · 0 waiting/)).toBeNull()
    expect(screen.queryByText(/^0 objectives$/)).toBeNull()
    expect(screen.queryByText(/No objective is running/)).toBeNull()
    expect(screen.getByText('Objectives not read — Research user not set.')).toBeTruthy()
    expect(screen.queryByText(/0 in pool/)).toBeNull()
    expect(screen.queryByText(/Trust below L0/)).toBeNull()
  })
})
