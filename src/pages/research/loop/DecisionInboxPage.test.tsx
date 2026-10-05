// @vitest-environment jsdom
/**
 * The Decision Inbox's Approve waits behind the toast like Dismiss and Record
 * answer: the card leaves at once, Undo or ⌘Z for five seconds puts it back
 * and nothing was sent, and the write goes out only when the toast leaves —
 * from the open card's button and from the A key alike. Fixtures are made up.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiDraft, DraftKind } from '@/api/researchDrafts'
import { HttpError } from '@/lib/http'
import { resetStoredDraftIds } from '@/lib/harness/inboxRead'
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

const QUEUE: AiDraft[] = [
  draft('playbook_note', 'note-1', { title: 'Size down into prints', body: 'Made up.' }, '2026-09-14T13:20:00Z'),
  draft('playbook_note', 'note-2', { title: 'Wait a session after gaps', body: 'Made up.' }, '2026-09-14T13:00:00Z'),
]

const api = vi.hoisted(() => ({
  signedOut: false,
  approve: vi.fn(),
  dismiss: vi.fn(),
}))

vi.mock('@/api/researchDrafts', async (orig) => {
  const actual = await orig<typeof import('@/api/researchDrafts')>()
  return {
    ...actual,
    listAllResearchDrafts: async ({ kind }: { kind: DraftKind }) => {
      if (api.signedOut) throw new HttpError(401, 'Drafts API HTTP 401')
      const rows = QUEUE.filter((d) => d.kind === kind)
      return { rows, count: rows.length, pending_count: QUEUE.length, limit: rows.length, offset: 0 }
    },
    approveResearchDraft: (id: string) => api.approve(id),
    dismissResearchDraft: (id: string) => api.dismiss(id),
  }
})
vi.mock('@/hooks/useHypotheses', () => ({ useHypothesisList: () => ({ data: undefined }) }))
vi.mock('@/hooks/useLoopHarness', () => ({ useObjectiveList: () => ({ data: undefined }) }))
// Rule proposals come off Review's habits; two made-up ones beside the drafts.
vi.mock('@/hooks/useReviewHabits', () => ({ useReviewHabits: () => ({ habits: [], trades: [], paths: {} }) }))
vi.mock('@/pages/research/loop/proposals/proposalsModel', () => ({
  buildProposals: () => [
    { key: 'r1', thin: false },
    { key: 'r2', thin: false },
  ],
}))
vi.mock('@/pages/research/loop/proposals/RuleProposalCard', () => ({
  NO_RULES_STORE: 'no rules store',
  RuleProposalCard: ({ cardKey }: { cardKey: string }) => <div data-testid={cardKey}>rule card</div>,
}))
vi.mock('@/pages/research/loop/LeashPanel', () => ({ LeashPanel: () => null }))
vi.mock('@/components/research/NewDraftDialog', () => ({ NewDraftDialog: () => null }))
vi.mock('@/components/research/ArtifactVerbs', () => ({ ArtifactVerbs: () => null }))

import DecisionInboxPage from './DecisionInboxPage'

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/research/loop/decisions']}>
        <DecisionInboxPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('DecisionInboxPage — Approve is held', () => {
  beforeEach(() => {
    api.signedOut = false
    api.approve.mockReset()
    api.approve.mockImplementation(async (id: string) => ({ draft: { ...QUEUE.find((d) => d.id === id), status: 'approved' } }))
    api.dismiss.mockReset()
    vi.stubGlobal('localStorage', memoryStorage())
    resetStoredDraftIds()
    const t = toastStore.getState().toast
    if (t) toastStore.setState({ toast: null })
  })

  it('the open card’s Approve sends nothing until the toast leaves', async () => {
    renderInbox()
    await waitFor(() => expect(screen.getByText('Size down into prints')).toBeTruthy())
    const approveBtn = screen.getAllByRole('button', { name: /^Approve/ })[0]
    fireEvent.click(approveBtn)

    expect(toastStore.getState().toast?.msg).toMatch(/^Approved /)
    expect(api.approve).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText('Size down into prints')).toBeNull())

    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    expect(api.approve.mock.calls.map((c) => c[0])).toEqual(['note-1'])
  })

  it('A approves the open card, and ⌘Z takes it back without a request', async () => {
    renderInbox()
    await waitFor(() => expect(screen.getByText('Size down into prints')).toBeTruthy())
    fireEvent.keyDown(window, { key: 'a' })

    expect(toastStore.getState().toast?.msg).toMatch(/^Approved /)
    await waitFor(() => expect(screen.queryByText('Size down into prints')).toBeNull())
    act(() => {
      expect(runUndo()).toBe(true)
    })
    await waitFor(() => expect(screen.getByText('Size down into prints')).toBeTruthy())
    await act(flush)
    expect(api.approve).not.toHaveBeenCalled()
  })
})
