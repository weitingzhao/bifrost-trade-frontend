// @vitest-environment jsdom
/**
 * A 401 with no Research user is "not signed in", not "Couldn’t load the
 * brief" (Design 2026-09-15 Q2=A via `classifyResearchAuthError`).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '@/lib/http'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { researchAuthStore } from '@/lib/auth/researchUser'

const { digestState } = vi.hoisted(() => ({ digestState: { error: null as unknown } }))
vi.mock('@/hooks/useDailyDigest', () => ({
  useDailyDigest: () => ({
    digest: undefined,
    payload: null,
    rows: [],
    pendingCount: 0,
    isLoading: false,
    isError: true,
    error: digestState.error,
    refetch: () => Promise.resolve(),
  }),
}))

const { default: DailyBriefPage } = await import('./DailyBriefPage')

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DailyBriefPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => researchAuthStore.clear())

describe('Daily Brief when the digest read is refused', () => {
  it('reads as not signed in when no Research user is set', () => {
    researchAuthStore.clear()
    digestState.error = new HttpError(401, 'Drafts API HTTP 401')
    renderPage()
    expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy()
    expect(screen.queryByText('Couldn’t load the brief')).toBeNull()
  })

  it('still reads as a failed load for anything that is not a 401', () => {
    digestState.error = new HttpError(500, 'Drafts API HTTP 500')
    renderPage()
    expect(screen.getByText('Couldn’t load the brief')).toBeTruthy()
    expect(screen.queryByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeNull()
  })
})
