/**
 * One objective as a standing brief: what it hunts, what it said last, whether
 * its picks have been right, what it costs — and, expanded, the runs behind it.
 *
 * Split from the console page because the page had grown past the length
 * ratchet, and because this row is the unit the Autopilot page is made of.
 * Single user, so it stays beside the page (module-placement-v1).
 */
import { Archive, ArchiveRestore, Play, Trash2 } from 'lucide-react'
import { DenseTag, IconActionButton } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { fmtIsoTs } from '@/lib/format'
import { groupSpend, fmtUsd } from '@/lib/harness/runSpend'
import { stars } from '@/lib/harness/rating'
import type { RunGroup } from '@/lib/harness/harnessTrace'
import type { AutopilotObjective, ResearchObjective } from '@/api/research/harness'
import { HarnessRunsTable } from '@/pages/research/loop/HarnessRunsTable'
import type { RunsTableProps } from '@/pages/research/loop/HarnessConsolePage'

export function ObjectiveRows({
  row,
  groups,
  awaitingN,
  hasRuns,
  archived,
  isOpen,
  onToggle,
  running,
  anyRunPending,
  trustL0,
  onRun,
  onArchive,
  onRestore,
  onDelete,
  archivePending,
  runsTableProps,
  brief,
  onOpenMemo,
}: {
  row: ResearchObjective
  groups: RunGroup[]
  awaitingN: number
  hasRuns: boolean
  archived: boolean
  isOpen: boolean
  onToggle: () => void
  running: boolean
  anyRunPending: boolean
  trustL0: boolean
  onRun: () => void
  onArchive: () => void
  onRestore: () => void
  onDelete: () => void
  archivePending: boolean
  runsTableProps: RunsTableProps
  /** The standing brief from the autopilot endpoint; null while it loads. */
  brief: AutopilotObjective | null
  onOpenMemo: (runId: string) => void
}) {
  // Re-runs are folded into their row but not out of the bill.
  const spend = groups.reduce((sum, g) => sum + groupSpend(g).total_usd, 0)
  const memo = brief?.last_memo ?? null
  const rec = brief?.track_record ?? null
  return (
    <li className="rounded-lg border border-border bg-secondary/40 shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
      {/* Reading density, on purpose. This is a memo about an autopilot, not
          an instrument panel: one headline you can read in a breath, three
          facts under it, and the runs behind a fold. The workbench keeps its
          dense tokens; this page is the other posture. */}
      <div className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.6fr)_auto]">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug">{row.title}</h3>
          <p className="mt-0.5 text-dense-label leading-relaxed text-muted-foreground">
            {brief?.hunts || row.description}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-dense-meta text-muted-foreground">
            <DenseTag variant={archived ? 'neutral' : 'success'} size="cell">
              {row.status}
            </DenseTag>
            <DenseTag variant="neutral" size="cell">
              {row.schedule}
            </DenseTag>
            {brief?.last_run?.started_at ? <span>last ran {fmtIsoTs(brief.last_run.started_at)}</span> : null}
          </p>
        </div>

        <div className="min-w-0">
          {memo ? (
            <button
              type="button"
              className="block w-full min-w-0 rounded-md text-left hover:bg-muted/30"
              onClick={() => onOpenMemo(memo.run_id)}
              title="Open the memo"
            >
              <span className="block text-base leading-relaxed">
                <span className="font-mono text-warning">{stars(memo.best_conviction)}</span>{' '}
                {memo.headline}
              </span>
              <span className="mt-1 block font-mono text-dense-meta leading-relaxed text-muted-foreground">
                {memo.picks.map((p) => `${p.symbol} ${p.action.replace(/_/g, ' ')}`).join('  ·  ')}
              </span>
            </button>
          ) : hasRuns ? (
            <p className="text-dense-label leading-relaxed text-muted-foreground">
              No rated run yet. Open a run and rate it.
            </p>
          ) : (
            <p className="text-dense-label leading-relaxed text-muted-foreground">Never run.</p>
          )}
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <Fact label="Track record">
              {rec?.status === 'ok' && rec.hit_rate != null ? (
                <span
                  title={`Hit = beat SPY over the same window. ${rec.judged} settled at T+${rec.horizon_days}${rec.scope === 'source' ? '. Harness-wide: none of this objective’s own picks have settled yet.' : ''}`}
                >
                  <span className="font-mono text-base font-semibold tabular-nums">{rec.hit_rate.toFixed(2)}</span>
                  <span className="text-muted-foreground"> over {rec.judged}</span>
                  {rec.scope === 'source' ? <span className="block text-dense-meta text-warning">harness-wide</span> : null}
                </span>
              ) : (
                <span className="text-muted-foreground">none settled yet</span>
              )}
            </Fact>
            <Fact label="Cost, 30 days">
              <span className="font-mono text-base font-semibold tabular-nums">{spend > 0 ? fmtUsd(spend) : '$0'}</span>
              <span className="text-muted-foreground"> · {groups.length} run{groups.length === 1 ? '' : 's'}</span>
            </Fact>
            <Fact label="Waiting on you">
              {awaitingN > 0 ? (
                <span className="font-mono text-base font-semibold tabular-nums text-warning">{awaitingN}</span>
              ) : (
                <span className="text-muted-foreground">nothing</span>
              )}
            </Fact>
          </dl>
        </div>

        <div className="flex flex-row flex-wrap items-start gap-1 md:flex-col">
          {archived ? null : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-3 text-dense-label"
              disabled={anyRunPending}
              title={
                trustL0
                  ? 'Propose → Curator → auto-approve research drafts (Trust L0). Runs an LLM curator pass.'
                  : 'Propose → Curator. Will not auto-approve until Trust L0. Runs an LLM curator pass.'
              }
              onClick={onRun}
            >
              <Play className="mr-1 size-3.5 shrink-0" />
              {running ? 'Running…' : 'Run now'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-dense-label"
            onClick={onToggle}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Hide runs' : `Runs (${groups.length})`}
          </Button>
          <span className="flex items-center gap-0.5">
            {archived ? (
              <IconActionButton
                title="Restore — brings it back to the active list"
                ariaLabel={`Restore ${row.title}`}
                disabled={archivePending}
                onClick={onRestore}
              >
                <ArchiveRestore className="size-3.5" />
              </IconActionButton>
            ) : (
              <IconActionButton
                title="Archive — leaves the console, keeps its runs"
                ariaLabel={`Archive ${row.title}`}
                onClick={onArchive}
              >
                <Archive className="size-3.5" />
              </IconActionButton>
            )}
            <IconActionButton
              tone="danger"
              title={hasRuns ? 'Cannot delete — this objective has runs. Archive it instead.' : 'Delete — it has never run'}
              ariaLabel={`Delete ${row.title}`}
              disabled={hasRuns}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </IconActionButton>
          </span>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-border/60 px-2 pb-2 pt-1">
          {hasRuns ? (
            <HarnessRunsTable groups={groups} objectiveTitle={row.title} {...runsTableProps} />
          ) : (
            <p className="px-2 py-2 text-dense-label text-muted-foreground">No runs yet.</p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-dense-meta uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-dense-label leading-relaxed">{children}</dd>
    </div>
  )
}
