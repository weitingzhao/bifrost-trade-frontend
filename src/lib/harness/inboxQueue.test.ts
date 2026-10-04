import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiDraft, DraftKind, DraftListResponse } from '@/api/researchDrafts'
import { BRIEFING_QUEUE_KINDS, combineInboxQueue, DECISION_QUEUE_KINDS, INBOX_QUEUE_KINDS } from './inboxQueue'
import { BRIEFING_KINDS, isDecisionKind } from './harnessDraftHelpers'

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }))
vi.mock('@/lib/http', () => ({ requestJson }))

// Invented rows; the counts are shaped like the DEV queue, not copied from it.
function rows(kind: DraftKind, n: number, day = '01'): AiDraft[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${kind}-${i}`,
    kind,
    payload: {},
    scope: 'global',
    status: 'pending' as const,
    generated_by: 'agent',
    linked_action_id: null,
    created_at: `2026-02-${day}T${String(i % 24).padStart(2, '0')}:00:00Z`,
    expires_at: null,
  }))
}

function answer(kind: DraftKind, n: number, pending: number) {
  const data: DraftListResponse = { rows: rows(kind, n), count: n, pending_count: pending, limit: n, offset: 0 }
  return { data, isLoading: false, error: null }
}

describe('the kinds the Inbox reads', () => {
  it('covers every kind the backend accepts, once, split the way BRIEFING_KINDS splits them', () => {
    expect(new Set(INBOX_QUEUE_KINDS).size).toBe(11)
    for (const k of DECISION_QUEUE_KINDS) expect(isDecisionKind(k), k).toBe(true)
    for (const k of BRIEFING_QUEUE_KINDS) expect(BRIEFING_KINDS.has(k), k).toBe(true)
  })
})

describe('combineInboxQueue', () => {
  const sizes: Record<string, number> = {
    decision_draft: 50,
    order_intent: 10,
    policy_suggestion: 30,
    candidate_batch: 40,
    playbook_note: 7,
    eod_verdict: 700,
    daily_digest: 1,
  }
  const pending = Object.values(sizes).reduce((a, b) => a + b, 0)

  it('adds the kinds back up to the server’s pending count — no decision lost under the briefings', () => {
    const q = combineInboxQueue(INBOX_QUEUE_KINDS.map((k) => answer(k, sizes[k] ?? 0, pending)))
    expect(q.decisions).toHaveLength(137)
    expect(q.briefings).toHaveLength(701)
    expect(q.listed).toBe(pending)
    expect(q.pendingCount).toBe(pending)
    expect(q.unaccounted).toBe(0)
    expect(q.byKind.policy_suggestion).toBe(30)
    expect(q.complete).toBe(true)
    expect(q.decisions.every((d) => isDecisionKind(d.kind))).toBe(true)
  })

  it('says how many pending drafts sit in a kind it does not read', () => {
    const q = combineInboxQueue(INBOX_QUEUE_KINDS.map((k) => answer(k, sizes[k] ?? 0, pending + 3)))
    expect(q.unaccounted).toBe(3)
  })

  it('claims nothing about missing kinds while a kind is still loading', () => {
    const results = INBOX_QUEUE_KINDS.map((k) =>
      k === 'eod_verdict' ? { data: undefined, isLoading: true, error: null } : answer(k, sizes[k] ?? 0, pending),
    )
    const q = combineInboxQueue(results)
    expect(q.complete).toBe(false)
    expect(q.briefingsLoading).toBe(true)
    expect(q.decisionsLoading).toBe(false)
    expect(q.unaccounted).toBe(0)
  })

  it('surfaces a decision kind’s error first', () => {
    const boom = new Error('401')
    const results = INBOX_QUEUE_KINDS.map((k) =>
      k === 'candidate_batch' ? { data: undefined, isLoading: false, error: boom } : answer(k, 1, 20),
    )
    expect(combineInboxQueue(results).error).toBe(boom)
  })
})

describe('listAllResearchDrafts', () => {
  beforeEach(() => {
    requestJson.mockReset()
  })

  it('pages with limit and offset until a short page, and keeps the server’s count', async () => {
    const { listAllResearchDrafts } = await import('@/api/researchDrafts')
    const all = rows('eod_verdict', 450)
    requestJson.mockImplementation(async (url: string) => {
      const u = new URL(url, 'http://x')
      expect(u.searchParams.get('kind')).toBe('eod_verdict')
      expect(u.searchParams.get('status')).toBe('pending')
      const limit = Number(u.searchParams.get('limit'))
      const offset = Number(u.searchParams.get('offset') ?? 0)
      const page = all.slice(offset, offset + limit)
      return { rows: page, count: page.length, pending_count: 999, limit, offset }
    })
    const res = await listAllResearchDrafts({ status: 'pending', kind: 'eod_verdict' })
    expect(requestJson).toHaveBeenCalledTimes(3)
    expect(res.rows).toHaveLength(450)
    expect(new Set(res.rows.map((r) => r.id)).size).toBe(450)
    expect(res.pending_count).toBe(999)
  })
})
