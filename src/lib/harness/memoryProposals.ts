/**
 * Proposed · from memory (design Rev .100, Vision §22.4; Owner 2026-09-28:
 * derived on this side, no proposal store).
 *
 * The outer loop's last arc: a memory that says something went wrong — a
 * said/did tension, or one backing a portrait axis the distill marked as a
 * weak spot — is proposed as the next objective. The loop never creates one
 * by itself; Draft objective passes you. Not now is the §20.6 dismissal
 * counter the memory store already keeps per topic (the same one the Plans
 * hint reads): three dismissals and the proposal goes quiet.
 */
import type { JournalMemory, MemoryAxis } from '@/api/research/journal'
import type { ObjectiveCreateBody, ResearchObjective } from '@/api/research/harness'
import { objectiveOrigin } from '@/lib/harness/objectiveOrigin'

/** §20.6 — research `HINT_QUIET_AT`. */
export const QUIET_AT = 3
/** Below this the distill has not seen the pattern often enough to propose from it. */
export const PROPOSE_STRENGTH = 0.5

export interface MemoryProposal {
  memory: JournalMemory
  title: string
  why: string
  thesis: string
  scope: string
  dismissals: number
  /** The objective already drafted from this memory, when there is one. */
  drafted: ResearchObjective | null
}

const TICKER = /^[A-Z][A-Z.]{0,5}$/

/** A memory the Console proposes from: strong, not archived, and saying something went wrong. */
export function isProposable(m: JournalMemory, axes: readonly MemoryAxis[]): boolean {
  if (m.archived || m.strength < PROPOSE_STRENGTH) return false
  return m.kind === 'tension' || axes.some((a) => a.warn && a.backs.includes(m.id))
}

export function memoryProposals(input: {
  memories: readonly JournalMemory[]
  axes: readonly MemoryAxis[]
  hints: Record<string, number>
  objectives: readonly ResearchObjective[]
}): MemoryProposal[] {
  return input.memories
    .filter((m) => isProposable(m, input.axes))
    .map((m) => {
      const drafted =
        input.objectives.find((o) => o.status === 'active' && objectiveOrigin(o)?.memory_id === m.id) ?? null
      const subject = m.value.trim()
      const text = m.text.trim().replace(/\.$/, '')
      return {
        memory: m,
        title: subject ? `Flag entries — ${subject}` : `Flag the pattern in ${m.id}`,
        why: `${m.id}: ${m.text.trim()}`,
        thesis: `${text} — flag new entries that repeat it, so the choice is deliberate.`,
        scope: TICKER.test(subject)
          ? `new entries on ${subject}; flags only, never blocks (D10)`
          : `new entries matching “${subject || m.topic}”, every symbol; flags only, never blocks (D10)`,
        dismissals: input.hints[m.topic] ?? 0,
        drafted,
      }
    })
    .filter((p) => p.drafted != null || p.dismissals < QUIET_AT)
}

/** The draft objective a proposal creates — the origin edge rides in `policy_json`. */
export function draftFromProposal(p: MemoryProposal, today: string): ObjectiveCreateBody {
  const m = p.memory
  return {
    title: p.title,
    description: `${p.thesis}\n\nScope: ${p.scope}\n\nBorn from memory ${m.id} (n=${m.evidence.length}, strength ${m.strength.toFixed(2)}) on ${today}.`,
    schedule: 'adhoc',
    policy_json: {
      origin: { kind: 'memory', memory_id: m.id, topic: m.topic, n: m.evidence.length, strength: m.strength, at: today },
    },
  }
}
