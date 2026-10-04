// @vitest-environment jsdom
/**
 * Signed out, the drafts answer 401. The strip says so — the Research-user
 * line with Set user — and the draft segments read «—», where they used to
 * read "0 batches waiting" as if the loop had nothing for you.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { LoopOverviewStrip } from './LoopOverviewStrip'

vi.mock('@/api/researchDrafts', () => ({
  listResearchDrafts: () => Promise.reject(new HttpError(401, 'Drafts API HTTP 401')),
}))
vi.mock('@/api/research/harness', () => ({
  fetchObjectives: async () => ({ items: [{ id: 'o-1', title: 'Made-up Explorer' }], count: 1 }),
  fetchObjectiveRuns: async () => ({ items: [], count: 0 }),
}))
vi.mock('@/api/research/candidateOutcome', () => ({
  fetchCandidateOutcomeSummary: async () => ({ candidates: 0, horizons: [] }),
}))
vi.mock('@/api/researchHypothesis', () => ({
  listHypotheses: async () => ({ rows: [], count: 0 }),
}))

describe('LoopOverviewStrip, signed out', () => {
  it('says the Research user is not set and draws «—» instead of 0', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <LoopOverviewStrip />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    const waiting = screen.getByText('Waiting on you').closest('a') as HTMLElement
    expect(waiting.textContent).toContain('—')
    expect(waiting.textContent).not.toMatch(/\b0\s*batches/)
    expect(screen.getByText('— suggestions raised · — taken up')).toBeTruthy()
  })
})
