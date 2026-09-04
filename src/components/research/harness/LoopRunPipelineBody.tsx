/**
 * Smart Decision Run — one run, told in order.
 *
 * The drawer answers one question: should this batch be approved. It used to
 * open with a status header, eleven wrapping pills, a six-line `plan_ops` dump
 * and three panels all expanded — with the Approve button in the title bar,
 * roughly 700px above the evidence it acts on. Now the stages read top to
 * bottom, each one line until you open it, and the decision sits at the end,
 * where a reader arrives having seen what it is based on.
 */
import { useMemo, useState } from 'react'
import { Check, MessageCircle, Sparkles } from 'lucide-react'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  CollapsibleChevron,
  DenseTag,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import {
  HarnessPlanStepper,
  HarnessRunOutputs,
  HarnessTraceEventCard,
} from '@/components/research/harness/HarnessPipelinePanels'
import {
  HarnessFunnelBars,
  HarnessPersonaFold,
  PipelineStageRow,
  phaseViews,
  stageViews,
} from '@/components/research/harness/HarnessPipelineStepper'
import {
  RulesImpactPanel,
  StageGovernors,
} from '@/components/research/harness/HarnessRulesPanel'
import { fmtStageMs } from '@/components/research/harness/harnessFormat'
import {
  loopCopilotUi,
  openCopilotInbox,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { cn } from '@/lib/utils'
import {
  funnelReach,
  parseHarnessTrace,
  runDurationMs,
  statusVariant,
  traceScanEvent,
  traceTerminalState,
} from '@/lib/harness/harnessTrace'
import { useApproveAllRun, useCurateRun, useObjectiveRun } from '@/hooks/useLoopHarness'
import { useQuery } from '@tanstack/react-query'
import { fetchObjectiveRuns } from '@/api/research/harness'

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function LoopRunPipelineBody({
  runId,
  live = true,
  onClose,
}: {
  runId: string
  live?: boolean
  onClose?: () => void
}) {
  const [lang] = useCopilotPromptLang()
  const runQ = useObjectiveRun(runId, { live })
  const curate = useCurateRun()
  const approve = useApproveAllRun()

  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [traceOpen, setTraceOpen] = useState(false)

  const run = runQ.data
  const draftIds = Array.isArray(run?.outputs?.draft_ids)
    ? (run!.outputs!.draft_ids as string[])
    : []
  const awaiting = run?.status === 'awaiting_approval'
  const title = run?.objective_title ?? run?.objective_id ?? runId
  const running = run?.status === 'running'

  const trace = useMemo(() => parseHarnessTrace(run?.trace_json), [run?.trace_json])
  const stages = useMemo(
    () => stageViews(trace, run?.plan_json ?? null, run?.status ?? ''),
    [trace, run?.plan_json, run?.status],
  )
  // The objective's own history, for day-over-day rule comparison. Scoped to
  // this objective so an unrelated system's runs cannot enter the baseline.
  const historyQ = useQuery({
    queryKey: ['objective-runs', 'drift', run?.objective_id],
    queryFn: () => fetchObjectiveRuns({ objective_id: run!.objective_id, limit: 200 }),
    enabled: Boolean(run?.objective_id),
    staleTime: 120_000,
  })

  const phases = useMemo(() => phaseViews(stages), [stages])
  const terminal = traceTerminalState(trace)
  const reach = funnelReach(trace)
  const scan = traceScanEvent(trace)
  const universeMode =
    (typeof scan?.universe_mode === 'string' && scan.universe_mode) ||
    (typeof run?.outputs?.universe_mode === 'string' && run.outputs.universe_mode) ||
    '—'

  const batchMeta = useMemo(() => {
    const outputs = run?.outputs ?? null
    if (!outputs) return null
    const approveAll = outputs.approve_all as
      | { count?: number; held_count?: number; skipped_batch?: boolean }
      | undefined
    const approveSkipped = outputs.approve_skipped === true
    const trust = outputs.trust as { reason?: string } | undefined
    if (!approveAll && !approveSkipped) return null
    return { approveAll, approveSkipped, trustReason: trust?.reason ?? null }
  }, [run?.outputs])

  const toggle = (step: string) => setOpen((o) => ({ ...o, [step]: !o[step] }))

  return (
    <div className="space-y-2 px-1 pb-3">
      <RightInspectorHeader
        title="Smart Decision Run"
        meta={running ? 'Live' : (run?.status ?? '…')}
        actions={
          run ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-dense-meta"
              onClick={() => openLoopRunInCopilot({ runId: run.id, title, lang, runDetail: run })}
            >
              <MessageCircle className="mr-0.5 size-3" />
              {loopCopilotUi.discussShort(lang)}
            </Button>
          ) : null
        }
        onClose={onClose}
        closeLabel="Close pipeline"
      />

      {runQ.isError ? <QueryErrorAlert error={runQ.error} /> : null}
      {runQ.isLoading ? <Skeleton className="h-24 w-full" /> : null}
      {curate.isError ? <QueryErrorAlert error={curate.error} /> : null}
      {approve.isError ? <QueryErrorAlert error={approve.error} /> : null}

      {run ? (
        <>
          {/* What this run is, in one line. */}
          <div className="space-y-1 rounded-md border border-border/60 bg-secondary/50 px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <DenseTag variant={statusVariant(run.status)} size="cell">
                {terminal?.label ?? run.status}
              </DenseTag>
              <span className="min-w-0 flex-1 truncate text-dense-label font-medium">
                {run.objective_title ?? run.objective_id}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-dense-caption text-muted-foreground">
              <span>{universeMode}</span>
              {reach ? (
                <span className="tabular-nums">
                  {reach.considered.toLocaleString('en-US')} considered →{' '}
                  <span className="font-semibold text-foreground">{reach.proposed}</span>{' '}
                  proposed
                  {reach.source === 'funnel_tail' ? (
                    <span
                      className="text-warning"
                      title="Inferred from the funnel's last step — this run predates full cut accounting, so the proposed count may be overstated."
                    >
                      {' '}
                      (inferred)
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span>{fmtDuration(runDurationMs(run.started_at, run.finished_at))}</span>
              <span className="font-mono">{run.id}</span>
            </div>
          </div>

          {phases.map((phase) => (
            <section key={phase.id} className="space-y-0.5">
              <div className="flex items-baseline gap-2 px-1.5 pt-1.5">
                <h4
                  className={cn(
                    'text-dense-label font-semibold',
                    phase.state === 'done'
                      ? 'text-foreground'
                      : phase.state === 'active'
                        ? 'text-warning'
                        : 'text-muted-foreground/60',
                  )}
                >
                  {phase.label}
                </h4>
                <span className="min-w-0 flex-1 truncate text-dense-caption text-muted-foreground/70">
                  {phase.blurb}
                </span>
                {phase.durationMs != null ? (
                  <span className="shrink-0 tabular-nums text-dense-caption text-muted-foreground/70">
                    {fmtStageMs(phase.durationMs)}
                  </span>
                ) : null}
              </div>
              {phase.panel === 'rules' ? (
                <RulesImpactPanel
                  policy={run.objective_policy_json}
                  trace={trace}
                  history={historyQ.data?.items}
                />
              ) : null}
              <ol className="px-0.5">
                {phase.stages.map((s, i) => {
                  const isDecision = s.step === 'draft_candidate_batch'
                  return (
                    <PipelineStageRow
                      key={s.step}
                      index={s.index}
                      state={s.state}
                      label={s.label}
                      blurb={s.blurb}
                      summary={s.summary}
                      isLast={i === phase.stages.length - 1}
                      durationMs={s.durationMs}
                      slowest={s.slowest}
                      expanded={open[s.step] ?? (isDecision && awaiting)}
                      onToggle={() => toggle(s.step)}
                    >
                      <StageGovernors step={s.step} policy={run.objective_policy_json} />
                      {s.step === 'plan' ? <HarnessPlanStepper planJson={run.plan_json} /> : null}
                      {s.step === 'scan_universe' ? <HarnessFunnelBars trace={trace} /> : null}
                      {s.step === 'propose_candidates' ? <ProposedSymbols trace={trace} /> : null}
                      {s.step === 'persona_evaluate' ? <HarnessPersonaFold trace={trace} /> : null}
                      {s.step === 'compose_report' ? <ReportStanceCounts trace={trace} /> : null}
                      {isDecision ? (
                        <DecisionStage
                          awaiting={awaiting}
                          terminalLabel={terminal?.label ?? null}
                          draftCount={draftIds.length}
                          batchMeta={batchMeta}
                          curating={curate.isPending}
                          approving={approve.isPending}
                          onCurate={() => curate.mutate(run.id)}
                          onApprove={() => approve.mutate(run.id)}
                          onInbox={() => openCopilotInbox()}
                          inboxLabel={loopCopilotUi.inbox(lang)}
                        />
                      ) : null}
                      {/* The drafts are what this stage produced. As a sibling
                          of the phases they read as a seventh step. */}
                      {isDecision ? (
                        <div className="mt-2 border-t border-border/40 pt-2">
                          <HarnessRunOutputs run={run} draftIds={draftIds} />
                        </div>
                      ) : null}
                    </PipelineStageRow>
                  )
                })}
              </ol>
            </section>
          ))}

          {/* Not a step. The pipeline above is what the run did; this is the
              record it left. Kept behind its own rule and labelled as raw so it
              stops reading as a phase that comes after Decide. */}
          <div className="mt-3 border-t border-border pt-2">
            <CollapsibleGroup variant="inset" className="border-t-0">
              <CollapsibleGroupHeader
                expanded={traceOpen}
                onToggle={() => setTraceOpen((o) => !o)}
              >
                <CollapsibleChevron expanded={traceOpen} />
                <CollapsibleGroupTitle className="text-dense-meta font-normal text-muted-foreground">
                  Raw trace
                </CollapsibleGroupTitle>
                <span className="ml-2 text-dense-caption text-muted-foreground/60">
                  every event, unformatted
                </span>
              </CollapsibleGroupHeader>
              {traceOpen ? (
                <CollapsibleGroupBody className="px-3 pb-3">
                  <HarnessTraceEventCard traceJson={run.trace_json} />
                </CollapsibleGroupBody>
              ) : null}
            </CollapsibleGroup>
          </div>
        </>
      ) : null}
    </div>
  )
}

function ProposedSymbols({ trace }: { trace: ReturnType<typeof parseHarnessTrace> }) {
  const ev = trace.events.find((e) => e.step === 'propose_candidates')
  const symbols = Array.isArray(ev?.symbols) ? (ev.symbols as string[]) : []
  if (symbols.length === 0) {
    return <p className="text-dense-meta text-muted-foreground">No candidates proposed.</p>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {symbols.map((s) => (
        <DenseTag key={s} variant="symbol" size="cell">
          {s}
        </DenseTag>
      ))}
    </div>
  )
}

function ReportStanceCounts({ trace }: { trace: ReturnType<typeof parseHarnessTrace> }) {
  const ev = trace.events.find((e) => e.step === 'compose_report')
  const counts = (ev?.net_stance_counts ?? {}) as Record<string, number>
  const entries = Object.entries(counts)
  if (entries.length === 0) {
    return <p className="text-dense-meta text-muted-foreground">No report recorded.</p>
  }
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {entries.map(([stance, n]) => (
          <DenseTag key={stance} variant="neutral" size="cell">
            {stance}: {n}
          </DenseTag>
        ))}
      </div>
      {typeof ev?.with_settled_record === 'number' ? (
        <p className="text-dense-caption text-muted-foreground">
          {ev.with_settled_record} of {String(ev.candidates ?? '—')} have a settled
          record to score against — the rest are proposals with no history yet.
        </p>
      ) : null}
    </div>
  )
}

function DecisionStage({
  awaiting,
  terminalLabel,
  draftCount,
  batchMeta,
  curating,
  approving,
  onCurate,
  onApprove,
  onInbox,
  inboxLabel,
}: {
  awaiting: boolean
  terminalLabel: string | null
  draftCount: number
  batchMeta: {
    approveAll?: { count?: number; held_count?: number; skipped_batch?: boolean }
    approveSkipped: boolean
    trustReason: string | null
  } | null
  curating: boolean
  approving: boolean
  onCurate: () => void
  onApprove: () => void
  onInbox: () => void
  inboxLabel: string
}) {
  const skipped = Boolean(batchMeta?.approveAll?.skipped_batch || batchMeta?.approveSkipped)
  return (
    <div className="space-y-2">
      {/* A tag is a label, not a paragraph. `trustReason` is a full sentence, so
          wrapping it in a pill produced a three-line rounded box that read as a
          broken control. Short label in the tag; the reason as prose under it. */}
      {batchMeta ? (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {skipped ? (
              <DenseTag variant="warning" size="cell">
                Auto-approve held
              </DenseTag>
            ) : (
              <DenseTag variant="success" size="cell">
                Auto-approved {batchMeta.approveAll?.count ?? 0} · held{' '}
                {batchMeta.approveAll?.held_count ?? 0}
              </DenseTag>
            )}
          </div>
          {skipped ? (
            <p className="text-dense-caption text-muted-foreground">
              {batchMeta.trustReason ?? 'Not at Trust L0, or a persona dissented.'}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="text-dense-meta">
        {awaiting ? (
          <>
            {draftCount || 'No'} draft{draftCount === 1 ? '' : 's'} waiting on you.
            Auto-approve fires only at Trust L0 with no dissent, research drafts
            only — D10 keeps every execution path shut.
          </>
        ) : (
          <span className="text-muted-foreground">
            {terminalLabel ?? 'Finished'} — nothing left to decide here.
          </span>
        )}
      </p>

      {awaiting ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-dense-meta"
            disabled={approving}
            onClick={onApprove}
          >
            <Check className="mr-1 size-3" />
            {approving ? 'Approving…' : 'Approve all'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-dense-meta"
            disabled={curating}
            onClick={onCurate}
          >
            <Sparkles className="mr-1 size-3" />
            {curating ? '…' : 'Curator'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-dense-meta"
            onClick={onInbox}
          >
            {inboxLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
