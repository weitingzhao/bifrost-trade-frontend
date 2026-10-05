import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import { buildInboxCards } from '@/lib/harness/inboxCards'
import { waitingQueueHeadline, waitingQueueItems, waitingQueueSummary } from './waitingQueue'

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
  it('lists one row per Inbox card, so its count is the Inbox\'s', () => {
    const rows = [
      draft('candidate_batch', 'b1', { objective_id: 'obj-a', items: [{ symbol: 'NVDA' }, { symbol: 'AAPL' }] }),
      // A different set of names from the same objective is still that objective's card (Rev .143 #5).
      draft('candidate_batch', 'b2', { objective_id: 'obj-a', items: [{ symbol: 'MSFT' }] }),
      // A verdict and its vehicle are one call (#2).
      draft('decision_draft', 'dec', { hypothesis_id: 'hyp-1' }),
      draft('order_intent', 'oi', { hypothesis_id: 'hyp-1' }),
      draft('policy_suggestion', 'pol-empty', { current_policy: { preset: 'neutral' }, suggestion: {} }),
      draft('playbook_note', 'note'),
    ]
    const cards = buildInboxCards(rows)
    const items = waitingQueueItems(cards, [], [], new Map())
    expect(items.filter((i) => i.kind === 'decision')).toHaveLength(cards.length)
    expect(cards).toHaveLength(4)
    // A policy suggestion that writes nothing is still a card on the Inbox, so it is counted here too.
    expect(items.find((i) => i.card?.head.id === 'pol-empty')?.showApprove).toBe(false)
  })

  it('does not Approve a call — it is answered on the Inbox', () => {
    const cards = buildInboxCards([
      draft('decision_draft', 'dec', { hypothesis_id: 'hyp-1' }),
      draft('candidate_batch', 'b', { objective_id: 'obj-a', items: [{ symbol: 'NVDA' }] }),
    ])
    const items = waitingQueueItems(cards, [], [], new Map())
    expect(items.find((i) => i.card?.shape === 'call')?.showApprove).toBe(false)
    expect(items.find((i) => i.card?.shape === 'call')?.showDismiss).toBe(true)
    expect(items.find((i) => i.card?.shape === 'objective')?.showApprove).toBe(true)
  })

  it('folds briefings into one row without Approve or Dismiss', () => {
    const items = waitingQueueItems(
      buildInboxCards([draft('decision_draft', 'dec', { title: 'Hold NVDA' })]),
      [draft('daily_digest', 'dig', { title: 'Tuesday digest' }), draft('eod_verdict', 'eod')],
      [{ id: 'r1', objective_id: 'o1' }],
      new Map([['o1', 'Daily Loop Stock Explorer']])
    )
    const briefings = items.find((i) => i.kind === 'briefings')
    const run = items.find((i) => i.kind === 'run')
    expect(briefings?.what).toBe('Daily digest · 1 more')
    expect(briefings?.showApprove).toBe(false)
    expect(briefings?.showDismiss).toBe(false)
    expect(items.find((i) => i.draft?.kind === 'eod_verdict')).toBeUndefined()
    expect(run?.what).toBe('Daily Loop Stock Explorer')
    expect(run?.showApprove).toBe(false)
    expect(waitingQueueSummary({ briefingCount: 2, runCount: 1 })).toBe('Briefings · 1 run')
  })

  it('says «—» rather than 0 when the queue could not be read', () => {
    expect(waitingQueueHeadline(2)).toBe('2 waiting on you')
    expect(waitingQueueHeadline(null)).toBe('— waiting on you')
  })
})
