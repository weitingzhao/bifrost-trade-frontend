import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TransferPayDownstream } from './TransferPayDownstream'

/**
 * The ruling, and the truth about who reads these rows: Performance's Return
 * basis once the stored net liquidation has two closes (api 0.12.0, TD-138);
 * nothing against an API that does not serve it. Both lines are asserted.
 */
describe('TransferPayDownstream', () => {
  function renderIt(navSessions?: readonly string[] | null) {
    return render(
      <MemoryRouter>
        <TransferPayDownstream navSessions={navSessions} />
      </MemoryRouter>,
    )
  }

  it('states the ruling: performance is measured net of these flows', () => {
    renderIt(['2031-03-03', '2031-03-04'])
    expect(screen.getByText('Ruled: performance is measured net of these.')).toBeInTheDocument()
    expect(screen.getByText(/balance change less deposits plus withdrawals/)).toBeInTheDocument()
    expect(screen.getByText(/time-weighted, cut into sub-periods/)).toBeInTheDocument()
  })

  it('says Performance reads them once two closes are stored', () => {
    renderIt(['2031-03-03', '2031-03-04'])
    expect(screen.getByText('Read by Performance.')).toBeInTheDocument()
    expect(screen.getByText(/since 03MAR31 — 2 sessions so far/)).toBeInTheDocument()
    expect(screen.queryByText('Not wired yet.')).not.toBeInTheDocument()
  })

  it('says it is wired but not readable on one close', () => {
    renderIt(['2031-03-04'])
    expect(screen.getByText('Wired, not yet readable.')).toBeInTheDocument()
  })

  it('states the gap when the API does not serve the stored net liquidation', () => {
    renderIt(null)
    expect(screen.getByText('Not wired yet.')).toBeInTheDocument()
    expect(screen.getByText(/Nothing in\s+code subtracts them today/)).toBeInTheDocument()
  })

  it('keeps the Performance link', () => {
    renderIt(null)
    const link = screen.getByRole('link', { name: /Return basis → Performance/ })
    expect(link).toHaveAttribute('href', '/portfolio/performance')
  })
})
