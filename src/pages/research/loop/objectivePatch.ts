/**
 * The policy patches waiting on this objective — the design's PATCH PENDING
 * banner, read off the queue rather than off a flag.
 *
 * A patch is a `policy_suggestion` draft scoped to the objective
 * (`scope: "objective:<id>"`, and `payload.objective_id` says the same). It
 * carries the whole proposed policy and the whole current one, so the diff is
 * computed here rather than stored: the two objects are the record, and a
 * stored diff would be a third thing that can disagree with them.
 *
 * Measured on DEV 2026-09-22: 20+ pending patches against one objective, all
 * written by `persona_eval_outcomes` off a run. The design draws one banner;
 * with a queue this long the banner leads with the newest and says how many
 * are behind it, because "a patch is waiting" and "twenty are" are different
 * facts about the same machine.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { readKey } from '@/lib/readUnknown'

export interface PolicyPatch {
  draftId: string
  /** `layers.sepa.min_score  70 → 78` — one line per changed leaf. */
  lines: string[]
  /** The model's own reason, when it wrote one. */
  why: string | null
  createdAt: string
}

/** `a.b.c` for every leaf, so two policies can be compared without their shape. */
function flatten(value: unknown, prefix = '', out: Record<string, string> = {}) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) out[prefix] = Array.isArray(value) ? JSON.stringify(value) : String(value)
    return out
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    flatten(v, prefix ? `${prefix}.${k}` : k, out)
  }
  return out
}

/** Every leaf the suggestion moves, as `key  before → after`. */
export function policyDiff(current: unknown, suggestion: unknown): string[] {
  const a = flatten(current)
  const b = flatten(suggestion)
  const lines: string[] = []
  for (const [k, after] of Object.entries(b)) {
    const before = a[k]
    if (before === after) continue
    lines.push(`${k}  ${before ?? '—'} → ${after}`)
  }
  return lines.sort()
}

/** Newest first — the banner leads with the most recent argument. */
export function pendingPolicyPatches(
  drafts: readonly AiDraft[],
  objectiveId: string,
): PolicyPatch[] {
  const want = `objective:${objectiveId}`
  return drafts
    .filter((d) => d.kind === 'policy_suggestion' && d.status === 'pending')
    .filter((d) => d.scope === want || d.payload?.objective_id === objectiveId)
    .map((d) => ({
      draftId: d.id,
      lines: policyDiff(d.payload?.current_policy, d.payload?.suggestion),
      why: readKey(d.payload, 'llm_reasoning') ?? readKey(d.payload, 'source'),
      createdAt: d.created_at,
    }))
    .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1))
}
