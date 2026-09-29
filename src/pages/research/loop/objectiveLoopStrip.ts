/**
 * The Console card's Loop line (design Rev .100/.102, Owner 2026-09-28,
 * Vision §22.2): this objective's walk around the two loops — belief
 * borrowed, runs, settles, the memory, the proposal. Lit segments happened and
 * open their landing; dashed ones have not, and say why. Same grammar as
 * Trace, same contract: every segment is derived from what the stores hold.
 */
import type { AutopilotTrackRecord, ResearchObjective } from '@/api/research/harness'
import { objectiveOrigin } from '@/lib/harness/objectiveOrigin'

export interface LoopSegment {
  id: 'belief' | 'runs' | 'settled' | 'memory' | 'proposal'
  label: string
  lit: boolean
  tip: string
  /** A route, or `runs` for the card's own runs fold. */
  to: string | null
}

export function objectiveLoopStrip(
  row: Pick<ResearchObjective, 'policy_json'>,
  runs: number,
  rec: AutopilotTrackRecord | null,
): LoopSegment[] {
  const origin = objectiveOrigin(row)
  const settled = rec?.status === 'ok' && rec.scope !== 'source' && rec.judged > 0
  const right = settled && rec?.hit_rate != null ? Math.round(rec.hit_rate * rec.judged) : null
  return [
    {
      id: 'belief',
      label: 'no belief yet',
      lit: false,
      tip: origin
        ? `Born from memory ${origin.memory_id}, not from a Book belief — the first settle would open one (§22.2). Not walked yet.`
        : 'Borrowed from The Book — an objective does not record the belief it was drafted from yet. Not walked yet.',
      to: null,
    },
    runs > 0
      ? { id: 'runs', label: `${runs} run${runs === 1 ? '' : 's'}`, lit: true, tip: 'The six stations — opens this objective’s runs', to: 'runs' }
      : { id: 'runs', label: 'no runs', lit: false, tip: 'Never run — a draft runs when you run it. Not walked yet.', to: null },
    settled
      ? {
          id: 'settled',
          label: `${rec!.judged} settled${right != null ? ` · ${right}✓` : ''}`,
          lit: true,
          tip: 'Verdicts returned — this objective’s own picks, judged against SPY. Opens the Journal.',
          to: '/research/journal',
        }
      : {
          id: 'settled',
          label: 'nothing settled',
          lit: false,
          tip:
            rec?.scope === 'source'
              ? 'Only the harness-wide record stands in — none of this objective’s own picks has settled. Not walked yet.'
              : 'None of its picks has settled yet. Not walked yet.',
          to: null,
        },
    origin
      ? {
          id: 'memory',
          label: origin.memory_id,
          lit: true,
          tip: `Born from memory ${origin.memory_id} — its Trace walks the chain.`,
          to: `/research/trace?m=${encodeURIComponent(origin.memory_id)}`,
        }
      : {
          id: 'memory',
          label: 'no memory yet',
          lit: false,
          tip: 'Memories cite fills and decisions; none is attributed to this objective’s runs yet. Not walked yet.',
          to: null,
        },
    origin
      ? {
          id: 'proposal',
          label: 'proposed',
          lit: true,
          tip: `Drafted from Proposed · from memory on this console${origin.at ? ` on ${origin.at}` : ''}.`,
          to: `/research/trace?m=${encodeURIComponent(origin.memory_id)}`,
        }
      : { id: 'proposal', label: 'no proposal', lit: false, tip: 'Not drafted from a memory proposal. Not walked yet.', to: null },
  ]
}
