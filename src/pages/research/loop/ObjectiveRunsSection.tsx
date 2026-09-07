/**
 * The runs one objective has produced, with the same actions the Autopilot
 * page offers — open the memo, approve, curate, delete.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  approveAllRun,
  curateRun,
  deleteObjectiveRun,
  fetchObjectiveRuns,
} from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { groupIdenticalRuns, type RunGroup } from '@/lib/harness/harnessTrace'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { HarnessRunsTable } from '@/pages/research/loop/HarnessRunsTable'

export function ObjectiveRunsSection({ objectiveId, objectiveTitle }: { objectiveId: string; objectiveTitle: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [lang] = useCopilotPromptLang()
  const [deleting, setDeleting] = useState<RunGroup | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const runsQ = useQuery({
    queryKey: QUERY_KEYS.research.objectiveRuns({ objective_id: objectiveId }),
    queryFn: () => fetchObjectiveRuns({ objective_id: objectiveId, limit: 100 }),
    refetchInterval: 15_000,
  })
  const groups = useMemo(() => groupIdenticalRuns(runsQ.data?.items ?? []), [runsQ.data])

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
      for (const id of runIds) await deleteObjectiveRun(id, { force: true })
      return runIds.length
    },
    onSuccess: (n) => {
      setDeleting(null)
      invalidate()
      void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
      setNotice(`Deleted ${n} run${n === 1 ? '' : 's'}. Hypotheses kept.`)
    },
  })

  const ids = (g: RunGroup) => [g.run.id, ...g.repeats.map((r) => r.id)]
  const firstError = [approveMut, curateMut, deleteMut].find((m) => m.isError)?.error

  if (runsQ.isLoading) return <Skeleton className="h-24 w-full" />
  if (runsQ.isError) return <QueryErrorAlert error={runsQ.error} onRetry={() => void runsQ.refetch()} />

  return (
    <div className="space-y-2">
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
            ? `Delete ${ids(deleting).length > 1 ? `${ids(deleting).length} runs` : deleting.run.id}? Funnels and traces go with them, candidates that point at them are removed and pending drafts dismissed. Promoted hypotheses are kept.`
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
