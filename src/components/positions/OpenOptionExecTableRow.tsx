import { Pencil, Link2, Trash2 } from 'lucide-react'
import { fmtUsd, fmtDate, fmtDaysAgo } from '@/utils/positions'
import type { OpenOptionPosition, Execution } from '@/types/positions'

function execSourceBadge(source: string | null | undefined) {
  const s = (source ?? '').trim()
  if (!s) return <span className="replay-muted">—</span>
  const norm = s.toLowerCase()
  let cls = 'pos-opt-source-unknown'
  let label = s
  if (norm === 'flex' || norm === 'flex_trades') {
    cls = 'pos-opt-source-flex'
    label = 'flex'
  } else if (norm === 'tws_event' || norm === 'tws_client') {
    cls = 'pos-opt-source-tws'
    label = 'tws-client'
  }
  return (
    <span className={`pos-opt-source-badge ${cls}`} title={s}>
      {label}
    </span>
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
  posKey,
  exec,
  execIndex,
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
    <tr key={`${posKey}-exec-${book}-${exec.account_executions_id ?? execIndex}`} className="detail-execution-row">
      <td className="replay-opt-expand-col" />
      <td className="detail-exec-indent" colSpan={2}>
        <div className="detail-exec-line-primary">
          ↳ {bookLabel} exec #{exec.account_executions_id ?? '?'}
          {execInstanceId != null ? (
            <>
              {' '}
              <span className="replay-muted">·</span>{' '}
              <button
                type="button"
                className="detail-exec-strategy-link"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenStrategy?.(execInstanceId)
                }}
              >
                strategy #{execInstanceId}
              </button>
            </>
          ) : null}
        </div>
      </td>
      <td>{execSourceBadge(exec.source)}</td>
      <td />
      <td>
        {eSideLabel} {eQty || '—'}
      </td>
      <td>{fmtUsd(ePrice)}</td>
      <td />
      <td>
        {eTs != null && Number.isFinite(eTs) ? (
          <>
            {fmtDate(eTs)}
            {fmtDaysAgo(eTs) ? (
              <span className="replay-time-ago"> {fmtDaysAgo(eTs)}</span>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </td>
      <td>{eComm ? fmtUsd(eComm) : '—'}</td>
      <td className="replay-muted" />
      <td className="positions-opt-opp-hint-cell replay-muted">
        {exec.strategy_opportunity_name?.trim() || '—'}
      </td>
      <td className="replay-opt-actions-cell">
        <span className="replay-exec-row-actions">
          <button
            type="button"
            className="replay-exec-icon-btn"
            title="Edit"
            aria-label="Edit execution"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(exec)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {exec.account_executions_id != null && (
            <button
              type="button"
              className="replay-exec-icon-btn"
              title="Assign strategy"
              aria-label="Assign strategy"
              onClick={(e) => {
                e.stopPropagation()
                onLink(exec)
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
          )}
          {isOffTrack && onClose && (
            <button
              type="button"
              className="replay-exec-icon-btn"
              onClick={(e) => {
                e.stopPropagation()
                onClose(exec)
              }}
            >
              Close
            </button>
          )}
          <button
            type="button"
            className="replay-exec-icon-btn replay-exec-icon-btn--danger"
            title="Delete"
            aria-label="Delete execution"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(exec)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </td>
    </tr>
  )
}
