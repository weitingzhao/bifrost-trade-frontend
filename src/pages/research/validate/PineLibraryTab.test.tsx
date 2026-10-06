// @vitest-environment jsdom
/** Without a Research user, the Pine library says so with a way to set one — the greyed Check / Save were a dead end. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/research/pine', async (orig) => ({
  ...(await orig<typeof import('@/api/research/pine')>()),
  fetchPineScripts: async () => ({
    scripts: [
      {
        id: 'supertrend', name: 'Supertrend', version: 1, origin: 'bifrost', license: 'Bifrost original implementation',
        source_url: null, notes: null, is_active: true, signals: ['buy', 'sell'], plots: ['Supertrend'], overlay: true,
        source: '//@version=5\nindicator("st")\nplotshape(close > open, "buy")',
      },
    ],
    count: 1,
  }),
  fetchPineContext: async () => ({ series: [], rules: {} }),
}))

import { researchAuthStore } from '@/lib/auth/researchUser'
import { PineLibraryTab } from './PineLibraryTab'

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PineLibraryTab selectedId={null} onSelect={() => {}} newScriptTick={0} heldSymbol="SPY" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PineLibraryTab without a Research user', () => {
  beforeEach(() => researchAuthStore.clear())

  it('greys Check, and offers Set user on the page', async () => {
    mount()
    expect(await screen.findByText(/Check and Save run as a Research user/)).toBeTruthy()
    const checks = screen.getAllByRole('button', { name: 'Check' })
    expect(checks.every((b) => (b as HTMLButtonElement).disabled)).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: 'Set user' }))
    expect(await screen.findByText('Research identity')).toBeTruthy()
  })

  it('shows no Set user once a user is set', async () => {
    researchAuthStore.setCredentials('tok_owner', 'owner')
    mount()
    await screen.findAllByRole('button', { name: 'Check' })
    expect(screen.queryByText(/Check and Save run as a Research user/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Set user' })).toBeNull()
  })
})
