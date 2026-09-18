// @vitest-environment jsdom
/**
 * The retired paths, walked the way a reader reaches them: with a query on the
 * end. `/research?copilot=open` is the one that has to keep working —
 * "Ask the Copilot" left the menu (Design 2026-09-14 ①) and the flag is now
 * the whole convention — and `/research` is a plain redirect to Overview since
 * Design 2026-09-15, so nothing hand-rolls the forward any more.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, Navigate, RouterProvider, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { INDEX_ROUTE, redirectRoutes } from './router'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="landing">{`${location.pathname}${location.search}${location.hash}`}</div>
}

function landOn(entry: string, ...pages: string[]) {
  const router = createMemoryRouter(
    [...redirectRoutes(), ...pages.map((path) => ({ path: path.slice(1), element: <LocationProbe /> }))],
    { initialEntries: [entry] },
  )
  render(<RouterProvider router={router} />)
  return screen.getByTestId('landing')
}

describe('registry-derived redirects', () => {
  it('sends /research to Overview with the search intact', async () => {
    const probe = landOn('/research?copilot=open', '/research/overview')
    await waitFor(() => expect(probe.textContent).toBe('/research/overview?copilot=open'))
  })

  it('no longer drops what the old link carried', async () => {
    const probe = landOn('/research/risk?symbol=NVDA', '/system/daemon')
    await waitFor(() => expect(probe.textContent).toBe('/system/daemon?symbol=NVDA'))
  })

  it('keeps the view the registry row names, and the hash', async () => {
    const coverage = landOn('/settings/coverage/option?q=nv', '/system/coverage')
    await waitFor(() => expect(coverage.textContent).toBe('/system/coverage?view=option&q=nv'))
  })
})

describe('the front door', () => {
  it('opens on Today, and Today is a page rather than another redirect', async () => {
    // Owner, 2026-09-17: the app opens on the action surface. Pinned here
    // because a front door that quietly moves is the kind of change nobody
    // notices until they are looking for a page that used to be first.
    expect(INDEX_ROUTE).toBe('/home')
    const router = createMemoryRouter(
      [
        { path: '/', element: <Navigate to={INDEX_ROUTE} replace /> },
        ...redirectRoutes(),
        { path: INDEX_ROUTE.slice(1), element: <LocationProbe /> },
      ],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    await waitFor(() => expect(screen.getByTestId('landing').textContent).toBe(INDEX_ROUTE))
  })
})
