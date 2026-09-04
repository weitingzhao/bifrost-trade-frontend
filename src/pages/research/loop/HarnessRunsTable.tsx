/**
 * A single objective's run history.
 *
 * This used to be a second top-level table listing every run of every
 * objective, with an Objective column to tell them apart — so the page asked
 * you to join two tables by eye. Runs belong to the objective that produced
 * them; nested here, the Objective column disappears and the question the
 * table answers ("what has this one been doing?") is the question you had when
 * you expanded the row.
 */
import { Check, MessageCircle, Sparkles, Terminal, Trash2 } from 'lucide-react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  IconActionButton,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { fmtInt, fmtIsoTs } from '@/lib/format'
import { funnelReach, parseHarnessTrace, runDurationMs } from '@/lib/harness/harnessTrace'
import type { RunGroup } from '@/lib/harness/harnessTrace'
import { loopCopilotUi, openLoopRunInCopilot } from '@/lib/harness/loopCopilotPrefill'
import type { CopilotPromptLang } from '@/lib/copilot/promptLang'

/**
 * Watchlist-sized. Below this a run did not screen a market, it re-read a list —
 * the failure the funnel column exists to make visible at a glance rather than
 * after a warehouse query.
 */
const WATCHLIST_SCALE = 100

function runStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'awaiting_approval') return 'warning'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

/** Considered → proposed for one run, with the conversion it implies. */
export function RunFunnelCell({ trace }: { trace: unknown }) {
  const reach = funnelReach(parseHarnessTrace(trace))
  if (!reach) {
    return <span className="text-dense-caption text-muted-foreground">no funnel</span>
  }
  const { considered, proposed, source } = reach
  const pct = considered > 0 ? (proposed / considered) * 100 : null
  const narrow = considered < WATCHLIST_SCALE
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className="font-mono tabular-nums text-dense-meta"
        title={
          source === 'funnel_tail'
            ? 'Proposed count inferred from the funnel — this run predates full cut accounting and may read high.'
            : undefined
        }
      >
        {fmtInt(considered)} → {fmtInt(proposed)}
        {source === 'funnel_tail' ? <span className="text-warning">*</span> : null}
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

export function HarnessRunsTable({
  groups,
  lang,
  objectiveTitle,
  onOpenPipeline,
  onApprove,
  onCurate,
  onDelete,
  approvingId,
  curatingId,
  deleteBusy,
}: {
  groups: RunGroup[]
  lang: CopilotPromptLang
  objectiveTitle: string
  onOpenPipeline: (runId: string) => void
  onApprove: (runId: string) => void
  onCurate: (runId: string) => void
  /** Deletes the whole folded group (head + identical re-runs). */
  onDelete: (group: RunGroup) => void
  approvingId: string | null
  curatingId: string | null
  deleteBusy: boolean
}) {
  if (groups.length === 0) {
    return (
      <p className="px-1 py-2 text-dense-meta text-muted-foreground">
        No runs yet for this objective.
      </p>
    )
  }
  return (
    <DenseDataTable tableClassName="min-w-[44rem]">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Run</DenseTableHead>
          <DenseTableHead>Funnel</DenseTableHead>
          <DenseTableHead>Started</DenseTableHead>
          <DenseTableHead>Status</DenseTableHead>
          <DenseTableHead>Actions</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {groups.map(({ run: row, repeats }) => {
          const awaiting = row.status === 'awaiting_approval'
          const duration = runDurationMs(row.started_at, row.finished_at)
          const autoOk = row.outputs?.auto_approve_eligible
          const personaEval = (row.outputs?.persona_eval ?? null) as Record<
            string,
            unknown
          > | null
          const personaMode =
            typeof personaEval?.mode === 'string' ? personaEval.mode : null
          const curatorTrace = (row.outputs?.curator_trace ?? null) as Record<
            string,
            unknown
          > | null
          return (
            <DenseTableRow key={row.id}>
              <DenseTableCell>
                <button
                  type="button"
                  className="block max-w-full truncate text-left font-mono text-dense-meta text-primary hover:underline"
                  onClick={() => onOpenPipeline(row.id)}
                >
                  {row.id}
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {repeats.length > 0 ? (
                    <span
                      className="text-dense-micro text-muted-foreground"
                      title={`${repeats.length} earlier run(s) today screened the same ground to the same names`}
                    >
                      +{repeats.length} re-run{repeats.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                  {personaMode ? (
                    <span className="text-dense-micro text-muted-foreground">
                      persona: {personaMode}
                      {personaEval?.fallback_used === true ? ' (fallback)' : ''}
                    </span>
                  ) : null}
                  {autoOk === false ? (
                    <DenseTag variant="warning" size="cell">
                      held (dissent)
                      {personaEval?.blocked_by_validate != null
                        ? ` · blocked ${String(personaEval.blocked_by_validate)}`
                        : ''}
                    </DenseTag>
                  ) : null}
                </div>
              </DenseTableCell>
              <DenseTableCell>
                <RunFunnelCell trace={row.trace_json} />
              </DenseTableCell>
              <DenseTableCell className="truncate text-dense-meta text-muted-foreground">
                {fmtIsoTs(row.started_at)}
                {duration != null ? (
                  <span className="block text-dense-caption">
                    {(duration / 1000).toFixed(1)}s
                  </span>
                ) : null}
              </DenseTableCell>
              <DenseTableCell>
                <DenseTag variant={runStatusVariant(row.status)}>{row.status}</DenseTag>
              </DenseTableCell>
              <DenseTableCell>
                <div className="flex flex-wrap items-center gap-0.5">
                  {awaiting ? (
                    /* Approve keeps its label: it promotes candidates and creates
                       hypotheses, and an icon-only control that writes is one
                       misclick from doing so. */
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-dense-meta"
                      disabled={approvingId !== null}
                      onClick={() => onApprove(row.id)}
                    >
                      <Check className="mr-0.5 size-3 shrink-0" />
                      {approvingId === row.id ? 'Approving…' : 'Approve'}
                    </Button>
                  ) : curatorTrace ? (
                    <span className="truncate text-dense-caption text-muted-foreground">
                      Curator: {String(curatorTrace.status ?? 'done')}
                    </span>
                  ) : null}
                  <IconActionButton
                    title={loopCopilotUi.viewPipeline(lang)}
                    ariaLabel={`${loopCopilotUi.viewPipeline(lang)} ${row.id}`}
                    onClick={() => onOpenPipeline(row.id)}
                  >
                    <Terminal className="size-3.5" />
                  </IconActionButton>
                  {awaiting ? (
                    <>
                      <IconActionButton
                        title={curatingId === row.id ? 'Curating…' : 'Curator'}
                        ariaLabel={`Curator ${row.id}`}
                        disabled={curatingId !== null}
                        onClick={() => onCurate(row.id)}
                      >
                        <Sparkles className="size-3.5" />
                      </IconActionButton>
                      <IconActionButton
                        title={loopCopilotUi.discuss(lang)}
                        ariaLabel={`${loopCopilotUi.discuss(lang)} ${row.id}`}
                        onClick={() =>
                          openLoopRunInCopilot({ runId: row.id, title: objectiveTitle, lang })
                        }
                      >
                        <MessageCircle className="size-3.5" />
                      </IconActionButton>
                    </>
                  ) : null}
                  {/* Offered on every run, including failed and completed ones:
                      those are exactly the rows that accumulate. */}
                  <IconActionButton
                    tone="danger"
                    title={
                      repeats.length > 0
                        ? `Delete this run and ${repeats.length} identical re-run(s) — also removes their candidates and pending drafts`
                        : 'Delete this run — also removes its candidates and pending drafts'
                    }
                    ariaLabel={
                      repeats.length > 0
                        ? `Delete run ${row.id} and ${repeats.length} re-runs`
                        : `Delete run ${row.id}`
                    }
                    disabled={deleteBusy}
                    onClick={() => onDelete({ run: row, repeats })}
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
  )
}
