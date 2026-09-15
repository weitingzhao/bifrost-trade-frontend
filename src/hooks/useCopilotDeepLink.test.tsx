// @vitest-environment jsdom
/**
 * "Ask the Copilot" left the menu (Design 2026-09-14 ①) — it is a command,
 * not a page — but `?copilot=open` stays as the deep-link convention. This
 * pins half of that promise: the flag opens the panel and strips itself.
 * The other half — `/research` carrying the search onto Overview — is pinned
 * in `router.test.tsx`.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useCopilotDeepLink } from './useCopilotDeepLink'

const openResearchCopilot = vi.hoisted(() => vi.fn())
vi.mock('@/lib/harness/loopCopilotPrefill', () => ({
  openResearchCopilot,
}))

function DeepLinkHost() {
  useCopilotDeepLink()
  const location = useLocation()
  return <div data-testid="search">{location.search}</div>
}

describe('?copilot=open deep link', () => {
  it('opens the panel once and strips itself from the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/portfolio/positions?copilot=open&keep=1']}>
        <Routes>
          <Route path="/portfolio/positions" element={<DeepLinkHost />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(openResearchCopilot).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByTestId('search').textContent).toBe('?keep=1'),
    )
  })
})
