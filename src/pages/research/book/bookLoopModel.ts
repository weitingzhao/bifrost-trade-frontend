/**
 * The loop instrument's numbers (design Rev .100, Book "The loop", Vision
 * §22.6). Every node is a door and every arc carries a live count where one
 * exists; an arc the app has no edge for is drawn dashed and says why, rather
 * than carrying the prototype's fixture number.
 */
import type { AutopilotObjective, ObjectiveRun } from '@/api/research/harness'
import type { Hypothesis } from '@/api/researchHypothesis'
import type { MemoryPayload } from '@/api/research/journal'
import { isProposable, QUIET_AT } from '@/lib/harness/memoryProposals'

export interface LoopReading {
  beliefs: number | null
  running: number | null
  runsToday: number | null
  /** `49 · 18 right`, or null before anything settled. */
  settled: string | null
  traces: number | null
  memory: string | null
  /** Open proposals on the Console (Rev .100 V3) — the memory → objective arc; null before memory answers. */
  proposes: number | null
  /** Arcs with no edge in the app yet — drawn dashed, with the reason as their title. */
  owed: { borrow: string }
}

export function loopReading(input: {
  hypotheses: readonly Pick<Hypothesis, 'status'>[] | null
  objectives: readonly Pick<AutopilotObjective, 'status' | 'track_record'>[] | null
  runs: readonly Pick<ObjectiveRun, 'started_at'>[] | null
  todayTraces: number | null
  memory: Pick<MemoryPayload, 'memories' | 'week' | 'axes' | 'hints'> | null
  today: string
}): LoopReading {
  const judged = input.objectives?.reduce((a, o) => a + (o.track_record?.judged ?? 0), 0) ?? null
  const right =
    input.objectives?.reduce(
      (a, o) => a + Math.round((o.track_record?.judged ?? 0) * (o.track_record?.hit_rate ?? 0)),
      0,
    ) ?? null
  return {
    beliefs: input.hypotheses ? input.hypotheses.filter((h) => h.status === 'active').length : null,
    running: input.objectives ? input.objectives.filter((o) => o.status === 'active').length : null,
    runsToday: input.runs ? input.runs.filter((r) => (r.started_at ?? '').slice(0, 10) === input.today).length : null,
    settled: judged == null ? null : judged === 0 ? '0' : `${judged} · ${right} right`,
    traces: input.todayTraces,
    memory: input.memory ? `${input.memory.memories.length} · ${input.memory.week.moved} this week` : null,
    proposes: input.memory
      ? input.memory.memories.filter(
          (m) => isProposable(m, input.memory!.axes) && (input.memory!.hints[m.topic] ?? 0) < QUIET_AT,
        ).length
      : null,
    owed: {
      borrow: 'Objectives record no Book belief they were drafted from — one drafted from a memory proposal records the memory, and a memory is not a belief.',
    },
  }
}
