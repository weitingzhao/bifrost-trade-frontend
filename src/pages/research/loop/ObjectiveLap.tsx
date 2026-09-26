/**
 * Its lap around the loop — six stations under the standing.
 *
 * Design: `Research Objective.dc.html` (Rev 2026-09-20.7) · Vision §20. The
 * counting is in `objectiveLapModel.ts`; what is here is the row, and one
 * behaviour that is the whole point of the design's ruling:
 *
 * **A chip does not just navigate — it takes the objective with it.** The
 * Owner asked for objective-as-workspace; the design answered that focus is a
 * *scope*, not a mode, and "a focused workspace is implemented page by page,
 * not as a mode" is exactly this: set the scope, then go, so the destination
 * opens already filtered. A chip that navigated without setting it would land
 * you on the Candidate Pool showing every machine's candidates, having just
 * clicked this machine's count.
 *
 * The Lens tells the truth about the rest: on a page that does not read the
 * scope yet, its token reads "held · not wired yet" rather than claiming a
 * filter that is not running.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { setObjective } from '@/lib/objectiveScope'
import { objectiveScopeState } from '@/lib/design/scopes'
import { fetchCandidates } from '@/api/research/candidates'
import { fetchObjectiveRuns, type AutopilotObjective } from '@/api/research/harness'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { useResearchDrafts } from '@/hooks/useResearchDrafts'
import { objectiveLap } from '@/pages/research/loop/objectiveLapModel'

export function ObjectiveLap({
  objectiveId,
  brief,
}: {
  objectiveId: string
  brief: AutopilotObjective | null
}) {
  const navigate = useNavigate()

  const candidatesQ = useQuery({
    queryKey: ['research', 'candidates', 'lap', 'open'],
    queryFn: () => fetchCandidates({ status: 'open' }),
    staleTime: 30_000,
  })
  const runsQ = useQuery({
    queryKey: ['research', 'objective-runs', 'lap', objectiveId],
    queryFn: () => fetchObjectiveRuns({ objective_id: objectiveId, limit: 200 }),
    staleTime: 30_000,
  })
  const hypothesesQ = useHypothesisList({ limit: 200 })
  const draftsQ = useResearchDrafts({ status: 'pending', kind: 'policy_suggestion', limit: 100 })

  const runIds = useMemo(
    () => new Set((runsQ.data?.items ?? []).map((r) => r.id)),
    [runsQ.data],
  )

  const stations = useMemo(
    () =>
      objectiveLap({
        objectiveId,
        brief,
        candidates: candidatesQ.data?.items ?? [],
        runIds,
        hypotheses: hypothesesQ.data?.rows ?? [],
        drafts: draftsQ.data?.rows ?? [],
      }),
    [objectiveId, brief, candidatesQ.data, runIds, hypothesesQ.data, draftsQ.data],
  )

  return (
    <section
      aria-label="Its lap around the loop"
      className="border px-3 py-2 mat-card"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-1.5">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Its lap around the loop
        </span>
        <span className="text-dense-meta text-muted-foreground">
          what this machine is holding at each station — a chip takes the objective with it
        </span>
      </div>

      <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
        {stations.map((s) => {
          // An empty station is dimmed, never hidden: four empties in a row is
          // what a draft objective looks like, and that shape is its status.
          const empty = s.value == null || s.value === 0
          const wired = objectiveScopeState(s.to) === 'read-here'
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setObjective(objectiveId)
                  navigate(s.to)
                }}
                title={
                  wired
                    ? 'Opens with this objective in scope — that page filters by it'
                    : 'Opens with this objective in scope. That page does not read the scope yet, and the Lens says so.'
                }
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded border px-2 py-1.5 text-left transition-colors',
                  'border-border hover:bg-secondary',
                  empty && 'opacity-55',
                )}
              >
                <span className="flex w-full items-baseline gap-1.5">
                  <span
                    className={cn(
                      'font-mono text-dense-micro',
                      s.crossesOuterLoop ? 'text-[var(--color-entity-strategy)]' : 'text-muted-foreground/60',
                    )}
                  >
                    {s.n}
                  </span>
                  <span className="text-dense-label font-medium">{s.label}</span>
                  <span className="ml-auto font-mono text-dense-body font-semibold tabular-nums">
                    {s.value == null ? '—' : s.value.toLocaleString()}
                  </span>
                </span>
                <span className="text-dense-caption leading-snug text-muted-foreground">{s.detail}</span>
                {s.crossesOuterLoop ? (
                  <span className="text-dense-caption text-[var(--color-entity-strategy)]">
                    crosses the outer loop
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
