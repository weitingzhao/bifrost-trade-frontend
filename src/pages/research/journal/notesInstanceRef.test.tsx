import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const open = vi.fn()
vi.mock('@/hooks/useInstanceIndex', () => ({ useInstanceIndex: () => new Set([159]) }))
vi.mock('@/layout/tradeGo', () => ({
  useOpenTrade: () => open,
  tradeHowFrom: () => ({ fresh: false, page: false }),
}))

import { InstanceNoteRef } from './NotesView'
import { otherEnvOfTradeRef } from '@/api/research/journal'

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

  it('shows another environment’s trade as text, never as one of this environment’s (TD-73)', () => {
    open.mockClear()
    const { getByText, queryByRole } = render(
      <MemoryRouter>
        <InstanceNoteRef raw="dev:159" className="" />
      </MemoryRouter>,
    )
    expect(getByText('dev:159').getAttribute('title')).toContain('DEV')
    expect(queryByRole('button')).toBeNull()
    expect(queryByRole('link')).toBeNull()
    expect(open).not.toHaveBeenCalled()
  })
})

describe('otherEnvOfTradeRef (TD-73)', () => {
  it('names the environment of a qualified trade ref only', () => {
    expect(otherEnvOfTradeRef({ type: 'trade', id: 'dev:159' })).toBe('dev')
    expect(otherEnvOfTradeRef({ type: 'inst', id: 'prod:7' })).toBe('prod')
    expect(otherEnvOfTradeRef({ type: 'trade', id: '159' })).toBeNull()
    expect(otherEnvOfTradeRef({ type: 'sym', id: 'dev:159' })).toBeNull()
  })
})
