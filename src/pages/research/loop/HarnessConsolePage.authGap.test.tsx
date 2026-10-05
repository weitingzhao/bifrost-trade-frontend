// @vitest-environment jsdom
/**
 * Signed out, the console's Research reads answer 401 (Research step 4): trust,
 * standing, objectives, runs. One line says the Research user is not set; the
 * Trust chip reads «—» rather than "not L0", the objective list and the runs
 * step aside rather than claiming "No active objectives" or "no run today",
 * and nothing is drawn as a red failure.
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
  fetchPolicyTemplates: refuse('Templates'),
}))
vi.mock('@/hooks/useCopilotStanding', () => ({ useCopilotStanding: () => ({ data: undefined }) }))
vi.mock('@/pages/research/loop/pilot/DeskHeaderChips', () => ({ ProviderChip: () => null, SpendChip: () => null }))
vi.mock('@/pages/research/loop/pilot/PilotDeskSections', () => ({ PilotConversations: () => null, PilotToday: () => null }))
vi.mock('@/pages/research/loop/pilot/ProposedFromMemory', () => ({ ProposedFromMemory: () => null }))
vi.mock('@/components/research/UniverseReachStrip', () => ({ UniverseReachStrip: () => null }))

import HarnessConsolePage from './HarnessConsolePage'

describe('HarnessConsolePage — signed out', () => {
  it('reads as not signed in, never as an idle loop', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/research/loop/harness']}>
          <HarnessConsolePage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getAllByText(RESEARCH_AUTH_NOT_SET_LINE).length).toBeGreaterThan(0))
    await waitFor(() => expect(screen.getByText('Trust —')).toBeTruthy())
    expect(screen.queryByText(/Trust not L0/)).toBeNull()
    expect(screen.queryByText('No active objectives')).toBeNull()
    expect(screen.queryByText(/no run today yet/)).toBeNull()
    expect(screen.queryByText('Failed to load data')).toBeNull()
    expect(screen.queryByText(/Trust is not L0/)).toBeNull()
  })
})
