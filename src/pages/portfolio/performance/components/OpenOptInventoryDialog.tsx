import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableHead,
  DenseTableCell,
  denseTableNumCell,
  denseTableEntityCell,
} from '@/components/data-display'
import { unrealizedPnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/lib/format'
import {
  aggregateOpenOptLegsByContract,
  filterOpenOptCashLegsByOpenMonth,
  type OpenOptCashLeg,
} from '@/utils/ledger/optAsOfPnL'
import { optionRightToFull } from '@/utils/ledger/performanceUtils'

function contractLabel(row: {
  symbol: string
  expiry: string | null
  strike: number | null
  optionRight: string | null
}): string {
  const right = optionRightToFull(row.optionRight)
  const strike = row.strike != null ? String(row.strike) : '—'
  const expiry = row.expiry ?? '—'
  return [row.symbol, expiry, strike, right !== '—' ? right : ''].filter(Boolean).join(' ')
}

export default function OpenOptInventoryDialog({
  open,
  onClose,
  monthLabel,
  monthKey,
  asOfDateStr,
  legs,
}: {
  open: boolean
  onClose: () => void
  monthLabel: string
  monthKey: string
  asOfDateStr: string
  legs: OpenOptCashLeg[]
}) {
  const monthLegs = filterOpenOptCashLegsByOpenMonth(legs, monthKey)
  const rows = aggregateOpenOptLegsByContract(monthLegs)
  const totalCash = rows.reduce((s, r) => s + r.cash, 0)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">
            Open option inventory — {monthLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground mb-2">
          Still-unmatched option premium as of {asOfDateStr} (Chicago), opened in this month.
          Premium cash / FIFO inventory — not mark-to-market. Contracts expired on or before
          the as-of date are excluded (Flex often has no expiry close).
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Contracts: {rows.length}
          {' · '}
          Open cash:{' '}
          <span className={`font-semibold tabular-nums ${unrealizedPnlColorClass(totalCash)}`}>
            {fmtUsd(totalCash)}
          </span>
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No still-open option contracts for this month.</p>
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <DenseDataTable>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Contract</DenseTableHead>
                  <DenseTableHead>Side</DenseTableHead>
                  <DenseTableHead className="text-right">Open qty</DenseTableHead>
                  <DenseTableHead>Opened</DenseTableHead>
                  <DenseTableHead className="text-right">Open cash</DenseTableHead>
                  <DenseTableHead>Account</DenseTableHead>
                  <DenseTableHead className="text-right">Fills</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rows.map((row) => (
                  <DenseTableRow key={`${row.accountId}|${row.contractKey}|${row.side}`}>
                    <DenseTableCell className={denseTableEntityCell}>
                      <span className="font-mono text-entity-option font-semibold">
                        {contractLabel(row)}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell>{row.side || '—'}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>
                      {row.unmatchedQty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </DenseTableCell>
                    <DenseTableCell className="tabular-nums text-muted-foreground">
                      {row.openDateStr}
                    </DenseTableCell>
                    <DenseTableCell className={`${denseTableNumCell} ${unrealizedPnlColorClass(row.cash)}`}>
                      {fmtUsd(row.cash)}
                    </DenseTableCell>
                    <DenseTableCell className="tabular-nums text-muted-foreground">
                      {row.accountId || '—'}
                    </DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{row.fillCount}</DenseTableCell>
                  </DenseTableRow>
                ))}
              </DenseTableBody>
            </DenseDataTable>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
