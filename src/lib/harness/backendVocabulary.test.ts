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
 *   repositories/objective.POLICY_SUGGESTION_WHITELIST
 *   repositories/objective.OWNER_POLICY_WHITELIST
 */
import { describe, expect, it } from 'vitest'

import { OBJECTIVE_STATUSES, type ObjectiveStatus } from '@/api/research/harness'
import type { DraftKind, ManualDraftKind } from '@/api/researchDrafts'
import { OWNER_POLICY_KEYS, POLICY_SUGGESTION_KEYS } from '@/lib/harness/harnessDraftHelpers'

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

describe('policy whitelists', () => {
  // The backend keeps two: what a model may propose, and what the Owner may.
  // `api/agents.py` picks between them by the draft's author at approval time,
  // so a diff table that walks the wrong one either shows a change the backend
  // will drop or hides one it will write.
  const BACKEND_SUGGESTION = [
    'preset',
    'flag_filter',
    'min_composite_score',
    'min_hit_rate',
    'max_candidates',
    'universe_mode',
    'layers',
    'option_overlay',
    'require_validate_pass',
    'discovery_assist',
    'resolution',
    'min_source_hit_rate',
  ]
  const BACKEND_OWNER_EXTRA = [
    'triage',
    'persona_evaluate',
    'use_llm_plan',
    'llm_model',
    'seed_symbols',
    'decline_memory',
  ]

  it("matches the model's whitelist", () => {
    expect([...POLICY_SUGGESTION_KEYS].sort()).toEqual([...BACKEND_SUGGESTION].sort())
  })

  it("matches the Owner's, which is the model's plus the knobs a model may not turn", () => {
    expect([...OWNER_POLICY_KEYS].sort()).toEqual([...BACKEND_SUGGESTION, ...BACKEND_OWNER_EXTRA].sort())
  })

  it('keeps decline_memory out of what a model may propose', () => {
    // A model that proposes candidates must not be able to propose loosening
    // the gate that suppresses the ones already refused.
    expect(POLICY_SUGGESTION_KEYS).not.toContain('decline_memory')
    expect(OWNER_POLICY_KEYS).toContain('decline_memory')
  })
})
