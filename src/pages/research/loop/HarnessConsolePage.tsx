/**
 * Harness Console — Research Loop Wave A.
 * `/research/loop/harness`
 *
 * Advisory only — D10 BLOCKED (no trade execution).
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Play, Terminal } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  SegmentControl,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  approveAllRun,
  fetchObjectiveRuns,
  fetchObjectives,
  runObjective,
  type ObjectiveRun,
  type ObjectiveRunStatus,
  type ResearchObjective,
} from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { NewObjectiveDialog } from '@/components/research/NewObjectiveDialog'

type RunStatusFilter = ObjectiveRunStatus | 'all'

const RUN_STATUS_OPTIONS: { value: RunStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'awaiting_approval', label: 'Awaiting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function runStatusVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'awaiting_approval') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'neutral'
  return 'neutral'
}

function fmtTs(v: string | null | undefined): string {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function HarnessConsolePage() {
  const queryClient = useQueryClient()
  const [runStatus, setRunStatus] = useState<RunStatusFilter>('all')

  const objectivesQ = useQuery({
    queryKey: QUERY_KEYS.research.objectives({ status: 'active' }),
    queryFn: () => fetchObjectives({ status: 'active' }),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })

  const runsQ = useQuery({
    queryKey: QUERY_KEYS.research.objectiveRuns({
      status: runStatus === 'all' ? undefined : runStatus,
    }),
    queryFn: () =>
      fetchObjectiveRuns({
        status: runStatus === 'all' ? undefined : runStatus,
      }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const runMut = useMutation({
    mutationFn: (objectiveId: string) => runObjective(objectiveId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
    },
  })

  const approveMut = useMutation({
    mutationFn: (runId: string) => approveAllRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.list })
      void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
    },
  })

  const objectives = useMemo(
    () => objectivesQ.data?.items ?? [],
    [objectivesQ.data?.items],
  )
  const runs = useMemo(() => runsQ.data?.items ?? [], [runsQ.data?.items])

  const objectiveTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objectives) map.set(o.id, o.title)
    return map
  }, [objectives])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Harness Console"
        description="Stage 3 — Agent Harness objectives and run controls. Observe-only."
        actions={<NewObjectiveDialog />}
      />

      <Card variant="elevated" size="sm" className="border-warning/40 bg-warning/5">
        <CardContent className="px-3 py-2 text-dense-meta text-warning">
          Advisory only — D10 BLOCKED. Approve all uses the same Inbox side
          effects: policy merge, plus candidate promote and hypotheses.
        </CardContent>
      </Card>

      {/* Objectives */}
      <section className="space-y-2">
        <h2 className="text-dense-body font-semibold">Objectives</h2>
        {objectivesQ.isError ? (
          <QueryErrorAlert error={objectivesQ.error} />
        ) : objectivesQ.isLoading ? (
          <Skeleton className="h-40 w-full rounded-md" />
        ) : objectives.length === 0 ? (
          <EmptyState
            icon={<Terminal />}
            title="No active objectives"
            description="Click New Objective to create one. Harness proposes candidates; Owner approves in Decision Inbox."
          />
        ) : (
          <DenseDataTable tableClassName="min-w-[640px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Title</DenseTableHead>
                <DenseTableHead>Schedule</DenseTableHead>
                <DenseTableHead>Persona</DenseTableHead>
                <DenseTableHead>Status</DenseTableHead>
                <DenseTableHead className="w-24">Actions</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {objectives.map((row: ResearchObjective) => {
                const busy =
                  runMut.isPending && runMut.variables === row.id
                return (
                  <DenseTableRow key={row.id}>
                    <DenseTableCell>
                      <div className="min-w-0">
                        <p className="text-dense-label font-medium truncate">{row.title}</p>
                        <p className="text-dense-caption text-muted-foreground truncate max-w-[320px]">
                          {row.description}
                        </p>
                      </div>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="neutral">{row.schedule}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className="text-dense-meta font-mono">
                      {row.persona}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="success">{row.status}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-dense-meta"
                        disabled={busy || runMut.isPending}
                        onClick={() => void runMut.mutateAsync(row.id)}
                      >
                        <Play className="size-3 mr-1" />
                        {busy ? 'Running…' : 'Run'}
                      </Button>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
        {runMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {runMut.error instanceof Error ? runMut.error.message : String(runMut.error)}
          </p>
        ) : null}
      </section>

      {/* Runs */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-dense-body font-semibold">Runs</h2>
          <span className="text-dense-meta font-medium text-muted-foreground shrink-0">
            Status:
          </span>
          <SegmentControl
            value={runStatus}
            onChange={(v) => setRunStatus(v as RunStatusFilter)}
            options={RUN_STATUS_OPTIONS}
            size="sm"
            ariaLabel="Filter runs by status"
          />
          <span className="text-dense-meta text-muted-foreground ml-auto">
            {runsQ.data?.count ?? 0} shown
          </span>
        </div>

        {runsQ.isError ? (
          <QueryErrorAlert error={runsQ.error} />
        ) : runsQ.isLoading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : runs.length === 0 ? (
          <EmptyState
            icon={<Terminal />}
            title="No runs"
            description="Trigger an objective Run to produce harness history here."
          />
        ) : (
          <DenseDataTable tableClassName="min-w-[720px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Run</DenseTableHead>
                <DenseTableHead>Objective</DenseTableHead>
                <DenseTableHead>Started</DenseTableHead>
                <DenseTableHead>Status</DenseTableHead>
                <DenseTableHead className="w-36">Actions</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {runs.map((row: ObjectiveRun) => {
                const awaiting = row.status === 'awaiting_approval'
                const approveBusy =
                  approveMut.isPending && approveMut.variables === row.id
                return (
                  <DenseTableRow key={row.id}>
                    <DenseTableCell className="font-mono text-dense-meta truncate max-w-[140px]">
                      {row.id}
                    </DenseTableCell>
                    <DenseTableCell className="truncate max-w-[200px]">
                      {objectiveTitleById.get(row.objective_id) ?? row.objective_id}
                    </DenseTableCell>
                    <DenseTableCell className="text-dense-meta text-muted-foreground">
                      {fmtTs(row.started_at)}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={runStatusVariant(row.status)}>
                        {row.status}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      {awaiting ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-dense-meta"
                          disabled={approveBusy || approveMut.isPending}
                          onClick={() => void approveMut.mutateAsync(row.id)}
                        >
                          <Check className="size-3 mr-1" />
                          {approveBusy ? 'Approving…' : 'Approve all'}
                        </Button>
                      ) : (
                        <span className="text-dense-caption text-muted-foreground">—</span>
                      )}
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
        {approveMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {approveMut.error instanceof Error
              ? approveMut.error.message
              : String(approveMut.error)}
          </p>
        ) : null}
      </section>
    </PageShell>
  )
}
