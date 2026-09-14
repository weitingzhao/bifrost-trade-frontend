/**
 * What a pending draft says about itself, in words.
 *
 * Shared by the Decision Inbox's card and the Copilot Desk's "Waiting on you"
 * queue — the design calls the desk's list "the same queue as Decision Inbox",
 * and two lists of the same drafts that name them differently would not read
 * as the same queue.
 */
import type { AiDraft } from '@/api/researchDrafts'

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
