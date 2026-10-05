// @vitest-environment jsdom
/**
 * Signed out, the standing and the objective list answer 401. The leash says
 * the Research user is not set — on the Inbox and on the console alike — and
 * never "No active objectives" or "Trust is not L0", claims about reads that
 * did not happen.
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
  fetchAutopilotStanding: refuse('Standing'),
}))

import { LeashPanel } from './LeashPanel'

function renderLeash(home: 'inbox' | 'console') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LeashPanel home={home} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LeashPanel — signed out', () => {
  it('on the console, says who is missing instead of "No active objectives"', async () => {
    renderLeash('console')
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    expect(screen.queryByText('No active objectives.')).toBeNull()
    expect(screen.queryByText(/Trust is not L0/)).toBeNull()
  })

  it('on the Inbox, says who is missing beside the unread grant', async () => {
    renderLeash('inbox')
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    expect(screen.queryByText(/Not armed/)).toBeNull()
  })
})
