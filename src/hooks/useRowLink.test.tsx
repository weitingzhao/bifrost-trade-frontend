import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useRowLink } from './useRowLink'

function Where() {
  const { pathname } = useLocation()
  return <p>at {pathname}</p>
}

function Row({ to }: { to: string }) {
  const rowLink = useRowLink()
  return (
    <table>
      <tbody>
        <tr {...rowLink(to, 'extra')}>
          <td>the row</td>
        </tr>
      </tbody>
    </table>
  )
}

function Harness({ to }: { to: string }) {
  return (
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<Row to={to} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('useRowLink', () => {
  it('opens the destination on a click', async () => {
    render(<Harness to="/risk/margin" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('at /risk/margin')).toBeTruthy()
  })

  it('opens it from the keyboard, which an onClick on a <tr> does not', async () => {
    // The reason this is a hook and not six inline lines: a table row is not
    // focusable, so a row that only listens for clicks is invisible to anyone
    // not using a mouse.
    render(<Harness to="/portfolio/accounts" />)
    const row = screen.getByRole('button')
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByText('at /portfolio/accounts')).toBeTruthy()
  })

  it('keeps the caller’s own classes beside the pointer', () => {
    render(<Harness to="/risk" />)
    const row = screen.getByRole('button')
    expect(row.className).toContain('cursor-pointer')
    expect(row.className).toContain('extra')
  })
})
