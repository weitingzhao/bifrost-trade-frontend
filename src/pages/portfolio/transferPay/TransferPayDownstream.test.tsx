import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TransferPayDownstream } from './TransferPayDownstream'

/**
 * Only writing the ruling would describe code that does not exist; only writing
 * the gap would hide a decision the Owner has made. The section is wrong with
 * either sentence missing, so both are asserted together.
 */
describe('TransferPayDownstream', () => {
  function renderIt() {
    return render(
      <MemoryRouter>
        <TransferPayDownstream />
      </MemoryRouter>,
    )
  }

  it('states the ruling: performance is measured net of these flows', () => {
    renderIt()
    expect(screen.getByText('Ruled: performance is measured net of these.')).toBeInTheDocument()
    expect(screen.getByText(/balance change less deposits plus withdrawals/)).toBeInTheDocument()
    expect(screen.getByText(/time-weighted/)).toBeInTheDocument()
  })

  it('states the gap in the same breath: nothing subtracts them today', () => {
    renderIt()
    expect(screen.getByText('Not wired yet.')).toBeInTheDocument()
    expect(screen.getByText(/Nothing in\s+code subtracts them today/)).toBeInTheDocument()
  })

  it('keeps the Performance link but calls it navigation, not evidence', () => {
    renderIt()
    const link = screen.getByRole('link', { name: /Return basis → Performance/ })
    expect(link).toHaveAttribute('href', '/portfolio/performance')
    expect(screen.getByText(/not evidence that anything reads these rows/)).toBeInTheDocument()
  })
})
