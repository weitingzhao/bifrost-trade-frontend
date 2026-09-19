/**
 * Which operator wrote a research object — hand, loop or copilot.
 *
 * Vision §3: every artifact carries `operator` in its provenance. The server
 * does not store the field yet, so until the provenance columns land (plan
 * W2) the operator is read off the birthplace the rows already carry:
 * `hypothesis.origin_page` and `candidate_pool.source`. The mapping is a
 * heuristic over names this side already writes; anything unrecognised is the
 * hand, because every machine writer stamps its origin and a bare row is a
 * person.
 */
export type ResearchOperator = 'hand' | 'loop' | 'copilot'

const LOOP_TOKENS = ['candidate', 'batch', 'loop', 'harness', 'curator', 'autopilot', 'objective']
const COPILOT_TOKENS = ['cockpit', 'copilot', 'chat', 'digest', 'brief', 'morning', 'eod', 'suggestion']

/** Operator from a hypothesis' `origin_page` (or any origin-shaped token). */
export function operatorOf(originPage: string | null | undefined): ResearchOperator {
  const s = (originPage ?? '').toLowerCase()
  if (LOOP_TOKENS.some((t) => s.includes(t))) return 'loop'
  if (COPILOT_TOKENS.some((t) => s.includes(t))) return 'copilot'
  return 'hand'
}

/**
 * Operator from a candidate's `source`. The design's own rule (Candidate
 * Pool, Rev 2026-09-18.2): YOU → hand, CURATOR → loop, SCREEN → hand — a
 * screen you ran is still your hand on the scan station.
 */
export function sourceOperatorOf(source: string | null | undefined): ResearchOperator {
  const s = (source ?? '').toLowerCase()
  if (s === 'you' || s === 'owner' || s === 'manual') return 'hand'
  if (LOOP_TOKENS.some((t) => s.includes(t)) || s === 'harness') return 'loop'
  if (COPILOT_TOKENS.some((t) => s.includes(t))) return 'copilot'
  return 'hand'
}

/** The chip classes per operator — semantic tokens, no raw ink. */
export const OPERATOR_CHIP: Record<ResearchOperator, string> = {
  hand: 'border-border text-foreground',
  loop: 'border-border text-muted-foreground',
  copilot: 'border-primary/40 text-primary',
}
