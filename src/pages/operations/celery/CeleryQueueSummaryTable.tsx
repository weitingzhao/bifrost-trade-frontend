import { useMemo } from 'react'
import { Hourglass, Loader2, Trash2, XCircle, RotateCcw } from 'lucide-react'
import { StatusLamp } from '@/components/StatusLamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  QueueSummaryRow,
  WorkerSummary,
  AggregatedJobQueueSummaryRow,
} from '@/types/ops'
import { formatQueueLabel, brokerQueueKeyTitle } from '@/utils/celeryQueueLabels'
import { queueCoverageLamp, dedupedQueueSummaryTotals, type CeleryRuntimeLamp } from '@/utils/celeryRuntime'
import { dangerGhostBtnClass } from '@/lib/uiClasses'

type ActionMode = 'pending' | 'running' | 'done' | 'failed'

function fmtN(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return String(n)
}

function queueDisplayName(qs: QueueSummaryRow): string {
  const d = qs.display_name?.trim()
  if (d) return d
  return formatQueueLabel(qs.name)
}

// ── Icon action buttons ───────────────────────────────────────────────────────

interface ActionCellProps {
  onDeletePending: () => void
  onDeleteRunning: () => void
  onDeleteDone: () => void
  onDeleteFailed: () => void
  onResetFailed: () => void
  busy: boolean
}

function QueueActionCell({
  onDeletePending,
  onDeleteRunning,
  onDeleteDone,
  onDeleteFailed,
  onResetFailed,
  busy,
}: ActionCellProps) {
  function iconBtn(
    icon: React.ReactNode,
    title: string,
    onClick: () => void,
    extraClass = '',
  ) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={`h-6 w-6 p-0 ${extraClass}`}
            disabled={busy}
            onClick={onClick}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{title}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="flex items-center gap-0.5">
      {iconBtn(
        <Hourglass className="h-3 w-3" />,
        'Delete all pending',
        onDeletePending,
        dangerGhostBtnClass,
      )}
      {iconBtn(
        <Loader2 className="h-3 w-3" />,
        'Delete all running',
        onDeleteRunning,
        dangerGhostBtnClass,
      )}
      {iconBtn(
        <Trash2 className="h-3 w-3" />,
        'Delete all done',
        onDeleteDone,
        dangerGhostBtnClass,
      )}
      {iconBtn(
        <XCircle className="h-3 w-3" />,
        'Delete all failed',
        onDeleteFailed,
        dangerGhostBtnClass,
      )}
      {iconBtn(
        <RotateCcw className="h-3 w-3" />,
        'Retry failed (up to 500)',
        onResetFailed,
        'text-muted-foreground hover:text-primary',
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CeleryQueueSummaryTableProps {
  queueSummary: QueueSummaryRow[]
  aggregatedRows: AggregatedJobQueueSummaryRow[]
  dbConnected: boolean | null
  loading: boolean
  workers: WorkerSummary[]
  brokerConnected: boolean | undefined
  runtimeLamp: CeleryRuntimeLamp
  runtimeLampText: string
  busyQueue: string | null
  onNavigateToQueue?: (celeryQueue: string, status?: ActionMode) => void
  onDeletePending: (row: AggregatedJobQueueSummaryRow) => Promise<void>
  onDeleteRunning: (row: AggregatedJobQueueSummaryRow) => Promise<void>
  onDeleteDone: (row: AggregatedJobQueueSummaryRow) => Promise<void>
  onDeleteFailed: (row: AggregatedJobQueueSummaryRow) => Promise<void>
  onResetFailed: (row: AggregatedJobQueueSummaryRow) => Promise<void>
}

export function CeleryQueueSummaryTable({
  queueSummary,
  aggregatedRows,
  dbConnected,
  loading,
  workers,
  brokerConnected,
  runtimeLamp,
  runtimeLampText,
  busyQueue,
  onNavigateToQueue,
  onDeletePending,
  onDeleteRunning,
  onDeleteDone,
  onDeleteFailed,
  onResetFailed,
}: CeleryQueueSummaryTableProps) {
  const aggByQueue = useMemo(
    () => new Map(aggregatedRows.map(r => [r.celery_queue, r])),
    [aggregatedRows],
  )

  const merged = useMemo(() => {
    const seen = new Set<string>()
    const out: { qs: QueueSummaryRow; agg: AggregatedJobQueueSummaryRow | undefined }[] = []
    for (const qs of queueSummary) {
      seen.add(qs.name)
      out.push({ qs, agg: aggByQueue.get(qs.name) })
    }
    for (const agg of aggregatedRows) {
      if (seen.has(agg.celery_queue)) continue
      seen.add(agg.celery_queue)
      out.push({
        qs: {
          name: agg.celery_queue,
          display_name: '',
          pending_broker: 0,
          running_celery: 0,
          done_db: 0,
          failed_db: 0,
        },
        agg,
      })
    }
    return out
  }, [queueSummary, aggregatedRows, aggByQueue])

  const totals = queueSummary.length > 0 ? dedupedQueueSummaryTotals(queueSummary) : null
  const pgTotals = useMemo(() => {
    const z = { pending: 0, running: 0, done: 0, failed: 0 }
    for (const r of aggregatedRows) {
      z.pending += r.counts.pending
      z.running += r.counts.running
      z.done += r.counts.done
      z.failed += r.counts.failed
    }
    return z
  }, [aggregatedRows])

  function pgBadge(
    n: number,
    mode: ActionMode,
    queue: string,
    colorVariant: 'secondary' | 'default' | 'destructive',
  ) {
    const active = n > 0
    return (
      <button
        type="button"
        className="font-mono text-xs hover:underline"
        title={`Open ${mode} jobs for queue ${queue}`}
        onClick={() => onNavigateToQueue?.(queue, mode)}
      >
        {active
          ? <Badge variant={colorVariant}>{n}</Badge>
          : <span className="text-muted-foreground">0</span>}
      </button>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            R/C = Redis LLEN / Celery inspect · P/R/D/F = PostgreSQL · St. = consumer coverage
          </span>
          {dbConnected === false && (
            <span className="text-xs text-yellow-600">PostgreSQL unavailable</span>
          )}
        </div>
        <Table className="table-fixed text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">St.</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead className="text-right w-20">R/C</TableHead>
              <TableHead className="text-right w-14">P</TableHead>
              <TableHead className="text-right w-14">R</TableHead>
              <TableHead className="text-right w-14">D</TableHead>
              <TableHead className="text-right w-14">F</TableHead>
              <TableHead className="w-36">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merged.map(({ qs, agg }) => {
              const cov = queueCoverageLamp(qs.name, brokerConnected, workers)
              const busy = loading || busyQueue === qs.name
              return (
                <TableRow key={qs.name}>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <StatusLamp lamp={cov.lamp} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{cov.title}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div>
                      <button
                        type="button"
                        className="text-sm hover:underline text-left"
                        title={brokerQueueKeyTitle(qs.name)}
                        onClick={() => onNavigateToQueue?.(qs.name)}
                      >
                        {queueDisplayName(qs)}
                        {qs.db_totals_shared && (
                          <span
                            className="text-muted-foreground ml-0.5 text-[10px]"
                            title="DB totals shared with Massive aggregates"
                          >
                            *
                          </span>
                        )}
                      </button>
                      <p className="text-[10px] font-mono text-muted-foreground">{qs.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {loading ? '…' : `${fmtN(qs.pending_broker)}/${fmtN(qs.running_celery)}`}
                  </TableCell>
                  <TableCell className="text-right">
                    {loading ? '…' : agg
                      ? pgBadge(agg.counts.pending, 'pending', qs.name, 'secondary')
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {loading ? '…' : agg
                      ? pgBadge(agg.counts.running, 'running', qs.name, 'default')
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {loading ? '…' : agg ? agg.counts.done : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {loading ? '…' : agg
                      ? pgBadge(agg.counts.failed, 'failed', qs.name, 'destructive')
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {agg ? (
                      <QueueActionCell
                        busy={busy}
                        onDeletePending={() => void onDeletePending(agg)}
                        onDeleteRunning={() => void onDeleteRunning(agg)}
                        onDeleteDone={() => void onDeleteDone(agg)}
                        onDeleteFailed={() => void onDeleteFailed(agg)}
                        onResetFailed={() => void onResetFailed(agg)}
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Totals row */}
            {merged.length > 0 && (
              <TableRow className="border-t-2 font-medium bg-muted/30">
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <StatusLamp lamp={runtimeLamp} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{runtimeLampText}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {`${fmtN(totals?.pending_broker)}/${fmtN(totals?.running_celery)}`}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{pgTotals.pending}</TableCell>
                <TableCell className="text-right font-mono text-xs">{pgTotals.running}</TableCell>
                <TableCell className="text-right font-mono text-xs">{pgTotals.done}</TableCell>
                <TableCell className="text-right font-mono text-xs">{pgTotals.failed}</TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
