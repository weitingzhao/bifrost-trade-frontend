// @vitest-environment jsdom
/**
 * Thread switching used to live only on the ≥760 sessions rail, so the 440
 * reading dock had no way to change threads. The title switcher is the
 * switcher at both widths; the rail is gone (C2-a2).
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { copilotSessionStore } from '@/hooks/useCopilotSession'

vi.mock('@/components/cockpit/CockpitTabs', () => ({
  CockpitTabs: () => <div data-testid="cockpit-tabs" />,
}))
vi.mock('@/components/cockpit/BridgeDialog', () => ({
  BridgeDialog: () => null,
}))
vi.mock('@/components/cockpit/ExportSessionMenu', () => ({
  ExportSessionMenu: () => null,
}))
vi.mock('@/components/auth/ResearchUserSwitcher', () => ({
  ResearchUserSwitcher: () => null,
}))
vi.mock('@/components/cockpit/AskCopilotIntentHost', () => ({
  AskCopilotIntentHost: () => null,
}))
vi.mock('@/components/copilot/CopilotPanelMoreMenu', () => ({
  CopilotPanelMoreMenu: () => null,
}))
vi.mock('@/hooks/useCopilotSessions', () => ({
  useCopilotSessions: () => ({
    data: [{ id: 't1', title: 'PLTR · sell-vol', pinned: false }],
    isLoading: false,
  }),
}))

import { CopilotDock } from './CopilotDock'

function renderDock(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <CopilotDock />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('CopilotDock thread switcher', () => {
  beforeEach(() => {
    copilotSessionStore.clearSession()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    })
  })

  afterEach(() => {
    copilotDockStore.getState().close()
    copilotDockStore.getState().setWide(false)
    copilotDockStore.getState().setSessionsOpen(true)
  })

  it('shows Switch thread at the 440 reading width, with no sessions rail', async () => {
    copilotDockStore.getState().open_()
    copilotDockStore.getState().setWide(false)
    copilotDockStore.getState().setSessionsOpen(true)
    renderDock()
    const aside = await screen.findByRole('complementary', { name: 'Research Copilot' })
    expect(aside.style.width).toBe('440px')
    expect(screen.getByRole('button', { name: 'Switch thread' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hide threads' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Show threads' })).toBeNull()
    expect(screen.queryByText('Chat history')).toBeNull()
  })

  it('keeps Switch thread at 760, with no sessions rail', async () => {
    copilotDockStore.getState().open_()
    copilotDockStore.getState().setWide(true)
    copilotDockStore.getState().setSessionsOpen(true)
    renderDock()
    const aside = await screen.findByRole('complementary', { name: 'Research Copilot' })
    expect(aside.style.width).toBe('760px')
    expect(screen.getByRole('button', { name: 'Switch thread' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hide threads' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Show threads' })).toBeNull()
    expect(screen.queryByText('Chat history')).toBeNull()
    expect(screen.queryByRole('button', { name: 'New chat' })).toBeNull()
  })

  it('shows as Portfolio on Positions, linking to Personas — not a stream override', async () => {
    copilotDockStore.getState().open_()
    renderDock('/portfolio/positions')
    const chip = await screen.findByRole('link', { name: 'default · Portfolio' })
    expect(chip.getAttribute('href')).toBe('/research/agent-personas')
  })
})
