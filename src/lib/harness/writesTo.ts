/**
 * Where Approve writes — the Inbox's `Writes to` filter (design Rev 2026-09-23.1)
 * and, since Rev .143, the axis the whole Decisions stream is grouped on.
 *
 * The page used to narrow by the API's own kind, thirteen of them flattened
 * into one Select. That names the record rather than the consequence, and the
 * consequence is what the reader is choosing between: a candidate batch and a
 * hypothesis draft are different rows and the same question — does this go
 * into The Book. The kind tag says where Approve writes, so the filter runs
 * along that axis rather than beside it.
 */
import type { DraftKind } from '@/api/researchDrafts'

export type WritesTo = 'rules' | 'policy' | 'book' | 'pool' | 'nothing'

/**
 * The design's five places, and the kinds that land in each.
 *
 * `policy_suggestion` is not here: it splits by scope (Rev .143 #3), see
 * `writesTo`. `playbook_note` writes to the Playbook exactly as a
 * `playbook_rule` does, so it sits in Rules with it (Owner 2026-10-04 #10) —
 * before that it was in no place at all and only `Any` showed it.
 */
const BY_KIND: Partial<Record<DraftKind, WritesTo>> = {
  playbook_rule: 'rules',
  playbook_note: 'rules',
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

/** An objective-scoped policy suggestion edits that objective's policy: a patch. */
export function isObjectivePatch(kind: string, scope: string | null | undefined): boolean {
  return kind === 'policy_suggestion' && (scope ?? '').startsWith('objective:')
}

/**
 * Where approving this kind writes, or null for a kind no place owns (the
 * briefings, and anything the server adds before this file hears of it).
 *
 * `policy_suggestion` reads its scope (Rev .143 #3): `objective:<id>` merges
 * into that objective's policy, so it is Policy; anything else is the
 * rule-keeper's Opportunity-level suggestion and edits Rules. The page used to
 * send all of them to Rules and draw Policy empty — on DEV every one of them
 * is objective-scoped, so Rules read 32 and Policy 0.
 */
export function writesTo(kind: string, scope?: string | null): WritesTo | null {
  if (kind === RULE_PROPOSAL_KIND) return 'rules'
  if (kind === 'policy_suggestion') return isObjectivePatch(kind, scope) ? 'policy' : 'rules'
  return BY_KIND[kind as DraftKind] ?? null
}

export const WRITES_TO_ORDER: readonly WritesTo[] = ['rules', 'policy', 'book', 'pool', 'nothing']

export const WRITES_TO_LABEL: Record<WritesTo, string> = {
  rules: 'Rules',
  policy: 'Policy',
  book: 'Book',
  pool: 'Pool',
  nothing: 'Nothing',
}

/** The section head's sentence: what Approve does in this place (prototype `PLACES`). */
export const WRITES_TO_NOTE: Record<WritesTo, string> = {
  rules: 'Approve edits a rule in Trading › Rules or files it in the Playbook',
  policy: 'Approve merges into an objective’s policy; the next run reads it',
  book: 'Approve opens a hypothesis in The Book',
  pool: 'Approve enters the candidates into the pool and opens a hypothesis per name',
  nothing: 'Record answer marks the call answered on the hypothesis; nothing is written (D10)',
}
