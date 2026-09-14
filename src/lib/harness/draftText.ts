/**
 * What a pending draft says about itself, in words.
 *
 * Shared by the Decision Inbox's card and the Copilot Desk's "Waiting on you"
 * queue — the design calls the desk's list "the same queue as Decision Inbox",
 * and two lists of the same drafts that name them differently would not read
 * as the same queue.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { policySuggestionMergeCount } from '@/lib/harness/harnessDraftHelpers'

/** Short label for a draft kind. */
export function draftKindLabel(kind: string): string {
  if (kind === 'morning_brief') return 'Morning'
  if (kind === 'daily_digest') return 'Digest'
  if (kind === 'eod_verdict') return 'EOD'
  if (kind === 'hypothesis_suggestion') return 'Suggestion'
  if (kind === 'candidate_batch') return 'Candidate Batch'
  if (kind === 'policy_suggestion') return 'Policy Suggestion'
  // The decision kinds the card used to print as snake_case. The Desk's queue
  // put them in a column called Kind, where `decision_draft` read as a bug.
  if (kind === 'decision_draft') return 'Decision'
  if (kind === 'order_intent') return 'Order Intent'
  if (kind === 'hypothesis_draft') return 'Hypothesis Draft'
  if (kind === 'playbook_rule') return 'Playbook Rule'
  if (kind === 'playbook_note') return 'Playbook Note'
  // A kind nobody modelled yet still shows, under its own name.
  return kind
}

/** The draft's headline: its own title, the hypothesis it is about, or its scope. */
export function draftTitle(draft: Pick<AiDraft, 'payload' | 'scope'>): string {
  const p = draft.payload
  return (
    (typeof p.title === 'string' && p.title) ||
    (typeof p.hypothesis_title === 'string' && p.hypothesis_title) ||
    (draft.scope === 'global' ? "Today's Discoveries" : draft.scope)
  )
}

/**
 * Who asked, from `generated_by`.
 *
 * The persona catalog's `agentLabel` knows persona names (verdict, curator,
 * loop_curator) but not the writers that fill this field — eod_agent, harness,
 * weekly_policy_review — so it would hand most of them back unchanged. An
 * Owner-authored draft is `owner:<id>`: that is you.
 */
export function draftAskedBy(generatedBy: string | null | undefined): string {
  const g = (generatedBy ?? '').trim()
  if (!g) return 'unattributed'
  if (g.startsWith('owner:')) return 'you'
  return g.replace(/_/g, ' ')
}

export interface DraftLanding {
  label: string
  to: string
}

/**
 * Where approving a draft writes, or `null` when it writes nothing.
 *
 * From the branches of `apply_draft_approval` (bifrost-research
 * `api/agents.py`), not from the design's mock: the prototype says an order
 * intent lands in Trade › Plans, and on the server it lands nowhere — its
 * approval only changes its status. A `null` here is that fact, and the page
 * says so rather than inventing a destination.
 *
 * Kept in step with `APPROVE_WRITES_KINDS` by `draftText.test.ts`.
 */
export function draftLandsIn(kind: string): DraftLanding | null {
  switch (kind) {
    case 'candidate_batch':
      // Promotes the batch's open pool rows and creates a hypothesis for each.
      return { label: 'Candidate Pool · Hypothesis Board', to: '/research/loop/candidates' }
    case 'policy_suggestion':
      // Merges the whitelisted knobs into the objective's policy.
      return { label: 'Autopilot objective', to: '/research/loop/harness' }
    case 'playbook_rule':
    case 'playbook_note':
      return { label: 'My Trading System', to: '/research/playbook' }
    default:
      return null
  }
}

export interface ApproveEffect extends DraftLanding {
  /** What Approve writes, as the rest of a sentence that starts "Approve …". */
  detail: string
}

/** Statuses `apply_draft_approval` will write onto a hypothesis from an EOD verdict. */
const EOD_STATUSES = new Set(['active', 'validated', 'rejected', 'archived'])

/**
 * What approving this particular draft writes, or `null` when it writes nothing.
 *
 * `draftLandsIn` answers by kind; some kinds only write when their payload says
 * so, and the server checks the payload (`apply_draft_approval`). An EOD verdict
 * sets its hypothesis's status — the Owner kept Approve on briefings for exactly
 * that (2026-09-13, over the design's "no Approve on briefings"), on condition
 * that the button says what it does. A morning brief creates a hypothesis only
 * when it asks to. A policy suggestion whose fields are all unchanged merges
 * nothing. Each of those says so here instead of borrowing its kind's answer.
 */
export function approveEffect(draft: Pick<AiDraft, 'kind' | 'payload' | 'scope'>): ApproveEffect | null {
  const p = draft.payload
  switch (draft.kind) {
    case 'eod_verdict': {
      const hyp = (typeof p.hypothesis_id === 'string' && p.hypothesis_id) || draft.scope
      const status = typeof p.proposed_status === 'string' ? p.proposed_status : null
      if (!hyp || !status || !EOD_STATUSES.has(status)) return null
      return {
        label: `Hypothesis → ${status}`,
        to: '/research/loop/hypotheses',
        detail: `sets the hypothesis to ${status}`,
      }
    }
    case 'morning_brief': {
      const asks = p.create_hypothesis === true
      const complete = typeof p.title === 'string' && p.title.trim() && typeof p.thesis === 'string' && p.thesis.trim()
      return asks && complete
        ? { label: 'Hypothesis Board', to: '/research/loop/hypotheses', detail: 'creates a hypothesis from this brief' }
        : null
    }
    case 'policy_suggestion': {
      const n = policySuggestionMergeCount(p)
      const landing = draftLandsIn(draft.kind)
      return n > 0 && landing
        ? { ...landing, detail: `merges ${n} field${n === 1 ? '' : 's'} into the objective's policy` }
        : null
    }
    case 'candidate_batch': {
      const landing = draftLandsIn(draft.kind)
      return landing ? { ...landing, detail: 'promotes the batch into the pool and opens a hypothesis per name' } : null
    }
    case 'playbook_rule':
    case 'playbook_note': {
      const landing = draftLandsIn(draft.kind)
      return landing
        ? { ...landing, detail: draft.kind === 'playbook_rule' ? 'adds this rule to your trading system' : 'adds this note to your trading system' }
        : null
    }
    default:
      return null
  }
}
