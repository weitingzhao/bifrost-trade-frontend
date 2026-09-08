/**
 * Two enums this app declares are owned by the Research backend.
 *
 * Both had drifted. `ObjectiveStatus` read 'active' | 'paused' | 'retired'
 * while the archive button, the objective page and the API all used
 * 'archived' — the two real states were written as inline literals at three
 * call sites, so nothing ever type-checked against the exported union. And
 * `DraftKind` was missing three kinds the Decision Inbox was already
 * displaying; the Inbox survives it only because it denies by kind rather than
 * allowing by kind.
 *
 * These lists restate the backend's, so a change on that side has somewhere to
 * fail. Backend authorities:
 *   repositories/objective.OBJECTIVE_STATUSES
 *   repositories/ai_draft._ALLOWED_KINDS
 */
import { describe, expect, it } from 'vitest'

import { OBJECTIVE_STATUSES, type ObjectiveStatus } from '@/api/research/harness'
import type { DraftKind, ManualDraftKind } from '@/api/researchDrafts'

const BACKEND_OBJECTIVE_STATUSES = ['active', 'archived']

const BACKEND_DRAFT_KINDS: DraftKind[] = [
  'morning_brief',
  'eod_verdict',
  'daily_digest',
  'hypothesis_suggestion',
  'playbook_rule',
  'playbook_note',
  'candidate_batch',
  'hypothesis_draft',
  'decision_draft',
  'order_intent',
  'policy_suggestion',
]

describe('objective status', () => {
  it('is the pair the backend accepts', () => {
    expect([...OBJECTIVE_STATUSES].sort()).toEqual([...BACKEND_OBJECTIVE_STATUSES].sort())
  })

  it('is the type the archive path uses, not an inline literal', () => {
    const archived: ObjectiveStatus = 'archived'
    const active: ObjectiveStatus = 'active'
    expect([archived, active]).toEqual(['archived', 'active'])
  })
})

describe('draft kind', () => {
  it('names every kind the backend will accept', () => {
    // Assignability is the assertion: an unlisted kind fails to compile.
    expect(new Set(BACKEND_DRAFT_KINDS).size).toBe(BACKEND_DRAFT_KINDS.length)
    expect(BACKEND_DRAFT_KINDS).toHaveLength(11)
  })

  it('keeps the hand-written subset inside that set', () => {
    const manual: ManualDraftKind[] = ['hypothesis_suggestion', 'morning_brief', 'eod_verdict']
    for (const kind of manual) {
      expect(BACKEND_DRAFT_KINDS).toContain(kind)
    }
  })
})
