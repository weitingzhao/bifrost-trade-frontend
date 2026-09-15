// @vitest-environment jsdom
/**
 * Design 2026-09-15 D1: Desk Threads gets search, rename, and archive.
 * Groups stay off this table. Search query args are in threadRows.test.ts.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CopilotSessionSummary } from '@/api/researchCopilotSessions'

const rows: CopilotSessionSummary[] = [
  {
    id: 't-1',
    title: 'Monday thread',
    model: 'deepseek',
    pinned: false,
    updated_at: '2026-09-14T10:00:00Z',
  },
]

vi.mock('@/hooks/useCopilotSessions', () => ({
  useCopilotSessions: () => ({
    data: rows,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/api/researchCopilotSessions', () => ({
  fetchCopilotSession: vi.fn().mockResolvedValue({ session: { id: 't-1' }, messages: [] }),
  patchCopilotSession: vi.fn(),
  archiveCopilotSession: vi.fn(),
}))

vi.mock('@/components/cockpit/BridgeDialog', () => ({
  BridgeDialog: () => null,
}))

import { Threads } from './Threads'

function renderThreads() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <Threads />
    </QueryClientProvider>
  )
}

describe('Threads', () => {
  beforeAll(() => {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => {}
    HTMLElement.prototype.releasePointerCapture = () => {}
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps pin and export, puts rename and archive on the row menu, and has a search box', async () => {
    renderThreads()
    expect(screen.getByLabelText('Search threads')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pin "Monday thread"' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export a memory brief/i })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /more actions for/i }))
    expect(await screen.findByRole('menuitem', { name: /rename/i })).toBeTruthy()
    const archive = await screen.findByRole('menuitem', { name: /archive/i })
    expect(archive).toBeTruthy()
    expect(archive.className).not.toMatch(/destructive/)
    expect(screen.queryByRole('menuitem', { name: /group/i })).toBeNull()
  })
})
