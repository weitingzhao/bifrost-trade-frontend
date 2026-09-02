/**
 * Pure helpers for Harness draft payload inspection (Wave Y.3-FE).
 *
 * Kept small and side-effect free so DraftCard can stay a dumb render
 * component and the logic gets its own unit tests.
 */
import type { AiDraft } from '@/api/researchDrafts'

/** Fields the runtime may accept in policy_json (mirrors backend whitelist). */
export const POLICY_SUGGESTION_KEYS = [
  'preset',
  'flag_filter',
  'min_composite_score',
  'min_hit_rate',
  'max_candidates',
] as const

export type PolicyKey = (typeof POLICY_SUGGESTION_KEYS)[number]

/**
 * What each whitelist field gates, and what leaving it unset means.
 *
 * Mirrors `copilot/harness/policy_schema.py` (`LoopPolicy` defaults and
 * `validate_policy_for_mode`). A diff table that shows `min_hit_rate` as an
 * absence without saying the gate is off is a table you have to ask about.
 */
export const POLICY_FIELD_HELP: Record<PolicyKey, string> = {
  preset:
    'Scoring weights for the scan layer. "neutral" keeps the stored composite score as-is. In stock_composite mode it applies only to the option overlay.',
  flag_filter:
    'Keep only symbols carrying these lens flags. Not set = no flag filter, every symbol passes this layer.',
  min_composite_score:
    'Floor on the composite score. Not set = no floor, the layer drops nobody.',
  min_hit_rate:
    'Hit-rate gate on the selected lenses. Not set = gate off; it is ignored in stock modes anyway unless flag_filter is set.',
  max_candidates:
    'Cap on how many candidates one run may propose. Always set — the run stops at this many.',
}

export interface PolicyDiffRow {
  key: PolicyKey
  current: unknown
  proposed: unknown
  changed: boolean
}

/**
 * Compute (current vs. suggestion) rows for a ``policy_suggestion`` draft.
 *
 * Returns an entry for each whitelist key present in EITHER dict.  Rows
 * are ordered by ``POLICY_SUGGESTION_KEYS`` so the diff table renders
 * deterministically.
 */
export function computePolicySuggestionRows(
  payload: Record<string, unknown>,
): PolicyDiffRow[] {
  const current = _dict(payload.current_policy)
  const suggestion = _dict(payload.suggestion)
  const rows: PolicyDiffRow[] = []
  for (const key of POLICY_SUGGESTION_KEYS) {
    const inSug = Object.prototype.hasOwnProperty.call(suggestion, key)
    const inCur = Object.prototype.hasOwnProperty.call(current, key)
    if (!inSug && !inCur) continue
    const cur = inCur ? current[key] : undefined
    const prop = inSug ? suggestion[key] : undefined
    rows.push({
      key,
      current: cur,
      proposed: prop,
      changed: inSug && !_valuesEqual(cur, prop),
    })
  }
  return rows
}

/** How many whitelist fields a `policy_suggestion` would actually write. */
export function policySuggestionMergeCount(payload: Record<string, unknown>): number {
  return computePolicySuggestionRows(payload).filter((r) => r.changed).length
}

/**
 * True when approving this draft would change something.
 *
 * A `policy_suggestion` whose whitelist-eligible fields are all unchanged is
 * reading material, not a call: Approve writes nothing. Counting those as
 * decisions is how the Inbox came to claim eleven pending calls when three
 * batches and eight no-ops were waiting — and an Approve button that does
 * nothing teaches you to clear the queue without looking.
 */
export function isActionableDraft(draft: AiDraft): boolean {
  if (!isDecisionKind(draft.kind)) return false
  if (draft.kind === 'policy_suggestion') return policySuggestionMergeCount(draft.payload) > 0
  return true
}

/** True when a `candidate_batch` payload carries the Y.3 warn flag. */
export function isHitRateWarnActive(payload: Record<string, unknown>): boolean {
  return payload.hit_rate_warn === true
}

/** Extract failing lens keys from a `candidate_batch` draft (empty when none). */
export function hitRateFailingLenses(payload: Record<string, unknown>): string[] {
  const gate = _dict(payload.hit_rate_gate)
  const failing = gate.failing
  if (!Array.isArray(failing)) return []
  return failing.filter((v): v is string => typeof v === 'string')
}

/** Read `data_source` off a candidate_batch payload for badge rendering. */
export function candidateBatchDataSource(payload: Record<string, unknown>): string | null {
  const v = payload.data_source
  return typeof v === 'string' && v ? v : null
}

/** Extract shape ``{ id, symbol, score? }[]`` for the candidate_batch preview. */
export interface CandidateEvidence {
  /** Why this symbol — SEPA components, grade, path. */
  selection?: { status?: string; sepa_score?: number | null; grade?: string | null; path?: string | null }
  /** Single-stock option view; NOT MEASURED for most symbols, with a reason. */
  option_analytics?: { status?: string; reason?: string }
  /** How this source's candidates have actually settled (Wave W2). */
  track_record?: { status?: string; reason?: string; horizons?: { horizon_days: number; hit_rate: number | null }[] }
  /** What would make the call wrong. */
  invalidation?: string[]
}

export interface CandidateItem {
  id: string
  symbol: string
  score: number | null
  evidence: CandidateEvidence | null
}
export function candidateBatchItems(payload: Record<string, unknown>): CandidateItem[] {
  const raw = payload.items
  if (!Array.isArray(raw)) return []
  const out: CandidateItem[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const rec = r as Record<string, unknown>
    const id = typeof rec.id === 'string' ? rec.id : ''
    const symbol = typeof rec.symbol === 'string' ? rec.symbol : ''
    if (!id || !symbol) continue
    const rawScore = rec.score
    const score =
      typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null
    const ev = rec.evidence
    const evidence =
      ev && typeof ev === 'object' && !Array.isArray(ev) ? (ev as CandidateEvidence) : null
    out.push({ id, symbol, score, evidence })
  }
  return out
}

/**
 * Human-readable rendering for a policy_json value cell.
 *
 * `null` and `undefined` are different absences and must not read alike:
 * `undefined` means the model did not touch this field, `null` means the field
 * carries no constraint — the gate is off. Printing the literal `null` made an
 * unset gate look like a value, the same trap as rendering NOT MEASURED as 0.
 */
export function formatPolicyValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'not set'
  if (typeof value === 'string') return value || '(empty)'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function _dict(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function _valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}

/** Recurring agent posts — they accumulate and should not crowd out decisions. */
export const BRIEFING_KINDS = new Set<string>(['morning_brief', 'eod_verdict'])

/** Loop drafts. A narrower view, not a separate inbox. */
export const LOOP_KINDS = new Set<string>(['candidate_batch', 'policy_suggestion'])

/**
 * Anything that is not a recurring briefing needs a call.
 *
 * By exclusion on purpose: the backend emits kinds the UI does not model (e.g.
 * `order_intent`), and an allowlist would drop exactly the unrecognised draft a
 * human most needs to see.
 *
 * Loop drafts were excluded too, from when the Loop rarely produced any. Once it
 * did, the page opened on "Nothing to decide" with twenty candidate batches and
 * policy suggestions waiting — both of which carry Approve / Dismiss.
 */
export function isDecisionKind(kind: string): boolean {
  return !BRIEFING_KINDS.has(kind)
}

/** A decision, plus the identical drafts it supersedes. */
export interface DraftGroup {
  /** Newest draft — the one that carries the call. */
  draft: AiDraft
  /** Older drafts proposing exactly the same thing, newest first. */
  superseded: AiDraft[]
}

/**
 * Collapse repeated Loop batches into one decision.
 *
 * A daily objective re-run every few minutes posts a `candidate_batch` each
 * time. On 2026-09-01 thirteen runs of `obj-daily-loop-stock` proposed exactly
 * the same eight symbols and three runs of the IV watch proposed the same
 * three, so the Inbox read "25 to decide" for three real calls — the count was
 * honest, the content was not.
 *
 * Deliberately narrow: only `candidate_batch`, and only on an exact match of
 * objective and symbol set. Two batches differing by one symbol are two
 * decisions, and hiding one behind the other costs more than the duplication.
 * Everything else passes through as its own group, in input order.
 */
export function groupIdenticalDrafts(rows: AiDraft[]): DraftGroup[] {
  const slots: (DraftGroup | null)[] = []
  const members = new Map<string, AiDraft[]>()
  const slotOf = new Map<string, number>()

  for (const draft of rows) {
    const key = _batchKey(draft)
    if (key === null) {
      slots.push({ draft, superseded: [] })
      continue
    }
    const seen = members.get(key)
    if (seen) {
      seen.push(draft)
      slots.push(null)
      continue
    }
    members.set(key, [draft])
    slotOf.set(key, slots.length)
    slots.push(null)
  }

  for (const [key, group] of members) {
    const [newest, ...superseded] = group.slice().sort(_newestFirst)
    slots[slotOf.get(key) as number] = { draft: newest, superseded }
  }

  return slots.filter((g): g is DraftGroup => g !== null)
}

/** Grouping key, or null when the draft must never be collapsed. */
function _batchKey(draft: AiDraft): string | null {
  if (draft.kind !== 'candidate_batch') return null
  const objective = draft.payload?.objective_id
  if (typeof objective !== 'string' || !objective) return null
  const symbols = candidateBatchItems(draft.payload)
    .map((i) => i.symbol)
    .sort()
  return `${objective} ${symbols.join(',')}`
}

function _newestFirst(a: AiDraft, b: AiDraft): number {
  const ta = Date.parse(a.created_at)
  const tb = Date.parse(b.created_at)
  if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta
  // Unparsable or tied timestamps must still order deterministically.
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
}
