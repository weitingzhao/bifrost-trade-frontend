// @vitest-environment jsdom
/**
 * Signed out, every kind of the queue answers 401. The Inbox says who is
 * missing, and its counts are «—» — the rule proposals, read off Review,
 * still answer, and used to stand alone as "2 to decide". Fixtures made up.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { HttpError } from '@/lib/http'
import { resetStoredDraftIds } from '@/lib/harness/inboxRead'
import { memoryStorage } from '@/test/memoryStorage'

vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  listAllResearchDrafts: async () => {
    throw new HttpError(401, 'Drafts API HTTP 401')
  },
}))
vi.mock('@/hooks/useHypotheses', () => ({ useHypothesisList: () => ({ data: undefined }) }))
vi.mock('@/hooks/useLoopHarness', () => ({ useObjectiveList: () => ({ data: undefined }) }))
vi.mock('@/hooks/useReviewHabits', () => ({ useReviewHabits: () => ({ habits: [], trades: [], paths: {} }) }))
vi.mock('@/pages/research/loop/proposals/proposalsModel', () => ({
  buildProposals: () => [
    { key: 'r1', thin: false },
    { key: 'r2', thin: false },
  ],
}))
vi.mock('@/pages/research/loop/proposals/RuleProposalCard', () => ({
  NO_RULES_STORE: 'no rules store',
  RuleProposalCard: ({ cardKey }: { cardKey: string }) => <div data-testid={cardKey}>rule card</div>,
}))
vi.mock('@/pages/research/loop/LeashPanel', () => ({ LeashPanel: () => null }))
vi.mock('@/components/research/NewDraftDialog', () => ({ NewDraftDialog: () => null }))

import DecisionInboxPage from './DecisionInboxPage'

/** The hero card a label sits on, as text. */
function hero(label: string): string {
  const el = screen.getByText(label)
  return (el.closest('[data-sr-kpi="hero"]') ?? el.parentElement?.parentElement)?.textContent ?? ''
}

describe('DecisionInboxPage — signed out', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    resetStoredDraftIds()
  })

  it('says the Research user is not set, and counts nothing it could not read', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/research/loop/decisions']}>
          <DecisionInboxPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    expect(hero('To decide')).toContain('—')
    expect(hero('To decide')).not.toMatch(/To decide\s*2/)
    expect(hero('Unread briefings')).toContain('—')
    expect(screen.queryByText('Couldn’t load')).toBeNull()
    // The draft destinations are unread; the rule proposals still count.
    expect(screen.getByText('Policy —')).toBeTruthy()
    expect(screen.getByText('Rules 2')).toBeTruthy()
  })
})
