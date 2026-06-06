import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { Button } from '@/components/ui/button'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GrandTotalRow,
  denseTableNumCell,
  denseTable,
} from '@/components/data-display'
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
import { CeleryQueueIconButton } from './CeleryQueueIconButton'
import {
  CELERY_QUEUE_ROW_FILTERED,
  CELERY_QUEUE_SUMMARY_COL_WIDTHS,
  celeryQueueSummaryMetaClass,
  celeryQueueSummaryPgClass,
  celeryQueueSummaryTableClass,
} from './celeryUi'

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
  mode: ActionMode
  onDeletePending: () => void
  onDeleteRunning: () => void
  onDeleteDone: () => void
  onDeleteFailed: () => void
  onResetFailed: () => void
  busy: boolean
  canOperate: boolean
}

function QueueActionCell({
  mode,
  onDeletePending,
  onDeleteRunning,
  onDeleteDone,
  onDeleteFailed,
  onResetFailed,
  busy,
  canOperate,
}: ActionCellProps) {
  const disabled = busy || !canOperate
  const deniedHint = !canOperate ? 'Requires operator role' : undefined

  function wrap(node: React.ReactNode) {
    if (deniedHint) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{node}</TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{deniedHint}</TooltipContent>
        </Tooltip>
      )
    }
    return node
  }

  if (mode === 'running') {
    return (
      <div className="flex items-center justify-end gap-1">
        {wrap(
          <CeleryQueueIconButton
            variant="delete-running"
            title="Delete all jobs with status running in this queue slice"
            aria-label="Delete all jobs with status running in this queue slice"
            disabled={disabled}
            onClick={onDeleteRunning}
          />,
        )}
      </div>
    )
  }

  if (mode === 'done') {
    return (
      <div className="flex items-center justify-end gap-1">
        {wrap(
          <CeleryQueueIconButton
            variant="delete-done"
            title="Delete all jobs with status done in this queue slice"
            aria-label="Delete all jobs with status done in this queue slice"
            disabled={disabled}
            onClick={onDeleteDone}
          />,
        )}
      </div>
    )
  }

  if (mode === 'failed') {
    return (
      <div className="flex items-center justify-end gap-1">
        {wrap(
          <CeleryQueueIconButton
            variant="delete-failed"
            title="Delete all jobs with status failed in this queue slice"
            aria-label="Delete all jobs with status failed in this queue slice"
            disabled={disabled}
            onClick={onDeleteFailed}
          />,
        )}
        {wrap(
          <CeleryQueueIconButton
            variant="refresh"
            title="Reset up to 500 oldest failed jobs to pending and re-queue Celery"
            aria-label="Reset failed jobs for this queue"
            disabled={disabled}
            onClick={onResetFailed}
          />,
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {wrap(
        <CeleryQueueIconButton
          variant="delete-pending"
          title="Delete all jobs with status pending in this queue slice"
          aria-label="Delete all jobs with status pending in this queue slice"
          disabled={disabled}
          onClick={onDeletePending}
        />,
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
  canOperate: boolean
  highlightQueueName?: string | null
  activeSupportTasksFilterKey?: string | null
  onNavigateToQueue?: (celeryQueue: string, status?: ActionMode) => void
  onNavigateQueueConsole?: (celeryQueue: string) => void
  onToggleSupportTasksFilter?: (brokerKey: string) => void
  onClearWorkerQueueFilter?: () => void
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
  canOperate,
  highlightQueueName,
  activeSupportTasksFilterKey,
  onNavigateToQueue,
  onNavigateQueueConsole,
  onToggleSupportTasksFilter,
  onClearWorkerQueueFilter,
  onDeletePending,
  onDeleteRunning,
  onDeleteDone,
  onDeleteFailed,
  onResetFailed,
}: CeleryQueueSummaryTableProps) {
  const [actionModeByQueue, setActionModeByQueue] = useState<Record<string, ActionMode>>({})

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

  function pgCountCell(n: number, mode: ActionMode, queue: string) {
    const active = n > 0
    const altHint = onNavigateQueueConsole
      ? ' (Alt+click: Console for this queue)'
      : ''
    return (
      <button
        type="button"
        className={cn(
          'w-full font-mono text-xs tabular-nums hover:underline',
          celeryQueueSummaryPgClass(mode, active),
        )}
        title={`Open Queues & Instances: ${mode} filter${altHint}`}
        onClick={e => {
          setActionModeByQueue(prev => ({ ...prev, [queue]: mode }))
          if (e.altKey && onNavigateQueueConsole) {
            e.preventDefault()
            onNavigateQueueConsole(queue)
            return
          }
          onNavigateToQueue?.(queue, mode)
        }}
      >
        {n}
      </button>
    )
  }

  function pgTotalCell(n: number, mode: ActionMode) {
    return (
      <span
        className={cn(
          'font-mono text-xs tabular-nums',
          celeryQueueSummaryPgClass(mode, n > 0),
        )}
      >
        {n}
      </span>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-1">
        <div className={celeryQueueSummaryMetaClass}>
          <span className="text-xs text-muted-foreground">
            R/C = Redis LLEN / Celery inspect · P/R/D/F = PostgreSQL · St. = consumer coverage
          </span>
          {dbConnected === false && (
            <span className="text-xs text-yellow-600">PostgreSQL unavailable</span>
          )}
        </div>
        <DenseDataTable tableClassName={celeryQueueSummaryTableClass}>
          <colgroup>
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.status }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.queue }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.broker }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.count }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.count }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.count }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.count }} />
            <col style={{ width: CELERY_QUEUE_SUMMARY_COL_WIDTHS.actions }} />
          </colgroup>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead className="w-8">St.</DenseTableHead>
              <DenseTableHead>Queue</DenseTableHead>
              <DenseTableHead align="right" className="w-20">R/C</DenseTableHead>
              <DenseTableHead align="right" className="w-14">P</DenseTableHead>
              <DenseTableHead align="right" className="w-14">R</DenseTableHead>
              <DenseTableHead align="right" className="w-14">D</DenseTableHead>
              <DenseTableHead align="right" className="w-14">F</DenseTableHead>
              <DenseTableHead className="w-36">Actions</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {merged.map(({ qs, agg }) => {
              const cov = queueCoverageLamp(qs.name, brokerConnected, workers)
              const busy = loading || busyQueue === qs.name
              const rowHighlighted = highlightQueueName != null && highlightQueueName === qs.name
              const actionMode: ActionMode = actionModeByQueue[qs.name] ?? 'pending'
              return (
                <DenseTableRow
                  key={qs.name}
                  className={cn(rowHighlighted && CELERY_QUEUE_ROW_FILTERED)}
                >
                  <DenseTableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {onNavigateQueueConsole ? (
                          <button
                            type="button"
                            className="inline-flex p-0.5 rounded hover:bg-muted/60 hover:scale-105 transition-transform"
                            aria-label={`Open console for queue ${qs.name}`}
                            onClick={() => onNavigateQueueConsole(qs.name)}
                          >
                            <StatusLamp lamp={cov.lamp} />
                          </button>
                        ) : (
                          <span>
                            <StatusLamp lamp={cov.lamp} />
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        {cov.title}
                        {onNavigateQueueConsole ? ' — click to open Console' : ''}
                      </TooltipContent>
                    </Tooltip>
                  </DenseTableCell>
                  <DenseTableCell>
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1">
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
                      {onToggleSupportTasksFilter && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant={activeSupportTasksFilterKey === qs.name ? 'default' : 'ghost'}
                              className="h-6 w-6 p-0 shrink-0"
                              aria-label={`Filter Support Tasks by ${queueDisplayName(qs)}`}
                              onClick={e => {
                                e.stopPropagation()
                                onToggleSupportTasksFilter(qs.name)
                              }}
                            >
                              <Filter className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Open Support Tasks and filter by this queue; click again to clear
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {loading ? '…' : `${fmtN(qs.pending_broker)}/${fmtN(qs.running_celery)}`}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {loading ? '…' : agg
                      ? pgCountCell(agg.counts.pending, 'pending', qs.name)
                      : <span className={denseTable.mutedMeta}>—</span>}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {loading ? '…' : agg
                      ? pgCountCell(agg.counts.running, 'running', qs.name)
                      : <span className={denseTable.mutedMeta}>—</span>}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {loading ? '…' : agg
                      ? pgCountCell(agg.counts.done, 'done', qs.name)
                      : <span className={denseTable.mutedMeta}>—</span>}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {loading ? '…' : agg
                      ? pgCountCell(agg.counts.failed, 'failed', qs.name)
                      : <span className={denseTable.mutedMeta}>—</span>}
                  </DenseTableCell>
                  <DenseTableCell>
                    {agg ? (
                      <QueueActionCell
                        mode={actionMode}
                        busy={busy}
                        canOperate={canOperate}
                        onDeletePending={() => void onDeletePending(agg)}
                        onDeleteRunning={() => void onDeleteRunning(agg)}
                        onDeleteDone={() => void onDeleteDone(agg)}
                        onDeleteFailed={() => void onDeleteFailed(agg)}
                        onResetFailed={() => void onResetFailed(agg)}
                      />
                    ) : (
                      <span className={denseTable.mutedMeta}>—</span>
                    )}
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}

            {merged.length > 0 && (
              <GrandTotalRow labelColSpan={2} label={
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-2">
                        <StatusLamp lamp={runtimeLamp} />
                        {onClearWorkerQueueFilter ? (
                          <button
                            type="button"
                            className="hover:underline"
                            title="Show all worker instances (clear queue filter)"
                            onClick={onClearWorkerQueueFilter}
                          >
                            Total
                          </button>
                        ) : (
                          'Total'
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{runtimeLampText}</TooltipContent>
                  </Tooltip>
                </>
              }>
                <DenseTableCell className={denseTableNumCell}>
                  {`${fmtN(totals?.pending_broker)}/${fmtN(totals?.running_celery)}`}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {pgTotalCell(pgTotals.pending, 'pending')}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {pgTotalCell(pgTotals.running, 'running')}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {pgTotalCell(pgTotals.done, 'done')}
                </DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>
                  {pgTotalCell(pgTotals.failed, 'failed')}
                </DenseTableCell>
                <DenseTableCell />
              </GrandTotalRow>
            )}
          </DenseTableBody>
        </DenseDataTable>
      </div>
    </TooltipProvider>
  )
}
