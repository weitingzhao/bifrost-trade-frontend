/**
 * Harness Console — Research Loop Wave A + HC ops dashboard.
 * `/research/loop/harness`
 *
 * Advisory only — D10 BLOCKED (no trade execution).
 * Daily Loop LLM work lives in Research Copilot; this page is ops history.
 */
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MessageCircle, Play, Sparkles, Terminal } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  CollapsibleChevron,
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
  curateRun,
  fetchObjectiveRuns,
  fetchObjectives,
  RECOMMENDED_LOOP_POLICY,
  RECOMMENDED_LOOP_POLICY_STOCK,
  runObjective,
  type ObjectiveRun,
  type ObjectiveRunStatus,
  type ResearchObjective,
} from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { NewObjectiveDialog } from '@/components/research/NewObjectiveDialog'
import {
  HarnessObjectivesColgroup,
  HarnessRunsColgroup,
} from '@/pages/research/loop/harnessConsoleColgroups'
import {
  loopCopilotUi,
  loopPipelinePath,
  openLoopRunInCopilot,
  openResearchCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { runDurationMs } from '@/lib/harness/harnessTrace'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'

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
  const [lang] = useCopilotPromptLang()
  const [runStatus, setRunStatus] = useState<RunStatusFilter>('all')
  const [policyOpen, setPolicyOpen] = useState(false)

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

  const curateMut = useMutation({
    mutationFn: (runId: string) => curateRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
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
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Harness Console"
        description="Ops dashboard — objectives & run history. Click a run id for white-box Pipeline."
        actions={<NewObjectiveDialog />}
      />

      <Card variant="elevated" size="sm" className="min-w-0 border-warning/40 bg-warning/5">
        <CardContent className="space-y-2 px-3 py-2 text-dense-meta text-warning">
          <p>
            Advisory only — D10 BLOCKED. Approve all uses the same Inbox side
            effects: policy merge, plus candidate promote and hypotheses.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-warning/40 text-warning hover:bg-warning/10"
            onClick={() => openResearchCopilot()}
          >
            <MessageCircle className="size-3 mr-1" />
            Open Research Copilot
          </Button>
        </CardContent>
      </Card>

      <CollapsibleGroup variant="card" className="min-w-0">
        <CollapsibleGroupHeader
          expanded={policyOpen}
          onToggle={() => setPolicyOpen((o) => !o)}
        >
          <CollapsibleChevron expanded={policyOpen} />
          <CollapsibleGroupTitle>Recommended policy template</CollapsibleGroupTitle>
        </CollapsibleGroupHeader>
        {policyOpen ? (
          <CollapsibleGroupBody className="space-y-1 px-3 pb-3">
            <p className="text-dense-meta text-muted-foreground">
              Legacy scan (<code className="font-mono">scan_legacy</code>) vs stock-first (
              <code className="font-mono">stock_composite</code>). Seed:{' '}
              <code className="font-mono">--profile stock</code>.
            </p>
            <p className="text-dense-label font-medium text-muted-foreground">scan_legacy</p>
            <pre className="whitespace-pre-wrap break-words rounded bg-background px-2 py-1 font-mono text-dense-micro">
              {JSON.stringify(RECOMMENDED_LOOP_POLICY, null, 2)}
            </pre>
            <p className="text-dense-label font-medium text-muted-foreground">stock_composite</p>
            <pre className="whitespace-pre-wrap break-words rounded bg-background px-2 py-1 font-mono text-dense-micro">
              {JSON.stringify(RECOMMENDED_LOOP_POLICY_STOCK, null, 2)}
            </pre>
          </CollapsibleGroupBody>
        ) : null}
      </CollapsibleGroup>

      {/* Objectives */}
      <section className="min-w-0 space-y-2">
        <h2 className="text-dense-body font-semibold">Objectives</h2>
        {objectivesQ.isError ? (
          <QueryErrorAlert error={objectivesQ.error} />
        ) : objectivesQ.isLoading ? (
          <Skeleton className="h-40 w-full rounded-md" />
        ) : objectives.length === 0 ? (
          <EmptyState
            icon={<Terminal />}
            title="No active objectives"
            description="Click New Objective to create one. Harness proposes candidates; Owner approves in Decision Inbox or Copilot."
          />
        ) : (
          <DenseDataTable scrollX={false}>
            <HarnessObjectivesColgroup />
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Title</DenseTableHead>
                <DenseTableHead>Schedule</DenseTableHead>
                <DenseTableHead>Persona</DenseTableHead>
                <DenseTableHead>Status</DenseTableHead>
                <DenseTableHead>Actions</DenseTableHead>
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
                        <p className="truncate text-dense-label font-medium">{row.title}</p>
                        <p className="truncate text-dense-caption text-muted-foreground">
                          {row.description}
                        </p>
                      </div>
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="neutral">{row.schedule}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell className="truncate font-mono text-dense-meta">
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
                        className="h-7 max-w-full truncate px-2 text-dense-meta"
                        disabled={busy || runMut.isPending}
                        onClick={() => void runMut.mutateAsync(row.id)}
                      >
                        <Play className="mr-1 size-3 shrink-0" />
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
      <section className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="shrink-0 text-dense-body font-semibold">Runs</h2>
          <span className="shrink-0 text-dense-meta font-medium text-muted-foreground">
            Status:
          </span>
          <div className="min-w-0 flex-1">
            <SegmentControl
              value={runStatus}
              onChange={(v) => setRunStatus(v as RunStatusFilter)}
              options={RUN_STATUS_OPTIONS}
              size="sm"
              ariaLabel="Filter runs by status"
            />
          </div>
          <span className="shrink-0 text-dense-meta text-muted-foreground">
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
          <DenseDataTable scrollX={false}>
            <HarnessRunsColgroup />
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Run</DenseTableHead>
                <DenseTableHead>Objective</DenseTableHead>
                <DenseTableHead>Started</DenseTableHead>
                <DenseTableHead>Status</DenseTableHead>
                <DenseTableHead>Actions</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {runs.map((row: ObjectiveRun) => {
                const awaiting = row.status === 'awaiting_approval'
                const approveBusy =
                  approveMut.isPending && approveMut.variables === row.id
                const curateBusy =
                  curateMut.isPending && curateMut.variables === row.id
                const curatorTrace = (row.outputs?.curator_trace ?? null) as
                  | Record<string, unknown>
                  | null
                const objectiveTitle =
                  objectiveTitleById.get(row.objective_id) ?? row.objective_id
                const dataSource =
                  typeof row.outputs?.data_source === 'string'
                    ? row.outputs.data_source
                    : null
                const duration = runDurationMs(row.started_at, row.finished_at)
                return (
                  <DenseTableRow key={row.id}>
                    <DenseTableCell>
                      <Link
                        to={loopPipelinePath(row.id)}
                        className="block truncate font-mono text-dense-meta text-primary hover:underline"
                      >
                        {row.id}
                      </Link>
                      {dataSource ? (
                        <DenseTag variant="category" size="cell" className="mt-0.5">
                          {dataSource}
                        </DenseTag>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell className="truncate">{objectiveTitle}</DenseTableCell>
                    <DenseTableCell className="truncate text-dense-meta text-muted-foreground">
                      {fmtTs(row.started_at)}
                      {duration != null ? (
                        <span className="block text-dense-caption">
                          {(duration / 1000).toFixed(1)}s
                        </span>
                      ) : null}
                    </DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant={runStatusVariant(row.status)}>
                        {row.status}
                      </DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      {awaiting ? (
                        <div className="flex min-w-0 flex-col gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 w-full max-w-full justify-start truncate px-2 text-dense-meta"
                            onClick={() =>
                              openLoopRunInCopilot({
                                runId: row.id,
                                title: objectiveTitle,
                                lang,
                              })
                            }
                          >
                            <MessageCircle className="mr-1 size-3 shrink-0" />
                            {loopCopilotUi.discuss(lang)}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 w-full max-w-full justify-start truncate px-2 text-dense-meta"
                            asChild
                          >
                            <Link to={loopPipelinePath(row.id)}>
                              {loopCopilotUi.viewPipeline(lang)}
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 w-full max-w-full justify-start truncate px-2 text-dense-meta"
                            disabled={curateBusy || curateMut.isPending}
                            onClick={() => void curateMut.mutateAsync(row.id)}
                          >
                            <Sparkles className="mr-1 size-3 shrink-0" />
                            {curateBusy ? 'Curating…' : 'Curator'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 w-full max-w-full justify-start truncate px-2 text-dense-meta"
                            disabled={approveBusy || approveMut.isPending}
                            onClick={() => void approveMut.mutateAsync(row.id)}
                          >
                            <Check className="mr-1 size-3 shrink-0" />
                            {approveBusy ? 'Approving…' : 'Approve all'}
                          </Button>
                        </div>
                      ) : curatorTrace ? (
                        <span className="block truncate text-dense-caption text-muted-foreground">
                          Curator: {String(curatorTrace.status ?? 'done')}
                        </span>
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
        {curateMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {curateMut.error instanceof Error
              ? curateMut.error.message
              : String(curateMut.error)}
          </p>
        ) : null}
      </section>
    </PageShell>
  )
}
