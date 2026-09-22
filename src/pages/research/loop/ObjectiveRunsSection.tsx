/**
 * The runs one objective has produced, with the same actions the Autopilot
 * page offers — open the memo, approve, curate, delete.
 *
 * The design adds a state filter (All · Awaiting · Running · Completed ·
 * Failed) and a count that says when the list is cut. It filters the rows
 * already fetched rather than asking the server again: the history is short
 * enough to hold, and a filter that round-trips reads as a different page
 * rather than a narrower view of this one. Its empty state says the filter is
 * narrower than the history, which is the one thing a reader looking at
 * nothing needs to know.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  approveAllRun,
  curateRun,
  deleteObjectiveRun,
  fetchObjectiveRuns,
  type ObjectiveRunStatus,
} from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { groupIdenticalRuns, type RunGroup } from '@/lib/harness/harnessTrace'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { HarnessRunsTable } from '@/pages/research/loop/HarnessRunsTable'

const RUN_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'awaiting_approval', label: 'Awaiting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

export function ObjectiveRunsSection({
  objectiveId,
  objectiveTitle,
  rawRuns,
}: {
  objectiveId: string
  objectiveTitle: string
  /** What the roster counts, before identical re-runs fold. */
  rawRuns?: number | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lang] = useCopilotPromptLang()
  const [deleting, setDeleting] = useState<RunGroup | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [runFilter, setRunFilter] = useState<ObjectiveRunStatus | 'all'>('all')

  const runsQ = useQuery({
    queryKey: QUERY_KEYS.research.objectiveRuns({ objective_id: objectiveId }),
    queryFn: () => fetchObjectiveRuns({ objective_id: objectiveId, limit: 100 }),
    refetchInterval: 15_000,
  })
  const allGroups = useMemo(() => groupIdenticalRuns(runsQ.data?.items ?? []), [runsQ.data])
  const groups = useMemo(
    () => (runFilter === 'all' ? allGroups : allGroups.filter((g) => g.run.status === runFilter)),
    [allGroups, runFilter],
  )

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
    void queryClient.invalidateQueries({ queryKey: ['research', 'loop', 'autopilot'] })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
  }
  const approveMut = useMutation({
    mutationFn: (runId: string) => approveAllRun(runId),
    onSuccess: (res) => {
      invalidate()
      setNotice(`Approved ${res.count}${res.held_count ? `, held ${res.held_count}` : ''}.`)
    },
  })
  const curateMut = useMutation({ mutationFn: (runId: string) => curateRun(runId), onSuccess: invalidate })
  const deleteMut = useMutation({
    mutationFn: async (runIds: string[]) => {
      let kept = 0
      for (const id of runIds) {
        const res = await deleteObjectiveRun(id, { force: true })
        kept += res.candidates_kept ?? 0
      }
      return { deleted: runIds.length, kept }
    },
    onSuccess: ({ deleted, kept }) => {
      setDeleting(null)
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
      setNotice(
        `Deleted ${deleted} run${deleted === 1 ? '' : 's'}. Hypotheses kept.` +
          (kept > 0 ? ` Kept ${kept} candidate(s) that have settled outcomes.` : ''),
      )
    },
  })

  const filteredEmpty = groups.length === 0 && allGroups.length > 0
  const ids = (g: RunGroup) => [g.run.id, ...g.repeats.map((r) => r.id)]
  const firstError = [approveMut, curateMut, deleteMut].find((m) => m.isError)?.error

  if (runsQ.isLoading) return <Skeleton className="h-24 w-full" />
  if (runsQ.isError) return <QueryErrorAlert error={runsQ.error} onRetry={() => void runsQ.refetch()} />

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta text-muted-foreground">
          {groups.length === allGroups.length
            ? `${allGroups.length} recorded`
            : `${groups.length} of ${allGroups.length} · filtered`}
          {rawRuns != null && rawRuns !== allGroups.length ? (
            <span
              className="ml-1"
              title="Identical re-runs fold into one row but not out of the bill."
            >
              {" · "}{rawRuns} runs, identical re-runs folded
            </span>
          ) : null}
        </span>
        <span className="ml-auto">
          <SegmentControl
            value={runFilter}
            options={RUN_FILTERS}
            onChange={(v) => setRunFilter(v as ObjectiveRunStatus | 'all')}
            ariaLabel="Run state"
          />
        </span>
      </div>
      {/* Two emptinesses, and only one of them is true at a time: the table
          says "no runs yet", which is a fact about the objective, and this
          says "none in this state", which is a fact about the filter. Showing
          both would tell the reader the history is gone when it is one click
          away. */}
      {filteredEmpty ? (
        <div className="rounded-lg border border-border px-3 py-6 text-center">
          <p className="text-dense-body font-semibold">No run in this state</p>
          <p className="mt-1 text-dense-meta text-muted-foreground">
            The filter is narrower than the history.{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setRunFilter('all')}
            >
              Clear it
            </button>{' '}
            to see every run this objective has recorded.
          </p>
        </div>
      ) : (
      <HarnessRunsTable
        groups={groups}
        objectiveTitle={objectiveTitle}
        lang={lang}
        onOpenPipeline={(runId) => navigate(loopPipelinePath(runId, { live: true }))}
        onApprove={(id) => approveMut.mutate(id)}
        onCurate={(id) => curateMut.mutate(id)}
        onDelete={setDeleting}
        approvingId={approveMut.isPending ? (approveMut.variables ?? null) : null}
        curatingId={curateMut.isPending ? (curateMut.variables ?? null) : null}
        deleteBusy={deleteMut.isPending}
      />
      )}
      {/* The design's own sentence, and the half of it that is a warning: a
          deleted run takes its funnel and its trace with it. */}
      <p className="text-dense-caption leading-relaxed text-muted-foreground">
        Identical re-runs fold into one row but not out of the bill. Deleting a run takes its funnel
        and its trace; candidates with a settled outcome are kept, because that measurement is what
        the leash reads.
      </p>
      {notice ? <p className="text-dense-label text-success">{notice}</p> : null}
      {firstError ? (
        <p className="text-dense-label text-destructive">
          {firstError instanceof Error ? firstError.message : String(firstError)}
        </p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete run"
        message={
          deleting
            ? `Delete ${ids(deleting).length > 1 ? `${ids(deleting).length} runs` : deleting.run.id}? Funnels and traces go with them, candidates that point at them are removed and pending drafts dismissed. Promoted hypotheses are kept, and so is any candidate that already has a settled outcome.`
            : ''
        }
        confirmLabel="Delete"
        confirming={deleteMut.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(ids(deleting))}
      />
    </div>
  )
}
