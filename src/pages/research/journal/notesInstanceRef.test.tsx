import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const open = vi.fn()
vi.mock('@/hooks/useInstanceIndex', () => ({ useInstanceIndex: () => new Set([159]) }))
vi.mock('@/layout/instanceGo', () => ({
  useOpenInstance: () => open,
  instanceHowFrom: () => ({ fresh: false, page: false }),
}))

import { InstanceNoteRef } from './NotesView'

describe('a note’s instance link (Rev .103)', () => {
  it('opens the Instance surface when the book holds the number', () => {
    const { getByRole } = render(
      <MemoryRouter>
        <InstanceNoteRef raw="159" className="" />
      </MemoryRouter>,
    )
    fireEvent.click(getByRole('button', { name: '#159' }))
    expect(open).toHaveBeenCalledWith(159, { from: 'Journal', fresh: false, page: false })
  })

  it('goes to Positions when the book has lost it', () => {
    const { getByRole } = render(
      <MemoryRouter>
        <InstanceNoteRef raw="#88" className="" />
      </MemoryRouter>,
    )
    expect(getByRole('link', { name: '#88' }).getAttribute('href')).toBe('/portfolio/positions?inst=88')
  })
})
