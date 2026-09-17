import { cn } from '@/lib/utils'
import type { Execution } from '@/types/positions'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { findOppositeLegAttributionSource, executionStrategyInstanceIds } from '@/utils/ledger/ledgerOptHelpers'
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

function isBuy(ex: Execution): boolean {
  const s = (ex.side ?? '').toUpperCase()
  return s === 'BUY' || s === 'BOT' || s === 'B'
}

export function LedgerInstanceFillsTable({
  fills,
  onEdit,
  onDelete,
  onLinkStrategy,
  onLinkStock,
  syncingId,
  syncError,
  onSyncOpposite,
}: {
  fills: Execution[]
} & OptGroupCallbacks) {
  return (
    <DenseDataTable wrapClassName="mt-1" tableClassName={ledgerTableMinClass.t2}>
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
          const peer = findOppositeLegAttributionSource(fills, ex)
          const showSync =
            onSyncOpposite &&
            oid != null &&
            peer != null &&
            (ex.strategy_instance_id == null || !Number.isFinite(Number(ex.strategy_instance_id)))
          return (
            <DenseTableRow key={oid ?? `${ex.time}-${ex.symbol}-${ex.price}`}>
              <DenseTableCell>
                <span className="font-mono text-foreground">{executionDateStr(ex)}</span>
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
                <LedgerBookingTagForFill ex={ex} />
              </DenseTableCell>
              <DenseTableCell>
                <LedgerOptActionButtons
                  onLink={onLinkStrategy ? () => onLinkStrategy(ex, fills) : undefined}
                  onLinkStock={onLinkStock ? () => onLinkStock(ex) : undefined}
                  onEdit={onEdit ? () => onEdit(ex) : undefined}
                  onDelete={onDelete ? () => onDelete(ex) : undefined}
                  onSync={
                    showSync && peer && onSyncOpposite
                      ? () =>
                          onSyncOpposite(ex, {
                            opportunity_id: Number(peer.strategy_opportunity_id),
                            instance_id: executionStrategyInstanceIds(peer)[0],
                          })
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
