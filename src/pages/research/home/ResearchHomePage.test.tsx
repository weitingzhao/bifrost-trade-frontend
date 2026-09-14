// @vitest-environment jsdom
/**
 * `/research` lands where the seat sits, and the search string rides along —
 * which is what keeps `?copilot=open` working now that "Ask the Copilot" has
 * no menu row (Design 2026-09-14 ①): the old link lands on the seat home with
 * the flag intact, and the panel opens from there.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ResearchHomePage from './ResearchHomePage'

function LocationProbe() {
  const location = useLocation()
  return (
    <div data-testid="landing">
      {location.pathname}
      {location.search}
    </div>
  )
}

describe('ResearchHomePage', () => {
  it('carries ?copilot=open through the seat-home redirect', async () => {
    render(
      <MemoryRouter initialEntries={['/research?copilot=open']}>
        <Routes>
          <Route path="/research" element={<ResearchHomePage />} />
          <Route path="/research/loop/harness" element={<LocationProbe />} />
          <Route path="/research/workbench" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('landing').textContent).toContain('?copilot=open'),
    )
  })
})
