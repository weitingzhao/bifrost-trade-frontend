// @vitest-environment jsdom
/**
 * The objective is found in the objectives list, which Research step 4 gates.
 * Signed out the page says the Research user is not set, not "Couldn’t load
 * the objective" in red.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
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
  // Found in the list: the real one calls the real list from inside its module.
  fetchObjective: refuse('Objectives'),
  fetchAutopilotStanding: refuse('Standing'),
}))

import ObjectivePage from './ObjectivePage'

describe('ObjectivePage — signed out', () => {
  it('reads as not signed in', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/research/loop/objectives/obj-made-up']}>
          <Routes>
            <Route path="/research/loop/objectives/:objectiveId" element={<ObjectivePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    expect(screen.queryByText('Couldn’t load the objective')).toBeNull()
  })
})
