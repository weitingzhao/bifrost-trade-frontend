/**
 * Where an objective came from, and the dial it runs at (design Rev .100,
 * Vision §22.2 · §22.4; Owner 2026-09-28).
 *
 * **Origin.** An objective drafted from a memory proposal records the memory
 * in `policy_json.origin` — the create endpoint keeps unknown top-level policy
 * keys (research `policy_schema.parse_policy` is fail-soft), so the edge needs
 * no new column. Trace, the Console's Loop strip and the Objective page's lap
 * all read it here; an objective without it was born before the edge existed
 * and says so.
 *
 * **Dial.** Vision §8 defines L0 (nothing auto-accepted) and L1 (research
 * drafts accepted when the leash holds; Trust L0 + leash today); L2 and L3 do
 * not exist. The Owner chose a reading, not a new control: an objective is at
 * L1 only when the loop decides for it (`mode: auto`) and Trust grants L0;
 * everything else — worked by hand, or the loop proposing and you deciding —
 * accepts nothing on its own, which is L0. The auto-approve path is unchanged.
 */
import type { ResearchObjective } from '@/api/research/harness'

export interface MemoryOrigin {
  kind: 'memory'
  memory_id: string
  topic: string
  n: number
  strength: number
  /** The day the draft was created from the proposal (YYYY-MM-DD). */
  at: string
}

export function objectiveOrigin(o: Pick<ResearchObjective, 'policy_json'> | null | undefined): MemoryOrigin | null {
  const raw = (o?.policy_json as { origin?: unknown } | undefined)?.origin
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.kind !== 'memory' || typeof r.memory_id !== 'string' || !r.memory_id) return null
  return {
    kind: 'memory',
    memory_id: r.memory_id,
    topic: typeof r.topic === 'string' ? r.topic : '',
    n: typeof r.n === 'number' ? r.n : 0,
    strength: typeof r.strength === 'number' ? r.strength : 0,
    at: typeof r.at === 'string' ? r.at : '',
  }
}

export type Dial = 'L0' | 'L1'

export function objectiveDial(
  o: Pick<ResearchObjective, 'mode'>,
  trustL0: boolean,
): { dial: Dial; why: string } {
  if (o.mode === 'auto' && trustL0)
    return { dial: 'L1', why: 'L1 — the leash decides: research drafts are accepted when all four conditions hold; everything else waits for you.' }
  if (o.mode === 'auto')
    return { dial: 'L0', why: 'L0 — the loop decides for this objective, but Trust is not L0, so nothing is accepted on its own.' }
  if (o.mode === 'hand') return { dial: 'L0', why: 'L0 — worked by hand; nothing is accepted on its own.' }
  return { dial: 'L0', why: 'L0 — the loop proposes and you decide; nothing is accepted on its own.' }
}
