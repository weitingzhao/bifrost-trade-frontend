/**
 * Pure helpers for Harness draft payload inspection (Wave Y.3-FE).
 *
 * Kept small and side-effect free so DraftCard can stay a dumb render
 * component and the logic gets its own unit tests.
 */

/** Fields the runtime may accept in policy_json (mirrors backend whitelist). */
export const POLICY_SUGGESTION_KEYS = [
  'preset',
  'flag_filter',
  'min_composite_score',
  'min_hit_rate',
  'max_candidates',
] as const

export type PolicyKey = (typeof POLICY_SUGGESTION_KEYS)[number]

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
export interface CandidateItem {
  id: string
  symbol: string
  score: number | null
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
    out.push({ id, symbol, score })
  }
  return out
}

/** Human-readable rendering for a policy_json value cell. */
export function formatPolicyValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
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
