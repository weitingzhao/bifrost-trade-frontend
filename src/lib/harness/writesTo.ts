/**
 * Where Approve writes — the Inbox's `Writes to` filter (design Rev 2026-09-23.1).
 *
 * The page used to narrow by the API's own kind, thirteen of them flattened
 * into one Select. That names the record rather than the consequence, and the
 * consequence is what the reader is choosing between: a candidate batch and a
 * hypothesis draft are different rows and the same question — does this go
 * into The Book. The kind tag's colour has always said where Approve writes,
 * so the filter runs along that axis rather than beside it.
 */
import type { DraftKind } from '@/api/researchDrafts'

export type WritesTo = 'rules' | 'policy' | 'book' | 'pool' | 'nothing'

/**
 * The design's five places, and the kinds that land in each.
 *
 * `patch` is in the design's mapping and not in this API: what the design
 * calls a patch arrives here as a `policy_suggestion` carrying
 * `current_policy` and `suggestion`, and the design maps that name to Rules
 * directly. So Policy is drawn with nothing in it rather than quietly given
 * the policy suggestions — an empty place says the kind has not reached this
 * side, and a mislabelled one would say it had.
 */
const BY_KIND: Partial<Record<DraftKind, WritesTo>> = {
  playbook_rule: 'rules',
  policy_suggestion: 'rules',
  hypothesis_suggestion: 'book',
  hypothesis_draft: 'book',
  candidate_batch: 'pool',
  decision_draft: 'nothing',
  order_intent: 'nothing',
}

/**
 * A rule proposal is not a server kind at all — it is derived from the habits
 * on this side — but it writes where a `playbook_rule` writes, which is the
 * whole reason the merge is one queue rather than two.
 */
export const RULE_PROPOSAL_KIND = 'rule'

export function writesTo(kind: string): WritesTo | null {
  if (kind === RULE_PROPOSAL_KIND) return 'rules'
  return BY_KIND[kind as DraftKind] ?? null
}

/**
 * The tag a card carries. `policy_suggestion` and a review proposal write to
 * the same place and are drawn as one word, because two labels for one
 * consequence is the thing the colour was already saying was the same.
 */
export function kindLabel(kind: string): string {
  if (kind === RULE_PROPOSAL_KIND || kind === 'policy_suggestion') return 'rule'
  if (kind === 'order_intent') return 'vehicle'
  return kind.replace(/_/g, ' ')
}

export const WRITES_TO_ORDER: readonly WritesTo[] = ['rules', 'policy', 'book', 'pool', 'nothing']

export const WRITES_TO_LABEL: Record<WritesTo, string> = {
  rules: 'Rules',
  policy: 'Policy',
  book: 'Book',
  pool: 'Pool',
  nothing: 'Nothing',
}
