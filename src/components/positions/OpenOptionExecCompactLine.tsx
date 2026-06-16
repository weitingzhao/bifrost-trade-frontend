import type { ReactNode } from 'react'
import { Pencil, Link2, Trash2, RefreshCw, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { IconActionButton, ExecSourceBadge, denseTable } from '@/components/data-display'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import type { OpenOptionPosition, Execution } from '@/types/positions'

const execDetailCell =
  'py-1.5 px-1 align-middle border-b border-dashed border-border/45 text-xs max-w-none overflow-visible'
const execDetailNumCell = cn(execDetailCell, 'font-mono tabular-nums whitespace-nowrap')

function execQty(exec: Execution): number {
  return Math.abs(Number(exec.quantity ?? exec.qty) || 0)
}

/** Self-aligned mini-table for execution fills (independent of parent Options columns). */
export function OpenOptionExecDetailTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full min-w-[36rem] table-fixed border-collapse text-dense-body [&_tr:last-child_td]:border-b-0">
      <colgroup>
        <col style={{ width: '24%' }} />
        <col style={{ width: '4.25rem' }} />
        <col style={{ width: '4.5rem' }} />
        <col style={{ width: '4.75rem' }} />
        <col style={{ width: '8.25rem' }} />
        <col style={{ width: '4.25rem' }} />
        <col style={{ width: '6.75rem' }} />
        <col />
        <col style={{ width: '5.75rem' }} />
      </colgroup>
      <tbody>{children}</tbody>
    </table>
  )
}

interface RowProps {
  pos: OpenOptionPosition
  exec: Execution
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

export function OpenOptionExecDetailRow({
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
}: RowProps) {
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
  const oppName = exec.strategy_opportunity_name?.trim()
  const syncFromLabel = book === 'final' ? 'TWS client book' : 'final book'

  return (
    <tr className="hover:bg-muted/20" onClick={e => e.stopPropagation()}>
      <td className={cn(execDetailCell, 'pl-2 align-top')}>
        <div className="leading-snug">
          <span className="text-muted-foreground">↳ </span>
          <span className="font-medium text-profit">{bookLabel}</span>
          <span className="text-foreground"> exec #{exec.account_executions_id ?? '?'}</span>
          {execInstanceId != null ? (
            <>
              <span className={denseTable.mutedMeta}> · </span>
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => onOpenStrategy?.(execInstanceId)}
              >
                strategy #{execInstanceId}
              </button>
            </>
          ) : null}
        </div>
        {showSync && onSync ? (
          <div className="mt-0.5 pl-3">
            <IconActionButton
              title={`Apply opportunity and strategy from the ${syncFromLabel} row`}
              ariaLabel={`Sync strategy attribution from ${syncFromLabel}`}
              disabled={syncBusy}
              onClick={onSync}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncBusy && 'animate-spin')} />
            </IconActionButton>
          </div>
        ) : null}
      </td>
      <td className={execDetailCell}>
        <ExecSourceBadge source={exec.source} />
      </td>
      <td className={execDetailNumCell}>
        {eSideLabel} {eQty || '—'}
      </td>
      <td className={execDetailNumCell}>{fmtUsd(ePrice)}</td>
      <td className={execDetailCell}>
        {eTs != null && Number.isFinite(eTs) ? (
          <>
            <div className="whitespace-nowrap font-mono">{fmtDate(eTs)}</div>
            {fmtDaysAgo(eTs) ? (
              <div className="font-semibold text-warning whitespace-nowrap">{fmtDaysAgo(eTs)}</div>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className={cn(execDetailNumCell, 'font-semibold', unrealizedPnlColorClass(eComm || null))}>
        {eComm ? fmtUsd(eComm) : '—'}
      </td>
      <td className={cn(execDetailNumCell, denseTable.mutedMeta)}>{exec.account_id || '—'}</td>
      <td className={cn(execDetailCell, 'min-w-0')}>
        {oppName ? (
          <span className="inline-flex min-w-0 max-w-full items-center gap-1">
            {execInstanceId != null ? (
              <button
                type="button"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                title={`View strategy #${execInstanceId}`}
                aria-label={`View strategy #${execInstanceId}`}
                onClick={() => onOpenStrategy?.(execInstanceId)}
              >
                <Square className="h-3 w-3" aria-hidden />
              </button>
            ) : null}
            <span className="truncate text-dense-meta" title={oppName}>
              {oppName}
            </span>
          </span>
        ) : (
          <span className={denseTable.mutedMeta}>—</span>
        )}
      </td>
      <td className={cn(execDetailCell, 'text-right')}>
        <span className="inline-flex shrink-0 items-center justify-end gap-0.5">
          <IconActionButton title="Edit" ariaLabel="Edit execution" onClick={() => onEdit(exec)}>
            <Pencil className="h-3.5 w-3.5" />
          </IconActionButton>
          {exec.account_executions_id != null && (
            <IconActionButton
              title="Assign strategy"
              ariaLabel="Assign strategy"
              onClick={() => onLink(exec)}
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
              onClick={() => onClose(exec)}
            >
              Close
            </Button>
          )}
          <IconActionButton title="Delete" ariaLabel="Delete execution" tone="danger" onClick={() => onDelete(exec)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconActionButton>
        </span>
      </td>
    </tr>
  )
}

/** @deprecated Use OpenOptionExecDetailRow inside OpenOptionExecDetailTable */
export const OpenOptionExecCompactLine = OpenOptionExecDetailRow
