// @vitest-environment jsdom
/**
 * The waiting queue reads the Inbox's queue (every kind, in full) and counts
 * its cards — so its title is the Inbox's "To decide" for the same drafts,
 * not the newest 200 of every kind, and not the server's call count beside a
 * list of something else. Fixtures are made up.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'
import { RESEARCH_AUTH_NOT_SET_LINE } from '@/components/auth/ResearchAuthGap'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { resetStoredDraftIds } from '@/lib/harness/inboxRead'
import { HttpError } from '@/lib/http'
import { dismissToast, runUndo, toastStore } from '@/lib/shellNotify'
import { memoryStorage } from '@/test/memoryStorage'

function draft(kind: DraftKind, id: string, payload: Record<string, unknown>, at: string): AiDraft {
  return {
    id,
    kind,
    payload,
    scope: 'research',
    status: 'pending',
    generated_by: 'harness',
    linked_action_id: null,
    created_at: at,
    expires_at: null,
  }
}

// 250 EOD briefings: more than one page of the old all-kinds read, which saw
// none of the calls behind them.
const EOD = Array.from({ length: 250 }, (_, i) =>
  draft('eod_verdict', `eod-${i}`, { title: `EOD ${i}` }, `2026-09-14T20:${String(i % 60).padStart(2, '0')}:00Z`),
)
const QUEUE: AiDraft[] = [
  draft('daily_digest', 'dig', { title: 'Tuesday digest', day: '2026-09-14' }, '2026-09-14T12:00:00Z'),
  ...EOD,
  draft('candidate_batch', 'b1', { title: 'Batch A', objective_id: 'o1', items: [{ symbol: 'AAA' }] }, '2026-09-14T13:00:00Z'),
  draft('candidate_batch', 'b0', { title: 'Batch A0', objective_id: 'o1', items: [{ symbol: 'BBB' }] }, '2026-09-13T13:00:00Z'),
  draft('decision_draft', 'dec', { title: 'Hold XYZ', hypothesis_id: 'h1' }, '2026-09-14T13:10:00Z'),
  draft('order_intent', 'oi', { title: 'XYZ vehicle', hypothesis_id: 'h1' }, '2026-09-14T13:11:00Z'),
  draft('playbook_note', 'note', { title: 'A note' }, '2026-09-14T13:20:00Z'),
]

const drafts = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'signed-out', approve: vi.fn() }))

vi.mock('@/api/researchDrafts', async (orig) => {
  const actual = await orig<typeof import('@/api/researchDrafts')>()
  return {
    ...actual,
    listAllResearchDrafts: async ({ kind }: { kind: DraftKind }) => {
      if (drafts.mode === 'signed-out') throw new HttpError(401, 'Drafts API HTTP 401')
      const rows = QUEUE.filter((d) => d.kind === kind)
      return { rows, count: rows.length, pending_count: QUEUE.length, limit: rows.length, offset: 0 }
    },
    approveResearchDraft: (id: string) => drafts.approve(id),
    dismissResearchDraft: vi.fn(),
  }
})

const runs = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'signed-out' }))

vi.mock('@/hooks/useLoopHarness', () => ({
  useAwaitingRuns: () =>
    runs.mode === 'signed-out'
      ? { data: undefined, isError: true, error: new HttpError(401, 'Runs HTTP 401'), refetch: vi.fn() }
      : { data: { items: [{ id: 'r1', objective_id: 'o1' }], count: 1 }, isError: false, error: null },
  useActiveObjectives: () => ({
    data: { items: [{ id: 'o1', title: 'Daily Loop Stock Explorer' }] },
  }),
}))

vi.mock('@/lib/harness/loopCopilotPrefill', () => ({
  openDigestInCopilot: vi.fn(),
  openDraftInCopilot: vi.fn(),
  openLoopRunInCopilot: vi.fn(),
}))

import { CopilotWaitingQueue } from './CopilotWaitingQueue'

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CopilotWaitingQueue />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CopilotWaitingQueue', () => {
  beforeEach(() => {
    drafts.mode = 'ok'
    runs.mode = 'ok'
    vi.stubGlobal('localStorage', memoryStorage())
    resetStoredDraftIds()
    cockpitDrawerStore.getState().setInboxOpen(false)
  })

  it('counts the Inbox cards, read kind by kind, past a page of briefings', async () => {
    renderQueue()
    // Batch A + A0 are one objective card; the verdict and its vehicle one call; the note one.
    await waitFor(() => expect(screen.getByText('3 waiting on you')).toBeTruthy())
    expect(screen.getByText('Briefings · 1 run')).toBeTruthy()

    await userEvent.click(screen.getByText('3 waiting on you'))
    expect(screen.getByText('Daily digest · 250 more')).toBeTruthy()
    expect(screen.getByText('Batch A')).toBeTruthy()
    expect(screen.queryByText('Batch A0')).toBeNull()
    expect(screen.getByText('Hold XYZ')).toBeTruthy()
    expect(screen.getByText('Daily Loop Stock Explorer')).toBeTruthy()
    // Approve only where the Inbox's Approve writes: the batch and the note, not the call.
    expect(screen.getAllByText('✓')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(3)
  })

  it('✓ is held like Dismiss: nothing is sent until the toast leaves, ⌘Z sends nothing', async () => {
    drafts.approve.mockReset()
    drafts.approve.mockImplementation(async (id: string) => ({ draft: QUEUE.find((d) => d.id === id) }))
    renderQueue()
    await waitFor(() => expect(screen.getByText('3 waiting on you')).toBeTruthy())
    await userEvent.click(screen.getByText('3 waiting on you'))
    const approveNote = () => screen.getAllByText('✓')[0]

    await userEvent.click(approveNote())
    expect(toastStore.getState().toast?.msg).toMatch(/^Approved A note/)
    expect(drafts.approve).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('2 waiting on you')).toBeTruthy())
    act(() => {
      expect(runUndo()).toBe(true)
    })
    await waitFor(() => expect(screen.getByText('3 waiting on you')).toBeTruthy())
    expect(drafts.approve).not.toHaveBeenCalled()

    await userEvent.click(approveNote())
    act(() => dismissToast(toastStore.getState().toast!.id))
    await waitFor(() => expect(drafts.approve).toHaveBeenCalledWith('note'))
    expect(drafts.approve).toHaveBeenCalledTimes(1)
  })

  it('leaves out the runs hidden on the Inbox, as the Inbox does', async () => {
    // Every run of the objective hidden in this browser: no card, on either surface.
    localStorage.setItem('bifrost-inbox-hidden-earlier', JSON.stringify(['b1', 'b0']))
    resetStoredDraftIds()
    renderQueue()
    await waitFor(() => expect(screen.getByText('2 waiting on you')).toBeTruthy())
  })

  it('signed out, says so instead of a count', async () => {
    drafts.mode = 'signed-out'
    runs.mode = 'signed-out'
    renderQueue()
    await waitFor(() => expect(screen.getByText(RESEARCH_AUTH_NOT_SET_LINE)).toBeTruthy())
    expect(screen.queryByText(/waiting on you/)).toBeNull()
  })
})
