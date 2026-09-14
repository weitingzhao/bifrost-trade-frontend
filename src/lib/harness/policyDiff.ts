/**
 * What approving a policy suggestion would actually change, leaf by leaf.
 *
 * The Inbox diffed top-level fields and printed whole values, so `layers` —
 * three nested objects — filled a cell with JSON on both sides and ran off the
 * card, while the one number that moved (`sepa.min_score` 70 → 75) had to be
 * found by eye. And the suggestion repeats fields it leaves alone, so diffing
 * against it would overstate the change.
 *
 * The server merges its nested fields (`layers`, `option_overlay`, `resolution`
 * and three more) two levels deep and replaces every other field
 * (`repositories/objective._deep_merge_policy_patch`). So the
 * honest diff is between the current policy and that merge — what the objective
 * would read after Approve.
 */
import { computePolicySuggestionRows, type PolicyKey } from '@/lib/harness/harnessDraftHelpers'

type Rec = Record<string, unknown>

/** `_NESTED_POLICY_KEYS` in `repositories/objective.py` — six, not the two its docstring names. */
const NESTED_POLICY_KEYS = new Set(['layers', 'option_overlay', 'discovery_assist', 'resolution', 'triage', 'decline_memory'])

const isRec = (v: unknown): v is Rec => v != null && typeof v === 'object' && !Array.isArray(v)

/** One field after the server's merge. */
export function mergePolicyValue(key: string, current: unknown, patch: unknown): unknown {
  if (!NESTED_POLICY_KEYS.has(key) || !isRec(patch)) return patch
  const out: Rec = { ...(isRec(current) ? current : {}) }
  for (const [sub, val] of Object.entries(patch)) {
    const base = out[sub]
    out[sub] = isRec(val) && isRec(base) ? { ...base, ...val } : val
  }
  return out
}

function collectLeaves(value: unknown, path: string, into: Map<string, unknown>): void {
  if (isRec(value) && Object.keys(value).length > 0) {
    for (const [k, v] of Object.entries(value)) collectLeaves(v, `${path}.${k}`, into)
  } else {
    into.set(path, value)
  }
}

export interface PolicyLeafChange {
  /** `layers.sepa.min_score` */
  path: string
  /** The top-level field it belongs to — where its help text lives. */
  key: PolicyKey
  from: unknown
  to: unknown
}

export interface PolicyDiffView {
  changes: PolicyLeafChange[]
  unchanged: { key: PolicyKey; value: unknown }[]
}

export function policyDiffView(payload: Rec): PolicyDiffView {
  const changes: PolicyLeafChange[] = []
  const unchanged: PolicyDiffView['unchanged'] = []
  for (const row of computePolicySuggestionRows(payload)) {
    if (!row.changed) {
      unchanged.push({ key: row.key, value: row.current })
      continue
    }
    const before = new Map<string, unknown>()
    const after = new Map<string, unknown>()
    collectLeaves(row.current, row.key, before)
    collectLeaves(mergePolicyValue(row.key, row.current, row.proposed), row.key, after)
    const moved = [...new Set([...before.keys(), ...after.keys()])].filter(
      (p) => JSON.stringify(before.get(p)) !== JSON.stringify(after.get(p)),
    )
    // Changed as a whole value, but the merge lands on what is already there.
    if (moved.length === 0) {
      unchanged.push({ key: row.key, value: row.current })
      continue
    }
    for (const p of moved) changes.push({ path: p, key: row.key, from: before.get(p), to: after.get(p) })
  }
  return { changes, unchanged }
}

/** A leaf as it reads in the table. Absent and null are both "not set". */
export function formatPolicyLeaf(value: unknown): string {
  if (value === undefined || value === null) return 'not set'
  if (typeof value === 'string') return value || '(empty)'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
