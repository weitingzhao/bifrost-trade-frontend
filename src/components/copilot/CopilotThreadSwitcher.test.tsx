// @vitest-environment jsdom
/**
 * The 440 reading dock has no sessions rail. This menu is the switcher at
 * both widths — the test opens it with no dock-width prop at all, so a
 * regression that hides switching behind `width >= 760` cannot pass.
 */
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CopilotSessionSummary } from '@/api/researchCopilotSessions'
import { copilotSessionStore } from '@/hooks/useCopilotSession'

const rows: CopilotSessionSummary[] = [
  {
    id: 'pin-1',
    title: 'Pinned A',
    pinned: true,
    origin_symbol: 'NVDA',
    updated_at: '2026-09-13T12:00:00Z',
  },
  {
    id: 'rec-1',
    title: 'Monday thread',
    pinned: false,
    updated_at: '2026-09-14T10:00:00Z',
  },
  {
    id: 'rec-2',
    title: 'Sunday thread',
    pinned: false,
    updated_at: '2026-09-13T10:00:00Z',
  },
]

vi.mock('@/hooks/useCopilotSessions', () => ({
  useCopilotSessions: () => ({ data: rows, isLoading: false }),
}))

const openMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/copilot/openCopilotSession', () => ({
  openCopilotSession: (...args: unknown[]) => openMock(...args),
}))

import { CopilotThreadSwitcher } from './CopilotThreadSwitcher'

function renderSwitcher() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CopilotThreadSwitcher />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Switch thread' })
  await userEvent.click(trigger)
  return trigger
}

describe('CopilotThreadSwitcher', () => {
  beforeAll(() => {
    // jsdom misses these; Radix's dropdown checks pointer capture before opening.
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  })

  beforeEach(() => {
    openMock.mockClear()
    copilotSessionStore.clearSession()
  })

  afterEach(() => {
    copilotSessionStore.clearSession()
  })

  it('shows New thread on a blank session, then Pinned / Recent / New / All threads', async () => {
    renderSwitcher()
    const trigger = screen.getByRole('button', { name: 'Switch thread' })
    expect(trigger).toHaveTextContent('New thread')
    await openMenu()
    expect(await screen.findByText('Pinned')).toBeTruthy()
    expect(screen.getByText('Pinned A')).toBeTruthy()
    expect(screen.getByText('Recent')).toBeTruthy()
    expect(screen.getByText('Monday thread')).toBeTruthy()
    expect(screen.getByText('Sunday thread')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /new thread/i })).toBeTruthy()
    const all = screen.getByRole('menuitem', { name: /all threads/i })
    expect(all).toHaveAttribute('href', '/research/copilot')
  })

  it('opens a pinned row without needing a dock-width gate', async () => {
    renderSwitcher()
    await openMenu()
    fireEvent.click(await screen.findByText('Pinned A'))
    expect(openMock).toHaveBeenCalledWith('pin-1')
  })

  it('New thread clears the open session', async () => {
    copilotSessionStore.setState({
      sessionId: 'old',
      messages: [{ id: 'm1', role: 'user', content: 'hi' }],
    })
    renderSwitcher()
    await openMenu()
    fireEvent.click(await screen.findByRole('menuitem', { name: /new thread/i }))
    expect(copilotSessionStore.getState().messages).toEqual([])
    expect(copilotSessionStore.getState().sessionId).not.toBe('old')
  })
})
