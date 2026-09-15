/**
 * Ran today — which scheduled agents wrote today, how the runs behind them
 * stand, when the Autopilot next runs unattended, and a way to run one now.
 *
 * Design (`design/trade/Research Copilot.dc.html`, Today) is a table of agents
 * with a lamp each, scheduled rows in grey, and "Run one now:" as a row of
 * links under it. The Owner chose that inline row over the Agents dropdown the
 * Desk used to carry (2026-09-13); the dropdown stays in the Copilot composer.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import { EmptyState } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { Skeleton } from '@/components/ui/skeleton'
import { RunLoopDialog } from '@/components/research/harness/RunLoopDialog'
import { listResearchDrafts, type DraftStatus } from '@/api/researchDrafts'
import {
  batchRunObjective,
  fetchObjectiveRunIfKept,
  type BatchRunOverrides,
  type ResearchObjective,
} from '@/api/research/harness'
import { researchDraftsQueryKey, useRunEodAgent, useRunMorningAgent } from '@/hooks/useResearchDrafts'
import { useActiveObjectives, useAutopilotStanding, useAwaitingRuns, useCurateRun } from '@/hooks/useLoopHarness'
import { fmtIsoTs } from '@/lib/format'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { fmtUsd, runSpend } from '@/lib/harness/runSpend'
import { rowLamp, type RunStatusRead } from '@/lib/harness/runLamp'
import {
  agentsThatWroteOn,
  humanKind,
  nyDate,
  nyWhen,
  objectiveSchedule,
  rowCost,
  scheduledRows,
  type RunCost,
} from '@/pages/research/seats/agentActivity'
import { fetchOrchestrationStatus } from '@/api/research/orchestration'

/**
 * Drafts are the record: the agents already write `generated_by`, `created_at`
 * and `kind`, so this reads the rows the Decision Inbox reads instead of a
 * second table that could disagree with it. Cost and status are recorded per
 * objective run: a row reads the runs its drafts link.
 *
 * All four statuses, because an agent that ran and whose drafts you have since
 * approved still ran. The backend filters to `pending` when the parameter is
 * omitted, so each status is asked for separately; a status that comes back
 * full may be hiding more, and the count says so instead of rounding down
 * silently.
 */
const DRAFT_STATUSES: DraftStatus[] = ['pending', 'approved', 'dismissed', 'expired']
const DRAFT_PAGE = 100

export function RanToday() {
  const queries = useQueries({
    queries: DRAFT_STATUSES.map((status) => ({
      queryKey: ['research', 'drafts', 'ran-today', status],
      queryFn: () => listResearchDrafts({ status, limit: DRAFT_PAGE }),
      staleTime: 60_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const errored = queries.filter((q) => q.isError)
  const rows = useMemo(() => {
    const drafts = queries.flatMap((q) => q.data?.rows ?? [])
    return agentsThatWroteOn(drafts, nyDate(new Date()))
  }, [queries])
  // A page that came back full is a page that may have been cut off.
  const maybeShort = queries.some((q) => (q.data?.rows.length ?? 0) >= DRAFT_PAGE)

  // One request per distinct run, shared by every row that links it — cost and status both come from it.
  const runIds = useMemo(() => [...new Set(rows.flatMap((r) => r.runIds))].sort(), [rows])
  const runQueries = useQueries({
    queries: runIds.map((id) => ({
      queryKey: ['research', 'objective-run', id],
      queryFn: () => fetchObjectiveRunIfKept(id),
      staleTime: 60_000,
    })),
  })
  const costByRun = new Map<string, RunCost>()
  const statusByRun = new Map<string, RunStatusRead>()
  runIds.forEach((id, i) => {
    const q = runQueries[i]
    if (!q || q.isLoading) {
      costByRun.set(id, 'loading')
      statusByRun.set(id, 'loading')
    } else if (q.isError || q.data === undefined) {
      costByRun.set(id, 'error')
      statusByRun.set(id, 'error')
    } else if (q.data === null) {
      costByRun.set(id, 'gone')
      statusByRun.set(id, 'gone')
    } else {
      costByRun.set(id, runSpend(q.data).total_usd)
      statusByRun.set(id, q.data.status)
    }
  })

  let body: React.ReactNode
  if (isLoading) {
    body = <Skeleton className="h-24 w-full" />
  } else if (errored.length === DRAFT_STATUSES.length) {
    // Partial is not clean: some agents may be missing from this list entirely.
    body = <ResearchAuthGap error={errored[0].error} onRetry={() => queries.forEach((q) => void q.refetch())} />
  } else if (rows.length === 0) {
    body = (
      <EmptyState
        icon={<Zap />}
        title="Nothing has run yet today"
        description="Morning Prep and the EOD review write into the Decision Inbox when they run. Run one below."
      />
    )
  } else {
    body = (
      <ul className="divide-y divide-border rounded-lg border border-border bg-secondary/40">
        {rows.map((r) => {
          const { lamp, why } = rowLamp(r.runIds, statusByRun)
          return (
            <li key={r.agent} className="flex items-start gap-2 px-3 py-2">
              <span className="mt-1 shrink-0" title={why}>
                <StatusLamp lamp={lamp} variant="dot" title={why} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-dense-label">{r.agent}</span>
                <span className="block text-dense-meta text-muted-foreground">
                  {r.produced.map((p) => `${p.n} ${humanKind(p.kind)}`).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-dense-meta tabular-nums text-muted-foreground">
                  {fmtIsoTs(r.lastAt)}
                </span>
                <RowCost runIds={r.runIds} costByRun={costByRun} />
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-2">
      {body}
      {!isLoading && (errored.length > 0 || maybeShort) ? (
        <p className="text-dense-meta text-warning">
          {errored.length > 0
            ? `${errored.length} of ${DRAFT_STATUSES.length} draft states could not be read — an agent may be missing from this list.`
            : 'A draft page came back full, so these counts are a floor.'}
        </p>
      ) : null}
      <Scheduled wroteToday={isLoading ? null : new Set(rows.map((r) => r.agent))} />
      <RunOneNow />
    </div>
  )
}

/**
 * The design's grey "scheduled" rows (Copilot Desk response ⑦).
 *
 * The Autopilot's objectives get a next run time — the one the page can know.
 * The digest (Morning Prep folded into it), the EOD review and the weekly policy
 * review run on Dagster schedules. When Research reports `next_tick_at`, the
 * row shows that time; otherwise it falls back to last-run facts. Red only when
 * that last run failed.
 */
function Scheduled({ wroteToday }: { wroteToday: ReadonlySet<string> | null }) {
  const standing = useAutopilotStanding()
  const objectivesQ = useActiveObjectives()
  const orchestration = useQuery({
    queryKey: ['research', 'orchestration', 'status'],
    queryFn: fetchOrchestrationStatus,
    staleTime: 5 * 60_000,
  })
  const rows = objectiveSchedule(objectivesQ.data?.items ?? [], standing.data?.next_run_at ?? null)
  // Until today's drafts are read, every agent would look as if it had not run.
  const schedules = wroteToday && orchestration.data ? scheduledRows(orchestration.data.schedules, wroteToday) : []
  if (rows.length === 0 && schedules.length === 0 && !orchestration.isError) return null
  return (
    <ul className="space-y-1 px-3 text-dense-meta text-muted-foreground">
      {rows.map((o) => (
        <li key={o.id} className="flex items-center gap-2">
          <StatusLamp lamp="gray" variant="dot" title="Scheduled, not yet run" />
          <Link to="/research/loop/harness" className="min-w-0 truncate hover:underline">
            {o.title}
          </Link>
          <span
            className="ml-auto shrink-0 font-mono tabular-nums"
            title={
              o.next
                ? 'The harness CronJob runs daily_open objectives on weekdays at 13:30 UTC. This time is computed from that schedule, not read from the cluster.'
                : 'Its schedule is not daily_open, so the harness CronJob does not pick it up.'
            }
          >
            {o.next ? `next run ${nyWhen(new Date(o.next))}` : 'runs only when started'}
          </span>
        </li>
      ))}
      {schedules.map((s) => (
        <li key={s.schedule} className="flex items-center gap-2">
          <StatusLamp
            lamp={s.lastFailed ? 'red' : 'gray'}
            variant="dot"
            title={s.lastFailed ? 'Its last run failed' : 'Scheduled, not run yet today'}
          />
          <span className="min-w-0 truncate">{s.label}</span>
          <span
            className="ml-auto shrink-0 font-mono tabular-nums"
            title={
              s.nextAt
                ? `Dagster ${s.schedule}. Next tick from the schedule cron in its execution timezone, converted to ET for display.`
                : `Dagster ${s.schedule}. Research reports whether it is on and when it last ran.`
            }
          >
            {s.nextAt
              ? `next ${nyWhen(new Date(s.nextAt))}`
              : `schedule ${s.state} · ${
                  s.lastAt ? `last ${s.lastFailed ? 'failed ' : ''}${nyWhen(new Date(s.lastAt))}` : 'no run recorded'
                }`}
          </span>
        </li>
      ))}
      {orchestration.isError ? (
        <li className="flex items-center gap-2">
          <StatusLamp lamp="gray" variant="dot" title="Schedule status could not be read" />
          <span>Digest and EOD schedules could not be read</span>
        </li>
      ) : null}
    </ul>
  )
}

/**
 * Run one now. Research agents only — nothing here places or arms an order (D10).
 *
 * An objective run goes through the same estimate dialog the Autopilot uses,
 * because it is the one thing here that spends real money, and asynchronously,
 * because the last unattended run took four minutes. The other three wait for
 * their answer and say what came of it.
 */
function RunOneNow() {
  const queryClient = useQueryClient()
  const morning = useRunMorningAgent()
  const eod = useRunEodAgent()
  const curate = useCurateRun()
  const objectivesQ = useActiveObjectives()
  const awaitingQ = useAwaitingRuns()
  const [dialogFor, setDialogFor] = useState<ResearchObjective | null>(null)
  const batch = useMutation({
    mutationFn: (v: { objectiveId: string; overrides: BatchRunOverrides }) =>
      batchRunObjective(v.objectiveId, v.overrides),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objective-runs'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: researchDraftsQueryKey })
    },
  })

  const objectives = objectivesQ.data?.items ?? []
  const latestAwaiting = awaitingQ.data?.items?.[0] ?? null
  const failed = [morning, eod, batch, curate].find((m) => m.isError)
  const startedRun = batch.data?.run?.id ?? null
  const link = 'h-auto px-0 py-0 text-dense-meta'

  return (
    <div className="space-y-1 border-t border-border px-3 pt-2 text-dense-meta text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Run one now:</span>
        <Button
          variant="link"
          size="sm"
          className={link}
          disabled={morning.isPending}
          title="Writes a morning brief draft; it shows up in Waiting on you"
          onClick={() => morning.mutate()}
        >
          {morning.isPending ? 'Morning Prep — running…' : 'Morning Prep'}
        </Button>
        <Button
          variant="link"
          size="sm"
          className={link}
          disabled={eod.isPending}
          title="Writes end-of-day verdicts; they show up in Waiting on you"
          onClick={() => eod.mutate()}
        >
          {eod.isPending ? 'EOD Review — running…' : 'EOD Review'}
        </Button>
        {objectives.length === 0 ? (
          <span title="No objective is active">Active objective — none</span>
        ) : (
          objectives.map((o) => (
            <Button
              key={o.id}
              variant="link"
              size="sm"
              className={link}
              disabled={batch.isPending}
              title={`${o.title} — shows what the run will cost before it starts`}
              onClick={() => setDialogFor(o)}
            >
              {batch.isPending ? 'Starting…' : objectives.length === 1 ? 'Active objective' : o.title}
            </Button>
          ))
        )}
        <Button
          variant="link"
          size="sm"
          className={link}
          disabled={!latestAwaiting || curate.isPending}
          title={latestAwaiting ? `Runs the curator on ${latestAwaiting.id}` : 'No run is awaiting approval'}
          onClick={() => latestAwaiting && curate.mutate(latestAwaiting.id)}
        >
          {curate.isPending ? 'Curator — running…' : 'Curator on latest run'}
        </Button>
      </div>

      {morning.isSuccess || eod.isSuccess ? (
        <p>
          {[morning.isSuccess ? 'Morning Prep' : null, eod.isSuccess ? 'EOD Review' : null].filter(Boolean).join(' and ')} finished —
          what it wrote is in Waiting on you.
        </p>
      ) : null}
      {startedRun ? (
        <p>
          Started{' '}
          <Link to={loopPipelinePath(startedRun)} className="font-mono hover:underline">
            {startedRun}
          </Link>{' '}
          — its candidates reach Waiting on you when it finishes.
        </p>
      ) : null}
      {curate.data?.error ? (
        <p className="text-warning">Curator on {curate.data.run_id}: {curate.data.error}</p>
      ) : curate.isSuccess ? (
        <p>Curator finished on {curate.data.run_id}.</p>
      ) : null}
      {failed ? <ResearchAuthGap error={failed.error} /> : null}

      {dialogFor ? (
        <RunLoopDialog
          open
          onOpenChange={(o) => !o && setDialogFor(null)}
          objectiveId={dialogFor.id}
          objectiveTitle={dialogFor.title}
          maxCandidates={Number((dialogFor.policy_json as Record<string, unknown> | null)?.max_candidates) || 8}
          pending={batch.isPending}
          onRun={(overrides) => {
            batch.mutate({ objectiveId: dialogFor.id, overrides })
            setDialogFor(null)
          }}
        />
      ) : null}
    </div>
  )
}

/**
 * The Cost cell. What it says is decided by `rowCost`; this only words it.
 */
function RowCost({
  runIds,
  costByRun,
}: {
  runIds: readonly string[]
  costByRun: ReadonlyMap<string, RunCost>
}) {
  const cost = rowCost(runIds, costByRun)
  const quiet = 'block text-dense-micro text-muted-foreground/60'
  switch (cost.state) {
    case 'unrecorded':
      return (
        <span className={quiet} title="Its drafts link no objective run, and only objective runs record spend">
          cost not recorded
        </span>
      )
    case 'loading':
      return <span className={quiet}>cost …</span>
    case 'gone':
      return (
        <span
          className={quiet}
          title={`The Research service no longer keeps ${cost.runs === 1 ? 'the run' : `the ${cost.runs} runs`} these drafts came from, and a run's spend is recorded on the run`}
        >
          run no longer kept
        </span>
      )
    case 'unreadable':
      return (
        <span
          className={quiet}
          title={`${cost.runs} linked run${cost.runs === 1 ? '' : 's'}, and none could be read`}
        >
          cost unreadable
        </span>
      )
    case 'total':
      return (
        <span
          className="block font-mono text-dense-micro tabular-nums text-muted-foreground"
          title={`Spend across ${cost.runs} run${cost.runs === 1 ? '' : 's'}${
            cost.unread ? ` · ${cost.unread} gone or unreadable, so this is a floor` : ''
          }`}
        >
          {fmtUsd(cost.usd)}
          {cost.unread ? '+' : ''}
        </span>
      )
  }
}
