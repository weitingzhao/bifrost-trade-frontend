import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { cn } from '@/lib/utils'
import {
  countActiveRefJobs,
  formatRefJobIdShort,
  isRefJobTerminal,
  refJobKindDisplayLabel,
  summarizeRefJobResult,
  type RefJobTrackItem,
} from '@/utils/massive/stockReferenceJobHelpers'

function statusTone(status: string, streamError?: string): 'ok' | 'err' | 'run' {
  if (streamError) return 'err'
  const s = (status || '').toLowerCase()
  if (s === 'failed') return 'err'
  if (s === 'done') return 'ok'
  return 'run'
}

function statusBadgeVariant(tone: 'ok' | 'err' | 'run'): 'default' | 'destructive' | 'secondary' {
  if (tone === 'ok') return 'default'
  if (tone === 'err') return 'destructive'
  return 'secondary'
}

function formatEnqueueTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
  } catch {
    return '—'
  }
}

export function TickerReferenceJobsSheet({
  open,
  onClose,
  items,
  onClearCompleted,
  onClearAll,
}: {
  open: boolean
  onClose: () => void
  items: RefJobTrackItem[]
  onClearCompleted: () => void
  onClearAll: () => void
}) {
  const activeN = countActiveRefJobs(items)
  const hasCompleted = items.some(isRefJobTerminal)
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.enqueuedAt - a.enqueuedAt),
    [items],
  )

  return (
    <Sheet open={open} onOpenChange={next => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-3 overflow-hidden p-4',
          /* Override Sheet defaults (w-3/4 + data-[side=right]:sm:max-w-sm ≈ 384px). */
          'data-[side=right]:w-[min(52rem,92vw)]',
          'data-[side=right]:max-w-[min(52rem,92vw)]',
          'data-[side=right]:sm:max-w-[min(52rem,92vw)]',
        )}
      >
        <SheetHeader className="flex-row items-start justify-between gap-2 space-y-0 pr-0">
          <div className="min-w-0 space-y-1">
            <SheetTitle id="ref-jobs-sheet-title">PostgreSQL sync jobs</SheetTitle>
            <SheetDescription>
              Session-only tracking. Updates via job stream.
            </SheetDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </SheetHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearCompleted}
            disabled={!hasCompleted}
          >
            Clear completed
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearAll}
            disabled={items.length === 0}
          >
            Clear all
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-card max-h-[min(60vh,32rem)]">
          {sorted.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Enqueue a job to see status here.
            </p>
          ) : (
            <DenseDataTable
              wrapClassName="min-w-0 overflow-x-hidden border-0"
              tableClassName="min-w-0"
            >
              <colgroup>
                <col style={{ width: '17%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '6%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Time</DenseTableHead>
                  <DenseTableHead>Kind</DenseTableHead>
                  <DenseTableHead>Status</DenseTableHead>
                  <DenseTableHead>Dedup</DenseTableHead>
                  <DenseTableHead>Job ID</DenseTableHead>
                  <DenseTableHead>Summary</DenseTableHead>
                  <DenseTableHead>Details</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {sorted.map(item => {
                  const tone = statusTone(item.streamError ? 'failed' : item.status, item.streamError)
                  const statusLabel = item.streamError ? 'failed' : item.status
                  return (
                    <DenseTableRow key={item.jobId}>
                      <DenseTableCell className="whitespace-nowrap tabular-nums text-xs">
                        {formatEnqueueTime(item.enqueuedAt)}
                      </DenseTableCell>
                      <DenseTableCell className="text-xs">
                        {refJobKindDisplayLabel(item)}
                      </DenseTableCell>
                      <DenseTableCell>
                        <Badge
                          variant={statusBadgeVariant(tone)}
                          className="text-dense-caption font-normal capitalize"
                          title="Job status"
                        >
                          {statusLabel}
                        </Badge>
                        {item.streamError ? (
                          <p className="mt-1 text-dense-caption text-destructive" role="alert">
                            {item.streamError}
                          </p>
                        ) : null}
                      </DenseTableCell>
                      <DenseTableCell className="text-xs text-muted-foreground">
                        {item.deduplicated ? 'Yes' : '—'}
                      </DenseTableCell>
                      <DenseTableCell>
                        <div className="flex flex-col gap-1">
                          <code
                            className="truncate font-mono text-dense-caption"
                            title={item.jobId}
                          >
                            {formatRefJobIdShort(item.jobId)}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-dense-caption"
                            onClick={() => {
                              void navigator.clipboard?.writeText(item.jobId).catch(() => {})
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </DenseTableCell>
                      <DenseTableCell
                        className={cn('text-xs', denseTable.detailCellClip)}
                        title={summarizeRefJobResult(item.job)}
                      >
                        <span className={denseTable.detailRowLabel}>
                          {summarizeRefJobResult(item.job)}
                        </span>
                      </DenseTableCell>
                      <DenseTableCell>
                        {item.job?.result != null ? (
                          <details className="text-xs">
                            <summary className="cursor-pointer select-none">JSON</summary>
                            <pre
                              className="mt-1 max-h-40 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-dense-caption"
                              tabIndex={0}
                            >
                              {typeof item.job.result === 'string'
                                ? item.job.result
                                : JSON.stringify(item.job.result, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </DenseTableCell>
                    </DenseTableRow>
                  )
                })}
              </DenseTableBody>
            </DenseDataTable>
          )}
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          {activeN > 0 ? `${activeN} active` : 'No active jobs'}
          {' · '}
          <Link
            to="/operations/celery"
            className="text-primary underline-offset-4 hover:underline"
            onClick={onClose}
          >
            Full queue: Celery
          </Link>
        </p>
      </SheetContent>
    </Sheet>
  )
}
