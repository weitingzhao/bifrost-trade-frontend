import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import { isOptionExpired } from '@/utils/ledger/optExecutionGroups'
import { adjustedRealizedPnlForOptGroup } from '@/utils/ledger/ledgerOptHelpers'
import { oppositeLegSyncPayload } from './ledgerOppositeLeg'
import { LedgerOptContractCell } from './LedgerOptContractCell'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtCcy, fmtPrice } from './ledgerFormat'
import type { OptGroupCallbacks } from './ledgerTypes'
import { ExecSourceBadge } from './ExecSourceBadge'
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import {
  DenseTableRow,
  DenseTableCell,
  ExpandToggleCell,
  DenseTableSubheadRow,
  DenseTableDetailRow,
  denseTableEntityCell,
  denseTableNumCell,
  IconActionButton,
} from '@/components/data-display'
export { ExecSourceBadge }

export function OptGroupRow({
  group, expanded, expired, showNetQty, linkByOptionId, onToggle, onEdit, onDelete,
  onLinkStrategy, onLinkStock, onViewLinks, onExpiredClose, syncingId, syncError, onSyncOpposite,
}: {
  group: OptExecutionGroup
  expanded: boolean
  expired: boolean
  showNetQty: boolean
  linkByOptionId?: Record<number, OptionStockLinkSummary>
  onToggle: () => void
} & OptGroupCallbacks) {
  const adjPnl = linkByOptionId ? adjustedRealizedPnlForOptGroup(group, linkByOptionId) : group.realized_pnl
  const stockAdj = adjPnl - group.realized_pnl
  const hasAdj = Math.abs(stockAdj) > 0.005

  return (
    <Fragment>
      <DenseTableRow className="cursor-pointer" onClick={onToggle}>
        <DenseTableCell className="w-8 p-0">
          <ExpandToggleCell expanded={expanded} onToggle={onToggle} label="Expand contract fills" />
        </DenseTableCell>
        <DenseTableCell className={denseTableEntityCell}>
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <LedgerOptContractCell
              group={group}
              linkByOptionId={linkByOptionId}
              onViewLinks={onViewLinks}
            />
            {group.expiry ? (
              <span className="text-dense-meta text-muted-foreground whitespace-nowrap">
                {group.expiry.replace(/-/g, '/')}
              </span>
            ) : null}
            {expired ? (
              <Badge variant="destructive" className="text-dense-micro px-1 py-0 h-4 shrink-0">
                EXP
              </Badge>
            ) : null}
          </span>
        </DenseTableCell>
        {!showNetQty && (
          <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
            {fmtPrice(group.buy_avg_price)}
          </DenseTableCell>
        )}
        {!showNetQty && (
          <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
            {fmtPrice(group.sell_avg_price)}
          </DenseTableCell>
        )}
        {showNetQty && (
          <DenseTableCell className={denseTableNumCell}>{group.net_qty.toFixed(0)}</DenseTableCell>
        )}
        <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
          {group.buy_volume + group.sell_volume}
        </DenseTableCell>
        <DenseTableCell className={cn(denseTableNumCell, 'font-medium', pnlColorClass(adjPnl))}>
          {fmtCcy(adjPnl)}
          {hasAdj && (
            <span className="ml-1 text-dense-meta text-link">
              {stockAdj >= 0 ? '+' : ''}
              {fmtCcy(stockAdj)}
            </span>
          )}
        </DenseTableCell>
        <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
          {group.trades.length}
        </DenseTableCell>
      </DenseTableRow>

      {expanded && (
        <DenseTableSubheadRow>
          <DenseTableCell />
          <DenseTableCell>Date / Time</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>Side</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>Qty</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>Price</DenseTableCell>
          {!showNetQty && (
            <DenseTableCell className={denseTableNumCell}>PnL</DenseTableCell>
          )}
          <DenseTableCell className={denseTableNumCell}>Actions</DenseTableCell>
        </DenseTableSubheadRow>
      )}

      {expanded &&
        group.trades.map(t => {
          const oid = t.account_executions_id
          const linkCount =
            oid != null && linkByOptionId ? (linkByOptionId[oid]?.links?.length ?? 0) : 0
          const oppSrc = oppositeLegSyncPayload(group.trades, t)
          const tSide = (t.side ?? '').toUpperCase()
          const isBuy = tSide === 'BUY' || tSide === 'BOT' || tSide === 'B'
          const isSyncing = oid != null && syncingId === oid
          const q = Math.abs(t.quantity ?? t.qty)
          const p = Number(t.price) || 0
          const c = Number(t.commission) || 0
          const fillPnl = isBuy ? -(q * p * 100 - c) : q * p * 100 - c

          return (
            <DenseTableDetailRow key={oid ?? `${t.time}-${t.price}`}>
              <DenseTableCell />
              <DenseTableCell className="font-mono text-muted-foreground pl-6">
                <span>{executionDateStr(t)}</span>
                {linkCount > 0 && (
                  <button
                    type="button"
                    className="ml-2 text-dense-meta text-link hover:underline"
                    onClick={ev => {
                      ev.stopPropagation()
                      if (oid != null && onViewLinks) onViewLinks({ title: `Fill #${oid} — stock links`, oid })
                    }}
                  >
                    L{linkCount}
                  </button>
                )}
                {t.account_id && <span className="ml-2 text-muted-foreground/60">{t.account_id}</span>}
                <ExecSourceBadge source={t.source} />
              </DenseTableCell>
              <DenseTableCell className={cn(denseTableNumCell, 'text-center')}>
                <span
                  className={cn(
                    'font-medium',
                    isBuy ? 'text-side-buy' : 'text-side-sell',
                  )}
                >
                  {isBuy ? 'BUY' : 'SELL'}
                </span>
              </DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>{q}</DenseTableCell>
              <DenseTableCell className={denseTableNumCell}>{fmtPrice(p)}</DenseTableCell>
              {!showNetQty && (
                <DenseTableCell className={cn(denseTableNumCell, pnlColorClass(fillPnl))}>
                  {fmtCcy(fillPnl)}
                </DenseTableCell>
              )}
              <DenseTableCell className={denseTableNumCell}>
                <div onClick={ev => ev.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                  {onExpiredClose && isOptionExpired(group.expiry) && (
                    <IconActionButton
                      onClick={() => onExpiredClose(t, group.net_qty)}
                      title="Write expiry close"
                      ariaLabel="Write expiry close"
                      tone="warn"
                      size="dense"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </IconActionButton>
                  )}
                  <LedgerOptActionButtons
                    onSync={
                      oppSrc && onSyncOpposite
                        ? () => onSyncOpposite(t, oppSrc)
                        : undefined
                    }
                    syncDisabled={isSyncing}
                    syncSpinning={isSyncing}
                    error={oid != null && syncError?.id === oid ? syncError.message : undefined}
                    onLink={onLinkStrategy ? () => onLinkStrategy(t, group.trades) : undefined}
                    onLinkStock={onLinkStock ? () => onLinkStock(t) : undefined}
                    onEdit={onEdit ? () => onEdit(t) : undefined}
                    onDelete={onDelete ? () => onDelete(t) : undefined}
                  />
                </div>
              </div>
              </DenseTableCell>
            </DenseTableDetailRow>
          )
        })}
    </Fragment>
  )
}
