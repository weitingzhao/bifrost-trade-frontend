import { Pencil, Link2, Trash2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DenseTableDetailRow,
  DenseTableCell,
  IconActionButton,
  ExecSourceBadge,
  DenseOptionCategoryLabel,
  denseTable,
  denseTableEntityCell,
} from '@/components/data-display'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import type { OpenOptionPosition, Execution } from '@/types/positions'

interface Props {
  pos: OpenOptionPosition
  posKey: string
  exec: Execution
  execIndex: number
  book: 'final' | 'tws'
  onEdit: (exec: Execution) => void
  onLink: (exec: Execution) => void
  onDelete: (exec: Execution) => void
  onClose?: (exec: Execution) => void
  onOpenStrategy?: (instanceId: number) => void
  showSync?: boolean
  syncBusy?: boolean
  onSync?: () => void
}

function execQty(exec: Execution): number {
  return Math.abs(Number(exec.quantity ?? exec.qty) || 0)
}

/** Column-aligned execution row for the Options tab (13 columns). */
export function OpenOptionExecTableRow({
  pos,
  exec,
  book,
  onEdit,
  onLink,
  onDelete,
  onClose,
  onOpenStrategy,
  showSync = false,
  syncBusy = false,
  onSync,
}: Props) {
  const es = (exec.side ?? '').toUpperCase()
  const eSideLabel =
    es === 'BUY' || es === 'BOT' || es === 'B'
      ? 'Buy'
      : es === 'SELL' || es === 'SLD' || es === 'S'
        ? 'Sell'
        : (exec.side ?? '—')
  const eQty = execQty(exec)
  const ePrice = Number(exec.price) || 0
  const eComm = Number(exec.commission) || 0
  const eTs = exec.time != null ? Number(exec.time) : null
  const bookLabel = book === 'final' ? '[Final]' : '[TWS client]'
  const execInstanceId = exec.strategy_instance_id
  const isOffTrack = pos.kind === 'offtrack'

  const execLabel = `↳ ${bookLabel} exec #${exec.account_executions_id ?? '?'}`
  const execTitle =
    execInstanceId != null ? `${execLabel} · strategy #${execInstanceId}` : execLabel

  const syncFromLabel = book === 'final' ? 'TWS client book' : 'final book'

  return (
    <DenseTableDetailRow>
      <DenseTableCell className={denseTable.expandColCell}>{null}</DenseTableCell>
      <DenseTableCell colSpan={2} className={cn('pl-6', denseTable.detailCellClip)}>
        <div className="flex flex-col gap-0.5">
          <div className={denseTable.detailRowLabel} title={execTitle}>
            {execLabel}
            {execInstanceId != null ? (
              <>
                {' '}
                <span className={denseTable.mutedMeta}>·</span>{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={e => {
                    e.stopPropagation()
                    onOpenStrategy?.(execInstanceId)
                  }}
                >
                  strategy #{execInstanceId}
                </button>
              </>
            ) : null}
          </div>
          {showSync && onSync ? (
            <div className="pl-4">
              <IconActionButton
                title={`Apply opportunity and strategy from the ${syncFromLabel} row`}
                ariaLabel={`Sync strategy attribution from ${syncFromLabel}`}
                disabled={syncBusy}
                onClick={e => {
                  e.stopPropagation()
                  onSync()
                }}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', syncBusy && 'animate-spin')} />
              </IconActionButton>
            </div>
          ) : null}
        </div>
      </DenseTableCell>
      <DenseTableCell>
        <ExecSourceBadge source={exec.source} />
      </DenseTableCell>
      <DenseTableCell>{null}</DenseTableCell>
      <DenseTableCell>
        {eSideLabel} {eQty || '—'}
      </DenseTableCell>
      <DenseTableCell className="font-mono tabular-nums">{fmtUsd(ePrice)}</DenseTableCell>
      <DenseTableCell>{null}</DenseTableCell>
      <DenseTableCell>{null}</DenseTableCell>
      <DenseTableCell>
        {eTs != null && Number.isFinite(eTs) ? (
          <>
            <div className="whitespace-nowrap">{fmtDate(eTs)}</div>
            {fmtDaysAgo(eTs) ? (
              <div
                className={cn(
                  'text-dense-meta font-semibold text-warning whitespace-nowrap',
                )}
              >
                {fmtDaysAgo(eTs)}
              </div>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell
        className={cn(
          'font-mono tabular-nums',
          denseTable.detailCellClip,
          unrealizedPnlColorClass(eComm || null),
        )}
      >
        {eComm ? fmtUsd(eComm) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableEntityCell, denseTable.mutedMeta)}>
        {exec.strategy_opportunity_name?.trim() ? (
          <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
            {exec.strategy_opportunity_name.trim()}
          </DenseOptionCategoryLabel>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <IconActionButton
            title="Edit"
            ariaLabel="Edit execution"
            onClick={e => {
              e.stopPropagation()
              onEdit(exec)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </IconActionButton>
          {exec.account_executions_id != null && (
            <IconActionButton
              title="Assign strategy"
              ariaLabel="Assign strategy"
              onClick={e => {
                e.stopPropagation()
                onLink(exec)
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
            </IconActionButton>
          )}
          {isOffTrack && onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={e => {
                e.stopPropagation()
                onClose(exec)
              }}
            >
              Close
            </Button>
          )}
          <IconActionButton
            title="Delete"
            ariaLabel="Delete execution"
            tone="danger"
            onClick={e => {
              e.stopPropagation()
              onDelete(exec)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconActionButton>
        </span>
      </DenseTableCell>
    </DenseTableDetailRow>
  )
}
