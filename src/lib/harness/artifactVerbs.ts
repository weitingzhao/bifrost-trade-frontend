/**
 * The six verbs every artifact carries (Research Vision §6).
 *
 * One vocabulary on every surface — bench result, pipeline memo, Inbox card,
 * Book card — so the words mean the same thing wherever you meet them. Four
 * read and never write, Settle records a fact, and **Distill is the one write**,
 * which is why it is amber on every card rather than on the card you happen to
 * be looking at. Amber here is a write marker, not a highlight.
 *
 * State rules are the design's (Rev 2026-09-22.7): `on` is the open Explain;
 * `off` is Settle on any pending card — it is inside its horizon, and pending
 * is not a miss — plus Distill on a policy or a patch, which already is one.
 *
 * None of the five besides Explain has anything behind it on this side yet.
 * They are drawn, because a card that omits them says the vocabulary does not
 * apply here, and they say what they would do rather than pretending to do it.
 */
export type VerbKey = 'explain' | 'challenge' | 'fork' | 'extend' | 'settle' | 'distill'

export interface VerbSpec {
  key: VerbKey
  label: string
  tip: string
  /** The one verb that writes. Amber on every card it appears on. */
  write: boolean
}

export const VERBS: readonly VerbSpec[] = [
  { key: 'explain', label: 'Explain', tip: 'Where did this come from — walk the provenance chain', write: false },
  { key: 'challenge', label: 'Challenge', tip: 'The strongest case against it, and what would falsify it', write: false },
  { key: 'fork', label: 'Fork', tip: 'Change one thing and re-run the same station on a branch', write: false },
  { key: 'extend', label: 'Extend', tip: 'What evidence is missing — go and fetch it', write: false },
  { key: 'settle', label: 'Settle', tip: 'What happened after — which evidence was right', write: false },
  {
    key: 'distill',
    label: 'Distill',
    tip: 'Turn this into a hypothesis, a policy patch or a rule — through the Inbox',
    write: true,
  },
]

const RULE_KINDS = new Set(['policy_suggestion', 'playbook_rule'])
const NO_WRITE_KINDS = new Set(['decision_draft', 'order_intent'])

/** Which verbs this artifact cannot offer, by the design's rules. */
export function verbsOff(kind: string): ReadonlySet<VerbKey> {
  const off = new Set<VerbKey>(['settle'])
  if (RULE_KINDS.has(kind)) off.add('distill')
  return off
}

/** What a verb would do to this artifact — the sentence, when there is no doing. */
export function verbNote(kind: string, verb: VerbKey): string {
  const isRule = RULE_KINDS.has(kind)
  const noWrite = NO_WRITE_KINDS.has(kind)
  const noun = kind.replace(/_/g, ' ')
  switch (verb) {
    case 'challenge':
      return `Challenge — the strongest case against this ${noun} is written as an opposing verdict under it. It does not block Approve; it is scored when the item settles.`
    case 'fork':
      return isRule
        ? 'Fork — re-run the same station with another value and compare. Branches are free; only a Distill writes.'
        : noWrite
          ? 'Fork — re-run the curator on this hypothesis with one input changed; the result is a sibling card, not a replacement.'
          : 'Fork — re-run the objective with one parameter changed; the result is a sibling of this draft, not a replacement.'
    case 'extend':
      return 'Extend — fetch the evidence this draft is thin on and attach it to its inputs. Nothing else changes.'
    case 'settle':
      return isRule
        ? 'Settle — policies do not settle; the runs they shape do.'
        : 'Settle — not yet. This item is inside its horizon; pending is not a miss.'
    case 'distill':
      return isRule
        ? 'Already a Distill — approving it is the merge.'
        : noWrite
          ? 'Distill — turn this call into a Playbook rule or a policy patch. The result is a new Inbox card; the call itself writes nothing.'
          : 'Distill — turn this draft into a hypothesis, a policy patch or a Playbook rule. The result is a new Inbox card.'
    case 'explain':
      return ''
  }
}

/**
 * The half of Explain this side can answer.
 *
 * The prototype walks operator · inputs · policy_ref · data_asof · parent ·
 * thread. Measured on DEV 2026-09-22 over the pending queue: `thread` is null
 * on every draft — nothing here distils one out of a Copilot thread yet — and
 * there is no inputs or policy_ref store at all. So the panel carries what is
 * held and names what is not, rather than printing six rows of which four are
 * dashes with no reason given.
 */
export const EXPLAIN_UNHELD =
  'inputs and policy_ref have no store on this side, and no draft is distilled from a Copilot thread yet — the chain stops at the artifact and its run.'
