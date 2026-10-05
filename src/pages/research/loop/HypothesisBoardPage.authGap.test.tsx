// @vitest-environment jsdom
/**
 * Signed out, the hypothesis list answers 401 (Research step 4 gates it). The
 * board says the Research user is not set — not "Couldn’t load the board" in
 * red — and its lane counts are «—», not an empty board's zeros.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'

const { refuse } = vi.hoisted(() => ({
  refuse: (what: string) => async () => {
    const { HttpError: E } = await import('@/lib/http')
    throw new E(401, `${what} HTTP 401`)
  },
}))

vi.mock('@/api/researchHypothesis', async (orig) => ({
  ...(await orig<typeof import('@/api/researchHypothesis')>()),
  listHypotheses: refuse('Hypothesis'),
}))
vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  listResearchDrafts: refuse('Drafts'),
}))
vi.mock('@/api/research/harness', async (orig) => ({
  ...(await orig<typeof import('@/api/research/harness')>()),
  fetchObjectives: refuse('Objectives'),
  fetchObjectiveRuns: refuse('Runs'),
}))
vi.mock('@/api/research/candidates', async (orig) => ({
  ...(await orig<typeof import('@/api/research/candidates')>()),
  fetchCandidates: refuse('Candidates'),
}))

import HypothesisBoardPage from './HypothesisBoardPage'

describe('HypothesisBoardPage — signed out', () => {
  it('reads as not signed in, with «—» lane counts', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <HypothesisBoardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(RESEARCH_AUTH_NOT_SET_LINE).length).toBeGreaterThan(0))
    expect(screen.queryByText('Couldn’t load the board')).toBeNull()
    expect(screen.queryByText('No hypotheses in this lane')).toBeNull()
    const lanes = screen.getByRole('tablist', { name: 'Lane' })
    expect(lanes.textContent).not.toMatch(/\d/)
    expect(lanes.textContent).toContain('—')
  })
})
