/**
 * Harness Console — Research Loop ops dashboard.
 * `/research/loop/harness`
 *
 * Three zones, not six blocks. The page used to open with a title, a reach
 * strip, a 111px advisory banner whose text never changes, a collapsed Policy
 * templates row, an Objectives table and a Runs table — four of the six being
 * chrome, and the last two asking the reader to join them by eye on an
 * Objective column. Now: what the Loop can see, then the objectives, with each
 * objective's runs inside it.
 *
 * Advisory only — D10 BLOCKED (no trade execution).
 */
import { useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  CollapsibleChevron,
  DenseDataTable,
  DenseTableBody,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  EmptyState,
  SegmentControl,
  denseTable,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { LoopRunPipelineBody } from '@/components/research/harness/LoopRunPipelineBody'
import {
  approveAllRun,
  batchRunObjective,
  curateRun,
  deleteObjective,
  deleteObjectiveRun,
  setObjectiveStatus,
  fetchObjectiveRuns,
  fetchObjectives,
  type ObjectiveRun,
  type ObjectiveRunStatus,
  type ResearchObjective,
} from '@/api/research/harness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { NewObjectiveDialog } from '@/components/research/NewObjectiveDialog'
import { UniverseReachStrip } from '@/components/research/UniverseReachStrip'
import { HarnessObjectivesColgroup } from '@/pages/research/loop/harnessConsoleColgroups'
import { HarnessRunsTable } from '@/pages/research/loop/HarnessRunsTable'
import { PolicyTemplatePanel } from '@/pages/research/loop/PolicyTemplatePanel'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'
import { groupIdenticalRuns, type RunGroup } from '@/lib/harness/harnessTrace'

import { inspectorWidthPx, useInspectorWidth } from '@/lib/harness/inspectorWidth'
import { RunLoopDialog } from '@/components/research/harness/RunLoopDialog'
import { AutopilotKpis, AutopilotLadder } from '@/components/research/harness/AutopilotStanding'
import { ObjectiveRows } from '@/pages/research/loop/ObjectiveBriefRow'
import type { BatchRunOverrides } from '@/api/research/harness'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { useLoopTrust,
  useAutopilotStanding,
} from '@/hooks/useLoopHarness'

type RunStatusFilter = ObjectiveRunStatus | 'all'

const RUN_STATUS_OPTIONS: { value: RunStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'awaiting_approval', label: 'Awaiting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

/**
 * The banner this replaces took a sixth of the first screen, every visit, to say
 * the same thing. A boundary that never changes is a property of the console,
 * not news — so it reads as a badge, with the detail one hover away.
 */
const D10_DETAIL =
  'D10 BLOCKED — advisory only. Auto-approve covers research drafts and nothing else ' +
  '(never policy_suggestion, never order_intent). Run unattended still selects and ' +
  'evaluates without Trust L0; it just will not auto-approve until L0. Persona eval ' +
  'defaults to heuristic — LLM agents require BIFROST_PERSONA_EVAL_AGENTS=1.'

export default function HarnessConsolePage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [lang] = useCopilotPromptLang()
  const [runStatus, setRunStatus] = useState<RunStatusFilter>('all')
  // Archive is only a retirement if there is a way back. The console lists
  // active objectives, so without this filter an archived one is simply gone.
  const [objStatus, setObjStatus] = useState<'active' | 'archived'>('active')
  const [policyOpen, setPolicyOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const trustQ = useLoopTrust()
  const trust = trustQ.data

  const pipelineRunId = searchParams.get('run')
  const [inspectorWidth] = useInspectorWidth()
  const [runDialog, setRunDialog] = useState<ResearchObjective | null>(null)
  const standingQ = useAutopilotStanding()
  const standingById = useMemo(
    () => new Map((standingQ.data?.objectives ?? []).map((o) => [o.id, o])),
    [standingQ.data],
  )
  const pipelineLive = searchParams.get('live') !== '0'

  function openPipeline(runId: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('run', runId)
        next.set('live', '1')
        return next
      },
      { replace: true },
    )
  }

  function closePipeline() {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('run')
        next.delete('live')
        return next
      },
      { replace: true },
    )
  }

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
      fetchObjectiveRuns({ status: runStatus === 'all' ? undefined : runStatus }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    // batch-run returns a run id before the work is done so the Pipeline can
    // open on it. The drawer polls; the list did not, so the new row sat at
    // "no funnel" until something else happened to refetch. Poll only while a
    // run is actually in flight.
    refetchInterval: (q) =>
      (q.state.data?.items ?? []).some((r) => r.status === 'running') ? 1_500 : false,
  })

  const batchMut = useMutation({
    mutationFn: (v: { objectiveId: string; overrides: BatchRunOverrides }) =>
      batchRunObjective(v.objectiveId, v.overrides),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      const runId = res.run?.id
      if (runId) openPipeline(runId)
    },
  })

  const [approveFeedback, setApproveFeedback] = useState<string | null>(null)

  const approveMut = useMutation({
    mutationFn: (runId: string) => approveAllRun(runId),
    onSuccess: (res) => {
      // Report the candidates, not the drafts. On a partial leash accept the draft is
      // never approved, so `count` is 0 while hypotheses were created — the toast read
      // "Auto-approved 0" after doing the work. And the hold reason was hard-coded to
      // "(dissent)" whatever the leash actually said.
      const accepted = res.accepted_symbols ?? []
      const heldNames = (res.held_symbols ?? []).map((h) => h.symbol).filter(Boolean)
      const reasons = [...new Set((res.held_symbols ?? []).flatMap((h) => h.reasons ?? []))]
      setApproveFeedback(
        accepted.length === 0 && heldNames.length === 0
          ? `Approved ${res.count ?? 0} draft${(res.count ?? 0) === 1 ? '' : 's'} · held ${res.held_count ?? 0}`
          : `Accepted ${accepted.length}${accepted.length ? ` (${accepted.join(', ')})` : ''} · held ${heldNames.length}${
              heldNames.length ? ` (${heldNames.join(', ')})` : ''
            }${reasons.length ? ` — ${reasons[0]}` : ''}`,
      )
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

  const [deletingGroup, setDeletingGroup] = useState<RunGroup | null>(null)

  const deleteRunMut = useMutation({
    mutationFn: async (v: { runIds: string[]; force?: boolean }) => {
      let candidates_removed = 0
      let drafts_dismissed = 0
      for (const runId of v.runIds) {
        const res = await deleteObjectiveRun(runId, { force: v.force ?? true })
        candidates_removed += res.candidates_removed ?? 0
        drafts_dismissed += res.drafts_dismissed ?? 0
      }
      return {
        deleted: v.runIds.length,
        runIds: v.runIds,
        candidates_removed,
        drafts_dismissed,
      }
    },
    onSuccess: (res) => {
      setDeletingGroup(null)
      // If the open pipeline drawer points at a deleted run, close it.
      if (pipelineRunId && res.runIds.includes(pipelineRunId)) closePipeline()
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'candidates'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      const removed = res.candidates_removed ?? 0
      const dismissed = res.drafts_dismissed ?? 0
      const n = res.deleted
      setApproveFeedback(
        n > 1
          ? `Deleted ${n} runs — removed ${removed} candidate(s), dismissed ${dismissed} draft(s). Hypotheses kept.`
          : `Deleted run — removed ${removed} candidate(s), dismissed ${dismissed} draft(s). Hypotheses kept.`,
      )
    },
  })

  const curateMut = useMutation({
    mutationFn: (runId: string) => curateRun(runId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
    },
  })

  function candidateCountHint(run: ObjectiveRun): number | null {
    const ids = run.outputs?.candidate_ids
    if (Array.isArray(ids)) return ids.length
    return null
  }

  function groupRunIds(group: RunGroup): string[] {
    return [group.run.id, ...group.repeats.map((r) => r.id)]
  }

  const objectives = useMemo(
    () => objectivesQ.data?.items ?? [],
    [objectivesQ.data?.items],
  )
  const runs = useMemo(() => runsQ.data?.items ?? [], [runsQ.data?.items])

  // One row per result, not per record. The console listed 23 runs with the same
  // funnel repeating eight times — a day's re-runs of one objective screening the
  // same ground to the same names.
  const groupsByObjective = useMemo(() => {
    const byObj = new Map<string, ObjectiveRun[]>()
    for (const r of runs) {
      const list = byObj.get(r.objective_id)
      if (list) list.push(r)
      else byObj.set(r.objective_id, [r])
    }
    const out = new Map<string, RunGroup[]>()
    for (const [id, list] of byObj) out.set(id, groupIdenticalRuns(list))
    return out
  }, [runs])

  // Runs whose objective is not in the list on screen — archived, or deleted.
  // Without this they would simply vanish under the Active filter, which is the
  // kind of silent disappearance this console exists to prevent.
  const orphanGroups = useMemo(() => {
    const shown = new Set(objectives.map((o) => o.id))
    return groupIdenticalRuns(runs.filter((r) => !shown.has(r.objective_id)))
  }, [runs, objectives])

  const runsTableProps = {
    lang,
    onOpenPipeline: openPipeline,
    onApprove: (id: string) => approveMut.mutate(id),
    onCurate: (id: string) => curateMut.mutate(id),
    onDelete: setDeletingGroup,
    approvingId: approveMut.isPending ? (approveMut.variables ?? null) : null,
    curatingId: curateMut.isPending ? (curateMut.variables ?? null) : null,
    deleteBusy: deleteRunMut.isPending,
  }

  return (
    <PageShell padding="default" className="min-w-0 space-y-3 overflow-x-hidden">
      <PageHeader
        title="Autopilot"
        description="Standing research objectives that run without you, judged by two models, rated, and held on a leash until you approve."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-dense-caption text-warning"
              title={D10_DETAIL}
            >
              <ShieldAlert className="size-3" />
              D10 BLOCKED
            </span>
            <div
              className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-2 py-1"
              title={trust?.reason ?? 'Loading Trust…'}
            >
              <StatusLamp
                lamp={(trust?.matrix_l0 ?? trust?.l0) ? 'green' : 'yellow'}
                variant="dot"
                title={trust?.reason ?? ((trust?.matrix_l0 ?? trust?.l0) ? 'Trust L0' : 'Trust not L0')}
              />
              <span className="text-dense-caption text-muted-foreground">
                Trust {trust?.matrix_level ?? (trust?.l0 ? 'L0' : 'not L0')}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-dense-meta"
              onClick={() => openResearchCopilot()}
            >
              <MessageCircle className="mr-1 size-3" />
              Copilot
            </Button>
            <NewObjectiveDialog />
          </div>
        }
      />

      {/* Where this page sits, and whether the thing is switched on — before
          any objective. */}
      <AutopilotLadder />
      {standingQ.data ? <AutopilotKpis standing={standingQ.data} /> : null}

      <UniverseReachStrip />

      <CollapsibleGroup variant="card" className="min-w-0">
        <CollapsibleGroupHeader
          expanded={policyOpen}
          onToggle={() => setPolicyOpen((o) => !o)}
        >
          <CollapsibleChevron expanded={policyOpen} />
          <CollapsibleGroupTitle>Policy templates</CollapsibleGroupTitle>
          <span className="ml-2 text-dense-caption text-muted-foreground">
            what to pick · Personas judge how · auto-approve is research drafts only
          </span>
        </CollapsibleGroupHeader>
        {policyOpen ? (
          <CollapsibleGroupBody className="px-3 pb-3">
            <PolicyTemplatePanel />
          </CollapsibleGroupBody>
        ) : null}
      </CollapsibleGroup>

      <section className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="shrink-0 text-dense-body font-semibold">Objectives</h2>
          <span className="text-dense-caption text-muted-foreground">one standing brief each — expand for its runs</span>
          <SegmentControl
            value={objStatus}
            onChange={(v) => setObjStatus(v as 'active' | 'archived')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <span className="ml-auto shrink-0 text-dense-caption text-muted-foreground">
            Runs
          </span>
          <SegmentControl
            value={runStatus}
            onChange={(v) => setRunStatus(v as RunStatusFilter)}
            options={RUN_STATUS_OPTIONS}
            size="sm"
            ariaLabel="Filter runs by status"
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
                <DenseTableHead className={denseTable.expandCol} />
                <DenseTableHead>Objective</DenseTableHead>
                <DenseTableHead>Last memo</DenseTableHead>
                <DenseTableHead>Track record</DenseTableHead>
                <DenseTableHead>Cost · waiting</DenseTableHead>
                <DenseTableHead>Actions</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {objectives.map((row: ResearchObjective) => {
                const batchBusy = batchMut.isPending && batchMut.variables?.objectiveId === row.id
                const groups = groupsByObjective.get(row.id) ?? []
                const awaitingN = groups.filter(
                  (g) => g.run.status === 'awaiting_approval',
                ).length
                const hasRuns = groups.length > 0
                const archived = row.status !== 'active'
                const isOpen = expanded[row.id] ?? false
                return (
                  <ObjectiveRows
                    key={row.id}
                    row={row}
                    groups={groups}
                    awaitingN={awaitingN}
                    hasRuns={hasRuns}
                    archived={archived}
                    isOpen={isOpen}
                    onToggle={() =>
                      setExpanded((e) => ({ ...e, [row.id]: !(e[row.id] ?? false) }))
                    }
                    running={batchBusy}
                    anyRunPending={batchMut.isPending}
                    trustL0={Boolean(trust?.matrix_l0 ?? trust?.l0)}
                    onRun={() => setRunDialog(row)}
                    onArchive={() => setRetiring({ objective: row, mode: 'archive' })}
                    onRestore={() => archiveMut.mutate({ id: row.id, status: 'active' })}
                    onDelete={() => setRetiring({ objective: row, mode: 'delete' })}
                    archivePending={archiveMut.isPending}
                    runsTableProps={runsTableProps}
                    brief={standingById.get(row.id) ?? null}
                    onOpenMemo={(runId) => openPipeline(runId)}
                  />
                )
              })}
            </DenseTableBody>
          </DenseDataTable>
        )}

        {orphanGroups.length > 0 ? (
          <div className="space-y-1">
            <p className="text-dense-caption text-muted-foreground">
              {orphanGroups.length} run{orphanGroups.length === 1 ? '' : 's'} whose
              objective is not in this list — archived, or since deleted.
            </p>
            <HarnessRunsTable groups={orphanGroups} objectiveTitle="—" {...runsTableProps} />
          </div>
        ) : null}

        <MutationNotices
          notices={[
            batchMut.isPending
              ? {
                  tone: 'warning',
                  text: 'Starting unattended run — opens in the right drawer…',
                }
              : null,
            approveFeedback ? { tone: 'success', text: approveFeedback } : null,
                      errNotice(batchMut.error, batchMut.isError),
            // The API refuses a delete that would take run history with it, and
            // says how many runs. Surfacing that verbatim beats a generic failure.
            errNotice(deleteMut.error, deleteMut.isError),
            errNotice(archiveMut.error, archiveMut.isError),
            errNotice(deleteRunMut.error, deleteRunMut.isError),
            errNotice(approveMut.error, approveMut.isError),
            errNotice(curateMut.error, curateMut.isError),
            errNotice(runsQ.error, runsQ.isError),
          ]}
        />
      </section>

      <ConfirmDialog
        open={deletingGroup !== null}
        title="Delete run"
        message={
          deletingGroup
            ? (() => {
                const ids = groupRunIds(deletingGroup)
                const nCand = candidateCountHint(deletingGroup.run)
                const lineage =
                  nCand != null && nCand > 0
                    ? `This also deletes ${nCand}+ candidate(s) that point at them and dismisses pending drafts.`
                    : 'This also deletes any candidates that still point at them and dismisses pending drafts.'
                if (ids.length > 1) {
                  return `Delete ${deletingGroup.run.id} and ${ids.length - 1} identical re-run(s)? Their funnels and traces go with them. ${lineage} Promoted hypotheses are kept.`
                }
                return `Delete ${deletingGroup.run.id}? Its funnel and trace go with it. ${lineage} Promoted hypotheses are kept.`
              })()
            : ''
        }
        confirmLabel={
          deletingGroup && groupRunIds(deletingGroup).length > 1
            ? `Delete ${groupRunIds(deletingGroup).length} runs`
            : 'Delete run'
        }
        confirming={deleteRunMut.isPending}
        onCancel={() => setDeletingGroup(null)}
        onConfirm={() => {
          if (deletingGroup) {
            deleteRunMut.mutate({ runIds: groupRunIds(deletingGroup), force: true })
          }
        }}
      />

      <ConfirmDialog
        open={retiring !== null}
        title={retiring?.mode === 'delete' ? 'Delete objective' : 'Archive objective'}
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
          if (retiring.mode === 'delete') deleteMut.mutate(retiring.objective.id)
          else archiveMut.mutate({ id: retiring.objective.id, status: 'archived' })
        }}
      />

      {runDialog ? (
        <RunLoopDialog
          open
          onOpenChange={(o) => !o && setRunDialog(null)}
          objectiveId={runDialog.id}
          objectiveTitle={runDialog.title}
          maxCandidates={
            Number((runDialog.policy_json as Record<string, unknown> | null)?.max_candidates) || 8
          }
          pending={batchMut.isPending}
          onRun={(overrides) => {
            batchMut.mutate({ objectiveId: runDialog.id, overrides })
            setRunDialog(null)
          }}
        />
      ) : null}

      <RightInspectorShell
        open={Boolean(pipelineRunId)}
        ariaLabel="Smart Decision Run"
        panelWidthPx={inspectorWidthPx(inspectorWidth)}
      >
        {pipelineRunId ? (
          <LoopRunPipelineBody
            runId={pipelineRunId}
            live={pipelineLive}
            onClose={closePipeline}
          />
        ) : null}
      </RightInspectorShell>
    </PageShell>
  )
}

export type RunsTableProps = Omit<
  Parameters<typeof HarnessRunsTable>[0],
  'groups' | 'objectiveTitle'
>

/** One objective, and — when opened — the runs it produced. */

type Notice = { tone: 'warning' | 'success' | 'danger'; text: string } | null

function errNotice(error: unknown, isError: boolean): Notice {
  if (!isError) return null
  return { tone: 'danger', text: error instanceof Error ? error.message : String(error) }
}

/**
 * Every mutation used to append its own conditional paragraph where it was
 * declared, scattering nine near-identical blocks through the markup.
 */
function MutationNotices({ notices }: { notices: Notice[] }) {
  const shown = notices.filter((n): n is NonNullable<Notice> => n !== null)
  if (shown.length === 0) return null
  return (
    <div className="space-y-0.5">
      {shown.map((n, i) => (
        <p
          key={i}
          className={
            n.tone === 'danger'
              ? 'text-dense-meta text-destructive'
              : n.tone === 'success'
                ? 'text-dense-meta text-success'
                : 'text-dense-meta text-warning'
          }
        >
          {n.text}
        </p>
      ))}
    </div>
  )
}
