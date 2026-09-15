import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import {
  waitingQueueCallCount,
  waitingQueueHeadline,
  waitingQueueItems,
  waitingQueueShowsApprove,
  waitingQueueSummary,
} from './waitingQueue'

function draft(kind: AiDraft['kind'], id: string, payload: Record<string, unknown> = {}): AiDraft {
  return {
    id,
    kind,
    payload,
    scope: 'research',
    status: 'pending',
    generated_by: 'harness',
    linked_action_id: null,
    created_at: '2026-09-14T12:00:00Z',
    expires_at: null,
  }
}

describe('waitingQueue', () => {
  it('counts Inbox-badge calls, not every pending draft', () => {
    const rows = [
      draft('daily_digest', 'dig', { title: 'Tuesday digest' }),
      draft('eod_verdict', 'eod1'),
      draft('eod_verdict', 'eod2'),
      draft('morning_brief', 'morn'),
      draft('candidate_batch', 'b1', {
        objective_id: 'obj-a',
        items: [{ symbol: 'NVDA' }, { symbol: 'AAPL' }],
      }),
      draft('candidate_batch', 'b2', {
        objective_id: 'obj-a',
        items: [{ symbol: 'AAPL' }, { symbol: 'NVDA' }],
      }),
      draft('decision_draft', 'dec'),
      draft('policy_suggestion', 'pol-empty', {
        current_policy: { preset: 'neutral' },
        suggestion: {},
      }),
      draft('policy_suggestion', 'pol-write', {
        current_policy: { preset: 'neutral', min_hit_rate: 0.5 },
        suggestion: { min_hit_rate: 0.7 },
      }),
      draft('playbook_note', 'note'),
    ]
    // 1 folded batch + decision_draft + writing policy + playbook_note.
    // Briefings and the empty policy are not calls (standing.pending_decisions.calls).
    expect(waitingQueueCallCount(rows)).toBe(4)
  })

  it('does not Approve eod_verdict or decision_draft', () => {
    expect(waitingQueueShowsApprove(draft('eod_verdict', 'eod'))).toBe(false)
    expect(waitingQueueShowsApprove(draft('decision_draft', 'dec'))).toBe(false)
    expect(waitingQueueShowsApprove(draft('daily_digest', 'dig'))).toBe(false)
    expect(
      waitingQueueShowsApprove(draft('candidate_batch', 'b', { items: [{ symbol: 'NVDA' }] }))
    ).toBe(true)
  })

  it('folds briefings into one row without Approve or Dismiss', () => {
    const items = waitingQueueItems(
      [
        draft('daily_digest', 'dig', { title: 'Tuesday digest' }),
        draft('eod_verdict', 'eod'),
        draft('decision_draft', 'dec', { title: 'Hold NVDA' }),
        draft('candidate_batch', 'b', {
          title: 'Batch A',
          objective_id: 'obj-a',
          items: [{ symbol: 'NVDA' }],
        }),
      ],
      [{ id: 'r1', objective_id: 'o1' }],
      new Map([['o1', 'Daily Loop Stock Explorer']])
    )
    const briefings = items.find((i) => i.kind === 'briefings')
    const eod = items.find((i) => i.draft?.kind === 'eod_verdict')
    const verdict = items.find((i) => i.draft?.kind === 'decision_draft')
    const batch = items.find((i) => i.draft?.kind === 'candidate_batch')
    const run = items.find((i) => i.kind === 'run')
    expect(briefings?.showApprove).toBe(false)
    expect(briefings?.showDismiss).toBe(false)
    expect(eod).toBeUndefined()
    expect(verdict?.showApprove).toBe(false)
    expect(verdict?.showDismiss).toBe(true)
    expect(batch?.showApprove).toBe(true)
    expect(run?.showApprove).toBe(false)
    expect(
      waitingQueueHeadline(
        waitingQueueCallCount([
          draft('daily_digest', 'dig'),
          draft('eod_verdict', 'eod'),
          draft('decision_draft', 'dec'),
          draft('candidate_batch', 'b', { items: [{ symbol: 'NVDA' }] }),
        ])
      )
    ).toBe('2 waiting on you')
    expect(waitingQueueSummary({ briefingCount: 2, runCount: 1 })).toBe('Briefings · 1 run')
  })
})
