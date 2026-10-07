/**
 * Run now (ledger S14, Owner 2026-10-06): build one saved script's signals
 * without waiting for the 22:30 ET batch. A new or edited script is rebuilt
 * over its whole history, an unchanged one rewrites its recent sessions; the
 * line beside the button says where the latest run is.
 */
import { Button } from '@/components/ui/button'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { mono } from '@/components/research/labFaceUi'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { cn } from '@/lib/utils'
import type { PineRunJob } from '@/api/research/pine'
import type { usePineRun } from '@/hooks/usePineRun'

function clock(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** One line for a run: what it is doing, or what it did. */
export function pineRunLine(job: PineRunJob): string {
  if (job.status === 'running') return `Running since ${clock(job.started_at)} — a whole-history build takes about a minute`
  if (job.status === 'skipped') return `Skipped at ${clock(job.finished_at)} — ${job.message ?? 'another build of this script was running'}`
  if (job.status === 'failed') return `Failed at ${clock(job.finished_at)} — ${job.message ?? 'no reason given'}`
  const what = job.mode === 'rebuild' ? 'whole history' : 'recent sessions'
  const rows = (job.rows ?? 0).toLocaleString('en-US')
  return `Built at ${clock(job.finished_at)} · ${rows} signals written (${what})${job.message ? ` · ${job.message}` : ''}`
}

export function PineRunControl({
  run,
  active,
  canRun,
  blockedWhy,
}: {
  run: ReturnType<typeof usePineRun>
  /** Off scripts are not built — the button explains instead of running. */
  active: boolean
  canRun: boolean
  blockedWhy?: string
}) {
  const { job, start, busyWith } = run
  const running = job?.status === 'running' || start.isPending
  const gap = start.isError && !busyWith ? firstResearchAuthGapError(start.error) : null
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!canRun || !active || running}
        title={
          !canRun
            ? blockedWhy
            : !active
              ? 'Off — switch it on and save to build its signals'
              : 'Build this script’s signals now instead of at 22:30 ET'
        }
        onClick={() => start.mutate()}
      >
        {running ? 'Running…' : 'Run now'}
      </Button>
      {job ? (
        <span
          className={cn(mono, 'text-dense-caption', job.status === 'failed' ? 'text-destructive' : 'text-muted-foreground')}
          role="status"
        >
          {pineRunLine(job)}
        </span>
      ) : null}
      {busyWith ? (
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')} role="status">
          Another run is going ({busyWith.script_id}, since {clock(busyWith.started_at)}) — one at a time; try again when it ends
        </span>
      ) : gap ? (
        <ResearchAuthGap error={start.error} layout="banner" />
      ) : start.isError ? (
        <span className="text-dense-caption text-destructive">
          Not started — {start.error instanceof Error ? start.error.message : String(start.error)}
        </span>
      ) : null}
    </span>
  )
}
