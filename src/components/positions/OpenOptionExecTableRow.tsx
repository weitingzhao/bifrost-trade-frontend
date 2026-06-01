import { Pencil, Link2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DenseTableRow,
  DenseTableCell,
  IconActionButton,
  denseTable,
} from '@/components/data-display'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import type { OpenOptionPosition, Execution } from '@/types/positions'

function ExecSourceBadge({ source }: { source: string | null | undefined }) {
  const s = (source ?? '').trim()
  if (!s) return <span className={denseTable.mutedMeta}>—</span>
  const norm = s.toLowerCase()
  let label = s
  let className = 'border-border text-muted-foreground'
  if (norm === 'flex' || norm === 'flex_trades') {
    label = 'flex'
    className = 'border-sky-500/40 text-sky-600 dark:text-sky-400'
  } else if (norm === 'tws_event' || norm === 'tws_client') {
    label = 'tws-client'
    className = 'border-violet-500/40 text-violet-600 dark:text-violet-400'
  }
  return (
    <Badge variant="outline" className={cn('text-[length:var(--text-dense-meta)] px-1.5 py-0 font-normal', className)} title={s}>
      {label}
    </Badge>
  )
}

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
}

export function OpenOptionExecTableRow({
  pos,
  exec,
  book,
  onEdit,
  onLink,
  onDelete,
  onClose,
  onOpenStrategy,
}: Props) {
  const es = (exec.side ?? '').toUpperCase()
  const eSideLabel =
    es === 'BUY' || es === 'BOT' || es === 'B'
      ? 'Buy'
      : es === 'SELL' || es === 'SLD' || es === 'S'
        ? 'Sell'
        : (exec.side ?? '—')
  const eQty = Math.abs(Number(exec.quantity) || 0)
  const ePrice = Number(exec.price) || 0
  const eComm = Number(exec.commission) || 0
  const eTs = exec.time != null ? Number(exec.time) : null
  const bookLabel = book === 'final' ? '[Final]' : '[TWS client]'
  const execInstanceId = exec.strategy_instance_id
  const isOffTrack = pos.kind === 'offtrack'

  return (
    <DenseTableRow className="bg-secondary/15">
      <DenseTableCell className="w-9">{null}</DenseTableCell>
      <DenseTableCell colSpan={2} className="pl-6">
        <div className="text-[length:var(--text-dense)]">
          ↳ {bookLabel} exec #{exec.account_executions_id ?? '?'}
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
      <DenseTableCell>
        {eTs != null && Number.isFinite(eTs) ? (
          <>
            {fmtDate(eTs)}
            {fmtDaysAgo(eTs) ? (
              <span className={cn('ml-1', denseTable.mutedMeta)}>{fmtDaysAgo(eTs)}</span>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </DenseTableCell>
      <DenseTableCell className="font-mono tabular-nums">{eComm ? fmtUsd(eComm) : '—'}</DenseTableCell>
      <DenseTableCell className={denseTable.mutedMeta}>{null}</DenseTableCell>
      <DenseTableCell className={cn('max-w-[8.5rem] truncate', denseTable.mutedMeta)}>
        {exec.strategy_opportunity_name?.trim() || '—'}
      </DenseTableCell>
      <DenseTableCell>
        <span className="inline-flex items-center gap-0.5">
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
    </DenseTableRow>
  )
}
