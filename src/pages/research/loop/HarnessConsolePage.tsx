/**
 * Harness Console — Research Loop Wave A + HC ops dashboard.
 * `/research/loop/harness`
 *
 * Advisory only — D10 BLOCKED (no trade execution).
 * Daily Loop LLM work lives in Research Copilot; this page is ops history.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  Check,
  MessageCircle,
  Play,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react'
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
  IconActionButton,
  SegmentControl,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  approveAllRun,
  curateRun,
  deleteObjective,
  deleteObjectiveRun,
  setObjectiveStatus,
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
import { fmtInt } from '@/lib/format'
import { NewObjectiveDialog } from '@/components/research/NewObjectiveDialog'
import { UniverseReachStrip } from '@/components/research/UniverseReachStrip'
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
import { funnelReach, parseHarnessTrace, runDurationMs } from '@/lib/harness/harnessTrace'
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


/**
 * Watchlist-sized. Below this a run did not screen a market, it re-read a list —
 * the failure the funnel column exists to make visible at a glance rather than
 * after a warehouse query.
 */
const WATCHLIST_SCALE = 100

/** Considered → proposed for one run, with the conversion it implies. */
function RunFunnelCell({ trace }: { trace: unknown }) {
  const reach = funnelReach(parseHarnessTrace(trace))
  if (!reach) {
    return (
      <span className="text-dense-caption text-muted-foreground">no funnel</span>
    )
  }
  const { considered, proposed } = reach
  const pct = considered > 0 ? (proposed / considered) * 100 : null
  const narrow = considered < WATCHLIST_SCALE
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="font-mono tabular-nums text-dense-meta">
        {fmtInt(considered)} → {fmtInt(proposed)}
      </span>
      <DenseTag variant={narrow ? 'warning' : 'category'} size="cell">
        {pct == null ? '—' : `${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%`}
      </DenseTag>
      {narrow ? (
        <span
          className="text-dense-micro text-warning"
          title={`Only ${considered} symbols were considered — that is a watchlist, not a screen`}
        >
          watchlist-sized
        </span>
      ) : null}
    </div>
  )
}

export default function HarnessConsolePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [lang] = useCopilotPromptLang()
  const [runStatus, setRunStatus] = useState<RunStatusFilter>('all')
  // Archive is only a retirement if there is a way back. The console lists
  // active objectives, so without this filter an archived one is simply gone.
  const [objStatus, setObjStatus] = useState<'active' | 'archived'>('active')
  const [policyOpen, setPolicyOpen] = useState(false)

  const objectivesQ = useQuery({
    queryKey: QUERY_KEYS.research.objectives({ status: objStatus }),
    queryFn: () => fetchObjectives({ status: objStatus }),
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

  // Archiving is the retirement path; delete is only offered for an objective
  // that never ran, because the API refuses once runs exist and taking them
  // would take the funnels and the candidate lineage with them.
  const [retiring, setRetiring] = useState<{
    objective: ResearchObjective
    mode: 'archive' | 'delete'
  } | null>(null)

  const archiveMut = useMutation({
    mutationFn: (v: { id: string; status: 'active' | 'archived' }) =>
      setObjectiveStatus(v.id, v.status),
    onSuccess: () => {
      setRetiring(null)
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (objectiveId: string) => deleteObjective(objectiveId),
    onSuccess: () => {
      setRetiring(null)
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
    },
  })

  const [deletingRun, setDeletingRun] = useState<ObjectiveRun | null>(null)

  const deleteRunMut = useMutation({
    mutationFn: (runId: string) => deleteObjectiveRun(runId),
    onSuccess: () => {
      setDeletingRun(null)
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
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

  // Whether Delete is even offered. The API is the authority — it refuses with
  // the real count — but showing the button for an objective that plainly has
  // history invites a click that can only fail.
  const runCountByObjective = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of runs) map.set(r.objective_id, (map.get(r.objective_id) ?? 0) + 1)
    return map
  }, [runs])

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

      <UniverseReachStrip />

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
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-dense-body font-semibold">Objectives</h2>
          <SegmentControl
            value={objStatus}
            onChange={(v) => setObjStatus(v as 'active' | 'archived')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        {objectivesQ.isError ? (
          <QueryErrorAlert error={objectivesQ.error} />
        ) : objectivesQ.isLoading ? (
          <Skeleton className="h-40 w-full rounded-md" />
        ) : objectives.length === 0 ? (
          <EmptyState
            icon={<Terminal />}
            title={objStatus === 'archived' ? 'No archived objectives' : 'No active objectives'}
            description={
              objStatus === 'archived'
                ? 'Nothing retired yet. Archived objectives are restored from here.'
                : 'Click New Objective to create one. Harness proposes candidates; Owner approves in Decision Inbox or Copilot.'
            }
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
                const hasRuns = (runCountByObjective.get(row.id) ?? 0) > 0
                const archived = row.status !== 'active'
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
                      <DenseTag variant={archived ? 'neutral' : 'success'}>{row.status}</DenseTag>
                    </DenseTableCell>
                    <DenseTableCell>
                      <div className="flex flex-wrap items-center gap-0.5">
                        {archived ? null : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-dense-micro"
                            disabled={busy || runMut.isPending}
                            onClick={() => runMut.mutate(row.id)}
                          >
                            <Play className="mr-0.5 size-3 shrink-0" />
                            {busy ? 'Running…' : 'Run'}
                          </Button>
                        )}
                        {archived ? (
                          <IconActionButton
                            title="Restore — brings it back to the active list"
                            ariaLabel={`Restore ${row.title}`}
                            disabled={archiveMut.isPending}
                            onClick={() => archiveMut.mutate({ id: row.id, status: 'active' })}
                          >
                            <ArchiveRestore className="size-3.5" />
                          </IconActionButton>
                        ) : (
                          <IconActionButton
                            title="Archive — leaves the console, keeps its runs"
                            ariaLabel={`Archive ${row.title}`}
                            onClick={() => setRetiring({ objective: row, mode: 'archive' })}
                          >
                            <Archive className="size-3.5" />
                          </IconActionButton>
                        )}
                        <IconActionButton
                          tone="danger"
                          title={
                            hasRuns
                              ? 'Cannot delete — this objective has runs. Archive it instead.'
                              : 'Delete — it has never run'
                          }
                          ariaLabel={`Delete ${row.title}`}
                          disabled={hasRuns}
                          onClick={() => setRetiring({ objective: row, mode: 'delete' })}
                        >
                          <Trash2 className="size-3.5" />
                        </IconActionButton>
                      </div>
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
        {/* The API refuses a delete that would take run history with it, and
            says how many runs. Surfacing that verbatim is more useful than a
            generic failure. */}
        {deleteMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {deleteMut.error instanceof Error
              ? deleteMut.error.message
              : String(deleteMut.error)}
          </p>
        ) : null}
        {archiveMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {archiveMut.error instanceof Error
              ? archiveMut.error.message
              : String(archiveMut.error)}
          </p>
        ) : null}

        <ConfirmDialog
          open={deletingRun !== null}
          title="Delete run"
          message={
            deletingRun
              ? `Delete ${deletingRun.id}? Its funnel and trace go with it. The API refuses if candidates still point at this run.`
              : ''
          }
          confirmLabel="Delete"
          confirming={deleteRunMut.isPending}
          onCancel={() => setDeletingRun(null)}
          onConfirm={() => {
            if (deletingRun) deleteRunMut.mutate(deletingRun.id)
          }}
        />

        <ConfirmDialog
          open={retiring !== null}
          title={
            retiring?.mode === 'delete' ? 'Delete objective' : 'Archive objective'
          }
          message={
            retiring?.mode === 'delete'
              ? `Delete “${retiring.objective.title}”? It has never run, so nothing is lost.`
              : `Archive “${retiring?.objective.title ?? ''}”? It leaves the console. Its runs, funnels and the candidates that reference them stay.`
          }
          confirmLabel={retiring?.mode === 'delete' ? 'Delete' : 'Archive'}
          confirming={archiveMut.isPending || deleteMut.isPending}
          onCancel={() => setRetiring(null)}
          onConfirm={() => {
            if (!retiring) return
            if (retiring.mode === 'delete') {
              deleteMut.mutate(retiring.objective.id)
            } else {
              archiveMut.mutate({ id: retiring.objective.id, status: 'archived' })
            }
          }}
        />
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
                <DenseTableHead>Funnel</DenseTableHead>
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
                    <DenseTableCell>
                      <RunFunnelCell trace={row.trace_json} />
                    </DenseTableCell>
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
                      <div className="flex flex-wrap items-center gap-0.5">
                      {awaiting ? (
                        <>
                          <IconActionButton
                            title={loopCopilotUi.discuss(lang)}
                            ariaLabel={`${loopCopilotUi.discuss(lang)} ${row.id}`}
                            onClick={() =>
                              openLoopRunInCopilot({
                                runId: row.id,
                                title: objectiveTitle,
                                lang,
                              })
                            }
                          >
                            <MessageCircle className="size-3.5" />
                          </IconActionButton>
                          <IconActionButton
                            title={loopCopilotUi.viewPipeline(lang)}
                            ariaLabel={`${loopCopilotUi.viewPipeline(lang)} ${row.id}`}
                            onClick={() => navigate(loopPipelinePath(row.id))}
                          >
                            <Terminal className="size-3.5" />
                          </IconActionButton>
                          <IconActionButton
                            title={curateBusy ? 'Curating…' : 'Curator'}
                            ariaLabel={`Curator ${row.id}`}
                            disabled={curateBusy || curateMut.isPending}
                            onClick={() => curateMut.mutate(row.id)}
                          >
                            <Sparkles className="size-3.5" />
                          </IconActionButton>
                          {/* Approve keeps its label: it promotes candidates and
                              creates hypotheses, and an icon-only control that
                              writes is one misclick from doing so. */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-dense-micro"
                            disabled={approveBusy || approveMut.isPending}
                            onClick={() => approveMut.mutate(row.id)}
                          >
                            <Check className="mr-0.5 size-3 shrink-0" />
                            {approveBusy ? 'Approving…' : 'Approve'}
                          </Button>
                        </>
                      ) : curatorTrace ? (
                        <span className="inline-block truncate align-middle text-dense-caption text-muted-foreground">
                          Curator: {String(curatorTrace.status ?? 'done')}
                        </span>
                      ) : (
                        <span className="text-dense-caption text-muted-foreground">—</span>
                      )}
                      {/* Offered on every run, including failed and completed ones:
                          those are exactly the rows that accumulate. The API
                          refuses while candidates still point at the run. */}
                      <IconActionButton
                        tone="danger"
                        title="Delete this run — refused while its candidates exist"
                        ariaLabel={`Delete run ${row.id}`}
                        disabled={deleteRunMut.isPending}
                        onClick={() => setDeletingRun(row)}
                      >
                        <Trash2 className="size-3.5" />
                      </IconActionButton>
                      </div>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}
        {deleteRunMut.isError ? (
          <p className="text-dense-meta text-destructive">
            {deleteRunMut.error instanceof Error
              ? deleteRunMut.error.message
              : String(deleteRunMut.error)}
          </p>
        ) : null}
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
