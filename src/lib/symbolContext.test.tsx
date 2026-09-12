import { describe, expect, it, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { useHeldSymbolSync, useSymbolContext, type SymbolContext } from './symbolContext'

/** A scoped route, an unscoped one, and a router we can drive. */
const SCOPED = '/portfolio/positions'
const UNSCOPED = '/portfolio/accounts'

function harness(initial: string) {
  const seen: SymbolContext[] = []
  function Probe() {
    useHeldSymbolSync()
    seen.push(useSymbolContext())
    return null
  }
  const router = createMemoryRouter([{ path: '*', element: <Probe /> }], { initialEntries: [initial] })
  render(<RouterProvider router={router} />)
  return {
    router,
    last: () => seen[seen.length - 1],
    go: async (to: string) => { await act(async () => { await router.navigate(to) }) },
  }
}

beforeEach(() => sessionStorage.clear())

describe('symbol context', () => {
  it('is scoped when the route reads the parameter and the parameter is there', () => {
    const h = harness(`${SCOPED}?symbol=nvda`)
    expect(h.last().symbol).toBe('NVDA')
    expect(h.last().isScoped).toBe(true)
    expect(h.last().isHeld).toBe(false)
  })

  it('is held on a route that does not read it', async () => {
    const h = harness(`${SCOPED}?symbol=NVDA`)
    await h.go(UNSCOPED)
    expect(h.last().symbol).toBe('NVDA')
    expect(h.last().isScoped).toBe(false)
    expect(h.last().isHeld).toBe(true)
  })

  it('carries the held symbol onto the next scoped route', async () => {
    const h = harness(`${SCOPED}?symbol=NVDA`)
    await h.go(UNSCOPED)
    await h.go(SCOPED)
    expect(h.router.state.location.search).toBe('?symbol=NVDA')
    expect(h.last().isScoped).toBe(true)
  })

  it('leaves an unscoped route alone — it neither writes nor clears', async () => {
    const h = harness(`${SCOPED}?symbol=NVDA`)
    await h.go(UNSCOPED)
    expect(h.router.state.location.search).toBe('')
  })

  // The hazard the pathname-only trigger exists for: reacting to the query
  // instead would put the symbol straight back and the filter would be
  // impossible to clear.
  it('does not undo a filter cleared in place', async () => {
    const h = harness(`${SCOPED}?symbol=NVDA`)
    await h.go(SCOPED)
    expect(h.router.state.location.search).toBe('')
    expect(h.last().isScoped).toBe(false)
    expect(h.last().isHeld).toBe(true)
  })

  it('clearing drops the held value too, so it cannot come back', async () => {
    const h = harness(`${SCOPED}?symbol=NVDA`)
    await act(async () => { h.last().clearSymbol() })
    await h.go(UNSCOPED)
    await h.go(SCOPED)
    expect(h.router.state.location.search).toBe('')
    expect(h.last().symbol).toBe('')
  })

  it('remembers a symbol that arrives by link', async () => {
    const h = harness(UNSCOPED)
    expect(h.last().symbol).toBe('')
    await h.go(`${UNSCOPED}?symbol=amd`)
    await h.go(SCOPED)
    expect(h.router.state.location.search).toBe('?symbol=AMD')
  })
})
