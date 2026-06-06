import { cn } from '@/lib/utils'
import { fmtTradeDate, fmtUsd } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { OptionStockLink } from '@/types/trading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

type Props = {
  open: boolean
  title: string
  rows: OptionStockLink[]
  slippageTotal: number | null
  instanceAttributedSlippage?: number | null
  onClose: () => void
}

export function ViewOptionStockLinksModal({
  open,
  title,
  rows,
  slippageTotal,
  instanceAttributedSlippage,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] sm:max-w-[720px] gap-3">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Linked stock executions</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{title}</p>
        {slippageTotal != null && Number.isFinite(slippageTotal) && (
          <p className="text-xs text-muted-foreground">
            Total stock slippage vs close (signed qty × (price − close)):{' '}
            <strong className={cn('font-mono tabular-nums', pnlColorClass(slippageTotal))}>
              {fmtUsd(slippageTotal)}
            </strong>
          </p>
        )}
        {instanceAttributedSlippage != null && Number.isFinite(instanceAttributedSlippage) && (
          <p className="text-xs text-muted-foreground">
            <strong>This instance&apos;s attributed slippage</strong>{' '}
            (prorated by allocated |qty| ÷ parent |qty|):{' '}
            <strong className={cn('font-mono tabular-nums', pnlColorClass(instanceAttributedSlippage))}>
              {fmtUsd(instanceAttributedSlippage)}
            </strong>
          </p>
        )}
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No link rows.</p>
        ) : (
          <div className="max-h-[360px] overflow-y-auto overflow-x-hidden rounded-md border">
            <DenseDataTable tableClassName="w-full table-fixed">
              <colgroup>
                <col style={{ width: '4.5rem' }} />
                <col style={{ width: '4.75rem' }} />
                <col style={{ width: '3.25rem' }} />
                <col style={{ width: '5.5rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '4.25rem' }} />
                <col style={{ width: '4.25rem' }} />
                <col style={{ width: '4.75rem' }} />
                <col style={{ width: '4.5rem' }} />
              </colgroup>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead className="px-1.5">Link id</DenseTableHead>
                  <DenseTableHead className="px-1.5">Stock id</DenseTableHead>
                  <DenseTableHead className="px-1.5">Symbol</DenseTableHead>
                  <DenseTableHead className="px-1.5">Trade date</DenseTableHead>
                  <DenseTableHead className={cn(denseTableNumCell, 'px-1.5')}>Qty</DenseTableHead>
                  <DenseTableHead className={cn(denseTableNumCell, 'px-1.5')}>Price</DenseTableHead>
                  <DenseTableHead className={cn(denseTableNumCell, 'px-1.5')}>Close</DenseTableHead>
                  <DenseTableHead className={cn(denseTableNumCell, 'px-1.5')}>Slippage</DenseTableHead>
                  <DenseTableHead className="px-1.5">Role</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rows.map(row => (
                  <DenseTableRow key={row.link_id ?? `${row.stock_account_executions_id}-${row.option_account_executions_id}`}>
                    <DenseTableCell className="px-1.5 font-mono tabular-nums text-xs">
                      {row.link_id != null ? `#${row.link_id}` : '—'}
                    </DenseTableCell>
                    <DenseTableCell className="px-1.5 font-mono tabular-nums text-xs">
                      {row.stock_account_executions_id != null
                        ? `#${row.stock_account_executions_id}`
                        : '—'}
                    </DenseTableCell>
                    <DenseTableCell className="px-1.5 text-xs">{row.stock_symbol ?? '—'}</DenseTableCell>
                    <DenseTableCell className="px-1.5 font-mono tabular-nums text-xs whitespace-nowrap">
                      {row.stock_trade_date ? fmtTradeDate(row.stock_trade_date) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'px-1.5 text-xs')}>
                      {row.stock_quantity != null ? Number(row.stock_quantity) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'px-1.5 text-xs whitespace-nowrap')}>
                      {fmtUsd(row.stock_price)}
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, 'px-1.5 text-xs whitespace-nowrap')}>
                      {fmtUsd(row.stock_close_price)}
                    </DenseTableCell>
                    <DenseTableCell
                      className={cn(
                        denseTableNumCell,
                        'px-1.5 text-xs whitespace-nowrap',
                        row.slippage_vs_close != null ? pnlColorClass(row.slippage_vs_close) : undefined,
                      )}
                    >
                      {row.slippage_vs_close != null ? fmtUsd(row.slippage_vs_close) : '—'}
                    </DenseTableCell>
                    <DenseTableCell className="px-1.5 text-xs">{row.role ?? '—'}</DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
