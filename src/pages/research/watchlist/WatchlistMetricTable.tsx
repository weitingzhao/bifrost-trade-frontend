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
import { fmtUsd } from '@/utils/positions'
import type { PortfolioAccountTable } from '@/utils/accountsSnapshot'

type Props = {
  table: PortfolioAccountTable
  maxDdPct: number
}

export function WatchlistMetricTable({ table, maxDdPct }: Props) {
  const rows = [
    { label: 'Host', id: table.hostId, data: table.hostRow },
    { label: 'Secondary', id: table.secondaryId, data: table.secondaryRow },
    { label: 'Total', id: 'All accounts', data: table.totalRow, total: true },
  ] as const

  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Account</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Cash (IB)</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Cash-like</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Cash total</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Positions MV</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Net liq.</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Max DD @ {maxDdPct}%</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map(row => (
          <DenseTableRow
            key={row.label}
            className={'total' in row && row.total ? 'font-medium' : undefined}
          >
            <DenseTableCell>
              <div className="text-sm font-semibold">{row.label}</div>
              {row.id && (
                <div className="font-mono text-[10px] text-muted-foreground">{row.id}</div>
              )}
            </DenseTableCell>
            {row.data ? (
              <>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.ibCash)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.cashLike)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.cashTotal)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.positionsMv)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.netLiq)}</DenseTableCell>
                <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.data.maxDdUsd)}</DenseTableCell>
              </>
            ) : (
              <DenseTableCell colSpan={6} className="text-xs text-muted-foreground">
                —
              </DenseTableCell>
            )}
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
