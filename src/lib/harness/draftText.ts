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
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { objectivePath } from '@/lib/harness/objectivePolicy'

/** Short label for a draft kind. */
export function draftKindLabel(kind: string): string {
  if (kind === 'morning_brief') return 'Morning'
  if (kind === 'daily_digest') return 'Digest'
  if (kind === 'eod_verdict') return 'EOD'
  if (kind === 'hypothesis_suggestion') return 'Suggestion'
  if (kind === 'candidate_batch') return 'Candidate Batch'
  // `rule`, not `Policy Suggestion` (design Rev 2026-09-23.1): the engine's
  // rule-keeper and a Review proposal write to the same place, and two labels
  // for one consequence say they are different things. The tag was already
  // warning on both, which is the colour saying what the words did not.
  if (kind === 'policy_suggestion') return 'rule'
  // The decision kinds the card used to print as snake_case. The Desk's queue
  // put them in a column called Kind, where `decision_draft` read as a bug.
  if (kind === 'decision_draft') return 'Decision'
  // `vehicle`, not the payload's own name (design Rev 2026-09-22.7, Vision §21's
  // thesis/vehicle pair): the card draws a shape for expressing a belief, and it
  // stops here — calling it an order is the one word on this page that could
  // read as if something reached Trade. The meta line keeps `order_intent`.
  if (kind === 'order_intent') return 'vehicle'
  if (kind === 'hypothesis_draft') return 'Hypothesis Draft'
  if (kind === 'playbook_rule') return 'Playbook Rule'
  if (kind === 'playbook_note') return 'Playbook Note'
  // A kind nobody modelled yet still shows, under its own name.
  return kind
}

/** The draft's headline: its own title, the hypothesis it is about, or its scope. */
/**
 * A run id in parentheses, which several hypothesis titles end with.
 *
 * It is provenance, not the name of the belief, and the card already carries
 * provenance on its own line. Left in, every title on the page ended in forty
 * characters of hex.
 */
const TRAILING_RUN_ID = /\s*\(run_[0-9a-f]+\)\s*$/i

/**
 * What the card calls this draft.
 *
 * `decision_draft`, `order_intent` and `policy_suggestion` carry no title of
 * their own — only `hypothesis_id` — so without the join the headline of every
 * one of them was its scope, which is the raw slug
 * `hypothesis:intc-stage-2a-setup-perfect-technique-thin-funda-5140a1e0be`.
 * All ten pending on DEV resolve, so the title is passed in rather than
 * guessed: the caller holds the hypothesis list, and a draft whose hypothesis
 * is not in it falls back the way it always did.
 */
export function draftTitle(
  draft: Pick<AiDraft, 'payload' | 'scope'>,
  hypothesisTitle?: string | null,
): string {
  const p = draft.payload
  const joined = (hypothesisTitle ?? '').replace(TRAILING_RUN_ID, '').trim()
  return (
    (typeof p.title === 'string' && p.title) ||
    (typeof p.hypothesis_title === 'string' && p.hypothesis_title) ||
    joined ||
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
      return { label: 'Playbook', to: '/trade/playbook' }
    default:
      return null
  }
}

export interface ApproveEffect extends DraftLanding {
  /** What Approve writes, as the rest of a sentence that starts "Approve …". */
  detail: string
}

/**
 * Where a reader goes to check a card before answering it — the design's
 * per-card links ("Objective #7 →", "Backtest →"). Only places that exist and
 * that the payload names. The run's pipeline is already in the card's header,
 * and the caller drops a link that repeats Approve's own destination.
 */
export function draftLinks(draft: Pick<AiDraft, 'kind' | 'payload'>): DraftLanding[] {
  const p = draft.payload
  const links: DraftLanding[] = []
  const objectiveId = typeof p.objective_id === 'string' && p.objective_id ? p.objective_id : null
  if (objectiveId && (draft.kind === 'candidate_batch' || draft.kind === 'policy_suggestion')) {
    links.push({ label: 'Objective', to: objectivePath(objectiveId) })
  }
  if (draft.kind === 'eod_verdict' && typeof p.hypothesis_id === 'string' && p.hypothesis_id) {
    links.push({ label: 'Hypothesis Board', to: '/research/loop/hypotheses' })
  }
  // A playbook note filed by a curator run names the run it came out of.
  const hasRun = typeof p.run_id === 'string' && p.run_id
  if (!hasRun && typeof p.source_session_id === 'string' && p.source_session_id.startsWith('run_')) {
    links.push({ label: 'Source run', to: loopPipelinePath(p.source_session_id, { live: false }) })
  }
  return links
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
      // The server also writes the verdict's rationale (or markdown) as the
      // hypothesis's conclusion. On DEV every pending verdict proposes `active`
      // for a hypothesis that already is — the conclusion is what Approve changes.
      const records = (typeof p.rationale === 'string' && p.rationale.trim()) || (typeof p.markdown === 'string' && p.markdown.trim())
      return {
        label: `Hypothesis → ${status}`,
        to: '/research/loop/hypotheses',
        detail: records
          ? `sets the hypothesis to ${status} and records this verdict as its conclusion`
          : `sets the hypothesis to ${status}`,
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
