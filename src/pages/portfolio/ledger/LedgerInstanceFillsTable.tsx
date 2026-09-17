import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import { oppositeLegSyncPayload } from './ledgerOppositeLeg'
import { LedgerBookingTagForFill } from './LedgerBookingTag'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { fmtPrice } from './ledgerFormat'
import { ledgerTableMinClass } from './ledgerTableFloors'
import type { OptGroupCallbacks } from './ledgerTypes'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtLedgerTradeDate } from './ledgerTradeDate'

function isBuy(ex: Execution): boolean {
  const s = (ex.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

export function LedgerInstanceFillsTable({
  fills,
  stockFills = [],
  onEdit,
  onDelete,
  onLinkStrategy,
  onLinkStock,
  syncingId,
  syncError,
  onSyncOpposite,
}: {
  fills: Execution[]
  stockFills?: Execution[]
} & OptGroupCallbacks) {
  return (
    <DenseDataTable wrapClassName="rounded-sm" tableClassName={ledgerTableMinClass.t2}>
      {/* Measured on DEV at the 820 floor: the five action buttons stay whole; Booking wraps. */}
      <colgroup>
        <col style={{ width: '21%' }} />
        <col style={{ width: '11%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '6%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '20%' }} />
        <col style={{ width: '18%' }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Date · account</DenseTableHead>
          <DenseTableHead>Source</DenseTableHead>
          <DenseTableHead>Side</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Comm.</DenseTableHead>
          <DenseTableHead>Booking</DenseTableHead>
          <DenseTableHead>Actions</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {fills.map(ex => {
          const buy = isBuy(ex)
          const q = Math.abs(ex.quantity ?? ex.qty)
          const oid = ex.account_executions_id
          const syncSrc = oppositeLegSyncPayload(fills, ex)
          const showSync = onSyncOpposite && oid != null && syncSrc != null
          return (
            <DenseTableRow key={oid ?? `${ex.time}-${ex.symbol}-${ex.price}`}>
              <DenseTableCell>
                <span className="font-mono text-foreground">{fmtLedgerTradeDate(ex.trade_date)}</span>
                {ex.account_id ? (
                  <span className="ml-1.5 font-mono text-dense-meta text-muted-foreground">
                    {ex.account_id}
                  </span>
                ) : null}
              </DenseTableCell>
              <DenseTableCell>
                <ExecSourceBadge source={ex.source} />
              </DenseTableCell>
              <DenseTableCell>
                <span className={cn('font-medium', buy ? 'text-side-buy' : 'text-side-sell')}>
                  {buy ? 'BUY' : 'SELL'}
                </span>
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>{q}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>{fmtPrice(ex.price)}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>
                {ex.commission != null ? fmtPrice(ex.commission) : '—'}
              </DenseTableCell>
              <DenseTableCell>
                <LedgerBookingTagForFill ex={ex} stockFills={stockFills} />
              </DenseTableCell>
              <DenseTableCell>
                <LedgerOptActionButtons
                  onLink={onLinkStrategy ? () => onLinkStrategy(ex, fills) : undefined}
                  onLinkStock={onLinkStock ? () => onLinkStock(ex) : undefined}
                  onEdit={onEdit ? () => onEdit(ex) : undefined}
                  onDelete={onDelete ? () => onDelete(ex) : undefined}
                  onSync={
                    showSync && syncSrc && onSyncOpposite
                      ? () => onSyncOpposite(ex, syncSrc)
                      : undefined
                  }
                  syncDisabled={oid != null && syncingId === oid}
                  syncSpinning={oid != null && syncingId === oid}
                  error={oid != null && syncError?.id === oid ? syncError.message : undefined}
                />
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
