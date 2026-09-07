/**
 * One objective as a standing brief: what it hunts, what it said last, whether
 * its picks have been right, what it costs — and, expanded, the runs behind it.
 *
 * Split from the console page because the page had grown past the length
 * ratchet, and because this row is the unit the Autopilot page is made of.
 * Single user, so it stays beside the page (module-placement-v1).
 */
import { Archive, ArchiveRestore, Play, Trash2 } from 'lucide-react'
import {
  DenseTableCell,
  DenseTableDetailRow,
  DenseTableRow,
  DenseTag,
  ExpandToggleCell,
  IconActionButton,
  denseTable,
} from '@/components/data-display'
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
    <>
      <DenseTableRow>
        <DenseTableCell className={denseTable.expandColCell}>
          <ExpandToggleCell
            expanded={isOpen}
            onToggle={onToggle}
            label={`${isOpen ? 'Collapse' : 'Expand'} runs for ${row.title}`}
          />
        </DenseTableCell>
        <DenseTableCell>
          <div className="min-w-0">
            <p className="truncate text-dense-label font-medium">{row.title}</p>
            {/* What it hunts, read from its policy, not its prose. */}
            <p className="text-dense-caption text-muted-foreground">{brief?.hunts || row.description}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-dense-micro text-muted-foreground">
              <DenseTag variant={archived ? 'neutral' : 'success'} size="cell">
                {row.status}
              </DenseTag>
              <DenseTag variant="neutral" size="cell">
                {row.schedule}
              </DenseTag>
              {brief?.last_run?.started_at ? <span>last ran {fmtIsoTs(brief.last_run.started_at)}</span> : null}
            </p>
          </div>
        </DenseTableCell>
        <DenseTableCell>
          {memo ? (
            <button
              type="button"
              className="block min-w-0 max-w-[34rem] text-left hover:underline"
              onClick={() => onOpenMemo(memo.run_id)}
              title="Open the memo"
            >
              <span className="block text-dense-meta">
                <span className="font-mono text-warning">{stars(memo.best_conviction)}</span>{' '}
                {memo.headline}
              </span>
              <span className="mt-0.5 block truncate font-mono text-dense-micro text-muted-foreground">
                {memo.picks.map((p) => `${p.symbol} ${p.action.replace(/_/g, ' ')}`).join(' · ')}
              </span>
            </button>
          ) : hasRuns ? (
            <span className="text-dense-caption text-muted-foreground">
              no rated run yet — open a run and rate it
            </span>
          ) : (
            <span className="text-dense-caption text-muted-foreground">never run</span>
          )}
        </DenseTableCell>
        <DenseTableCell>
          {rec?.status === 'ok' && rec.hit_rate != null ? (
            <span
              className="text-dense-meta"
              title={`Hit = beat SPY over the same window. ${rec.judged} settled at T+${rec.horizon_days}${rec.scope === 'source' ? '. This is the harness-wide record: none of this objective’s own picks have settled yet.' : ''}`}
            >
              <span className="font-mono text-dense-body font-semibold tabular-nums">{rec.hit_rate.toFixed(2)}</span>
              <span className="text-muted-foreground"> hit · </span>
              <span className="font-mono tabular-nums">{rec.judged}</span>
              <span className="text-muted-foreground"> settled · T+{rec.horizon_days}</span>
              {rec.avg_excess != null ? (
                <span className="block font-mono text-dense-micro tabular-nums text-muted-foreground">
                  avg excess {rec.avg_excess >= 0 ? '+' : ''}
                  {(rec.avg_excess * 100).toFixed(2)}%
                </span>
              ) : null}
              {rec.scope === 'source' ? (
                <span className="block text-dense-micro text-warning">harness-wide, not this objective’s own</span>
              ) : null}
            </span>
          ) : (
            <span className="text-dense-caption text-muted-foreground">none settled yet</span>
          )}
        </DenseTableCell>
        <DenseTableCell>
          <span className="text-dense-meta tabular-nums">
            {spend > 0 ? (
              <span
                className="font-mono"
                title={`Models called across the ${groups.length} run${groups.length === 1 ? '' : 's'} listed here. Open a run for its own breakdown.`}
              >
                {fmtUsd(spend)}
              </span>
            ) : (
              <span className="text-muted-foreground">$0</span>
            )}
            <span className="block text-dense-micro text-muted-foreground">
              {groups.length} run{groups.length === 1 ? '' : 's'}
              {awaitingN > 0 ? <span className="text-warning"> · {awaitingN} awaiting you</span> : null}
            </span>
          </span>
        </DenseTableCell>
        <DenseTableCell>
          <div className="flex flex-wrap items-center gap-0.5">
            {archived ? null : (
              /* One Run, not two. The pair was "Run" (a labelled button) beside
                 "Run unattended" (a bare lightning icon) — wildly different
                 visual weight for two controls whose difference nobody could
                 read, and the second strictly contains the first: same
                 proposal, then the Curator, then auto-approve once Trust is L0.
                 Keeping the manual subset only offered a way to do less. */
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-dense-meta"
                disabled={anyRunPending}
                title={
                  trustL0
                    ? 'Propose → Curator → auto-approve research drafts (Trust L0). Runs an LLM curator pass.'
                    : 'Propose → Curator. Will not auto-approve until Trust L0. Runs an LLM curator pass.'
                }
                onClick={onRun}
              >
                <Play className="mr-0.5 size-3 shrink-0" />
                {running ? 'Running…' : 'Run loop'}
              </Button>
            )}
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
              title={
                hasRuns
                  ? 'Cannot delete — this objective has runs. Archive it instead.'
                  : 'Delete — it has never run'
              }
              ariaLabel={`Delete ${row.title}`}
              disabled={hasRuns}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </IconActionButton>
          </div>
        </DenseTableCell>
      </DenseTableRow>
      {isOpen ? (
        <DenseTableDetailRow>
          <DenseTableCell className={denseTable.expandColCell}>{null}</DenseTableCell>
          <DenseTableCell colSpan={5} className="py-2 pl-2 pr-1">
            <HarnessRunsTable
              groups={groups}
              objectiveTitle={row.title}
              {...runsTableProps}
            />
          </DenseTableCell>
        </DenseTableDetailRow>
      ) : null}
    </>
  )
}
