// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'

vi.mock('@/hooks/useResearchDrafts', () => ({
  DRAFTS_PAGE_MAX: 200,
  useResearchDrafts: () => ({
    data: {
      rows: [
        {
          id: 'd1',
          kind: 'daily_digest',
          payload: { title: 'Tuesday digest', day: '2026-09-14' },
          scope: 'global',
          status: 'pending',
          generated_by: 'digest_agent',
          linked_action_id: null,
          created_at: '2026-09-14T12:00:00Z',
          expires_at: null,
        },
        {
          id: 'eod',
          kind: 'eod_verdict',
          payload: { title: 'NVDA EOD' },
          scope: 'NVDA',
          status: 'pending',
          generated_by: 'eod_agent',
          linked_action_id: null,
          created_at: '2026-09-14T12:30:00Z',
          expires_at: null,
        },
        {
          id: 'd2',
          kind: 'candidate_batch',
          payload: { title: 'Batch A' },
          scope: 'obj-1',
          status: 'pending',
          generated_by: 'harness',
          linked_action_id: null,
          created_at: '2026-09-14T13:00:00Z',
          expires_at: null,
        },
        {
          id: 'dec',
          kind: 'decision_draft',
          payload: { title: 'Hold NVDA' },
          scope: 'NVDA',
          status: 'pending',
          generated_by: 'curator',
          linked_action_id: null,
          created_at: '2026-09-14T13:10:00Z',
          expires_at: null,
        },
      ],
      pending_count: 4,
    },
    isLoading: false,
    isError: false,
  }),
  useApproveDraft: () => ({
    mutate: vi.fn(),
    isPending: false,
    data: undefined,
    variables: undefined,
  }),
  useHeldDraftDismiss: () => ({ isHeld: () => false, dismiss: vi.fn() }),
}))

vi.mock('@/hooks/useLoopHarness', () => ({
  useAwaitingRuns: () => ({
    data: {
      items: [{ id: 'r1', objective_id: 'o1' }],
      count: 1,
    },
    isLoading: false,
    isError: false,
  }),
  useActiveObjectives: () => ({
    data: { items: [{ id: 'o1', title: 'Daily Loop Stock Explorer' }] },
  }),
  useAutopilotStanding: () => ({
    data: { pending_decisions: { calls: 45, drafts: 50, folded: 5, inert: 0, briefings: 2 } },
  }),
}))

vi.mock('@/lib/harness/loopCopilotPrefill', () => ({
  openDigestInCopilot: vi.fn(),
  openDraftInCopilot: vi.fn(),
  openLoopRunInCopilot: vi.fn(),
}))

import { CopilotWaitingQueue } from './CopilotWaitingQueue'

describe('CopilotWaitingQueue', () => {
  it('counts Inbox calls and hides Approve on eod_verdict and decision_draft', async () => {
    cockpitDrawerStore.getState().setInboxOpen(false)
    render(
      <MemoryRouter>
        <CopilotWaitingQueue />
      </MemoryRouter>,
    )
    // Badge口径: standing.pending_decisions.calls, not the truncated drafts page.
    expect(screen.getByText('45 waiting on you')).toBeTruthy()
    expect(screen.getByText('Briefings · 1 run')).toBeTruthy()
    expect(screen.queryByText('2 waiting on you')).toBeNull()
    expect(screen.queryByText('4 waiting on you')).toBeNull()
    expect(screen.queryByText(/224 waiting/)).toBeNull()

    await userEvent.click(screen.getByText('45 waiting on you'))
    expect(screen.getByText('Daily digest · 1 more')).toBeTruthy()
    expect(screen.getByText('Batch A')).toBeTruthy()
    expect(screen.getByText('Hold NVDA')).toBeTruthy()
    expect(screen.getByText('Daily Loop Stock Explorer')).toBeTruthy()
    expect(screen.queryByText('NVDA EOD')).toBeNull()
    expect(screen.getAllByText('Ask')).toHaveLength(4)
    expect(screen.getAllByText('✓')).toHaveLength(1)
    expect(screen.getAllByText('✕')).toHaveLength(2)
    const truncation = screen.getByRole('link', { name: '2 of 45 listed · Open Decision Inbox →' })
    expect(truncation).toHaveAttribute('href', '/research/loop/decisions')
  })
})
