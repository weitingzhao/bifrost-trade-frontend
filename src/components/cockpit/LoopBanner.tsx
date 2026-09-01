import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, MessageCircle, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  loopCopilotUi,
  loopPipelinePath,
  openCopilotInbox,
  openLoopRunInCopilot,
} from '@/lib/harness/loopCopilotPrefill'
import {
  useAwaitingRuns,
  useCurateRun,
  useActiveObjectives,
} from '@/hooks/useLoopHarness'
import { useCopilotPromptLang } from '@/lib/copilot/promptLang'
import { cn } from '@/lib/utils'

const MAX_ROWS = 3

/**
 * Loop harness banner (Wave HC-2).
 *
 * Surfaces awaiting_approval runs above the Copilot message list — same
 * pattern as InboxBanner. Renders nothing when no runs are waiting.
 */
export function LoopBanner({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [lang] = useCopilotPromptLang()
  const awaitingQ = useAwaitingRuns()
  const objectivesQ = useActiveObjectives()
  const curate = useCurateRun()

  const objectiveTitleById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objectivesQ.data?.items ?? []) map.set(o.id, o.title)
    return map
  }, [objectivesQ.data?.items])

  const rows = awaitingQ.data?.items ?? []
  const count = awaitingQ.data?.count ?? rows.length

  if (awaitingQ.isError) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5',
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-dense-meta text-destructive">
          {awaitingQ.error instanceof Error
            ? awaitingQ.error.message
            : lang === 'zh'
              ? '加载 Loop runs 失败'
              : 'Failed to load loop runs'}
        </span>
        <button
          type="button"
          className="shrink-0 text-dense-meta text-primary underline"
          onClick={() => void awaitingQ.refetch()}
        >
          {lang === 'zh' ? '重试' : 'Retry'}
        </button>
      </div>
    )
  }

  if (!awaitingQ.isLoading && count === 0) return null

  return (
    <div
      className={cn(
        'rounded-md border border-warning/40 bg-warning/5',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-left',
          'text-dense-label text-foreground hover:bg-warning/10',
          open ? 'rounded-t-md' : 'rounded-md',
        )}
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0 text-warning" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-warning" aria-hidden />
        )}
        <RefreshCw className="size-3.5 shrink-0 text-warning" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">
          {loopCopilotUi.awaitingBanner(lang, count, awaitingQ.isLoading)}
        </span>
        <span className="shrink-0 text-dense-caption text-muted-foreground">
          {loopCopilotUi.review(lang, open)}
        </span>
      </button>

      {open ? (
        <div className="max-h-72 space-y-2 overflow-y-auto border-t border-warning/20 px-2 py-2">
          {awaitingQ.isLoading ? (
            <p className="text-dense-meta text-muted-foreground">
              {lang === 'zh' ? '加载中…' : 'Loading…'}
            </p>
          ) : (
            rows.slice(0, MAX_ROWS).map((run) => {
              const title =
                objectiveTitleById.get(run.objective_id) ?? run.objective_id
              const curating = curate.isPending && curate.variables === run.id
              return (
                <div
                  key={run.id}
                  className="space-y-1.5 rounded border border-border/60 bg-card px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-dense-label font-medium">{title}</p>
                    <p className="truncate font-mono text-dense-caption text-muted-foreground">
                      {run.id}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 min-w-[7rem] flex-1 px-2 text-dense-meta"
                      onClick={() =>
                        openLoopRunInCopilot({ runId: run.id, title, lang })
                      }
                    >
                      <MessageCircle className="mr-1 size-3 shrink-0" />
                      {loopCopilotUi.discussShort(lang)}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 min-w-[5rem] flex-1 px-2 text-dense-meta"
                      asChild
                    >
                      <Link to={loopPipelinePath(run.id)}>
                        {loopCopilotUi.viewPipeline(lang)}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 min-w-[5rem] flex-1 px-2 text-dense-meta"
                      disabled={curating || curate.isPending}
                      onClick={() => void curate.mutateAsync(run.id)}
                    >
                      <Sparkles className="mr-1 size-3 shrink-0" />
                      {loopCopilotUi.curator(lang, curating)}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-dense-meta"
                      onClick={() => openCopilotInbox()}
                    >
                      {loopCopilotUi.inbox(lang)}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
          {count > MAX_ROWS ? (
            <p className="text-center text-dense-caption text-muted-foreground">
              {loopCopilotUi.moreInHarness(lang, count - MAX_ROWS)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
