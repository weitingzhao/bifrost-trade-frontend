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
import type { PortfolioAccountTable, PortfolioMetricRow } from '@/utils/accountsSnapshot'
import { sizingPortfolioNumEmphClass } from './sizingUi'

type Props = {
  table: PortfolioAccountTable
  maxDdPct: number
}

function EmphNum({ value, muted }: { value: number; muted?: boolean }) {
  return (
    <span className={muted ? `${sizingPortfolioNumEmphClass} opacity-85` : sizingPortfolioNumEmphClass}>
      {fmtUsd(value)}
    </span>
  )
}

function MetricCells({ row }: { row: PortfolioMetricRow }) {
  return (
    <>
      <DenseTableCell className={denseTableNumCell}>
        <EmphNum value={row.ibCash} />
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <EmphNum value={row.cashLike} />
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.cashTotal)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.positionsMv)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(row.netLiq)}</DenseTableCell>
      <DenseTableCell className={`${denseTableNumCell} w-[11.5rem] min-w-[11.5rem] max-w-[11.5rem]`}>
        <EmphNum value={row.maxDdUsd} />
      </DenseTableCell>
    </>
  )
}

function EmptyMetricCells() {
  return (
    <>
      <DenseTableCell className={denseTableNumCell}>
        <span className={`${sizingPortfolioNumEmphClass} opacity-85`}>—</span>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        <span className={`${sizingPortfolioNumEmphClass} opacity-85`}>—</span>
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
      <DenseTableCell className={`${denseTableNumCell} w-[11.5rem] min-w-[11.5rem] max-w-[11.5rem]`}>
        <span className={`${sizingPortfolioNumEmphClass} opacity-85`}>—</span>
      </DenseTableCell>
    </>
  )
}

export function WatchlistMetricTable({ table, maxDdPct }: Props) {
  const rows = [
    {
      label: 'Host',
      id: table.hostId,
      sub: table.hostId ? undefined : 'event_host / trading not set',
      data: table.hostRow,
    },
    {
      label: 'Secondary',
      id: table.secondaryId,
      sub: table.secondaryId ? undefined : 'event_secondary not set (optional)',
      data: table.secondaryRow,
    },
    {
      label: 'Total',
      id: undefined,
      sub: 'All accounts in snapshot',
      data: table.totalRow,
      total: true,
    },
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
          <DenseTableHead
            className={`${denseTableNumCell} w-[11.5rem] min-w-[11.5rem] max-w-[11.5rem]`}
          >
            Max DD @ {maxDdPct}%
          </DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map(row => (
          <DenseTableRow
            key={row.label}
            className={'total' in row && row.total ? 'border-t border-border/90 font-medium' : undefined}
          >
            <DenseTableCell>
              <div className="text-sm font-semibold">{row.label}</div>
              {row.id ? (
                <div className="font-mono text-[10px] text-muted-foreground">{row.id}</div>
              ) : row.sub ? (
                <div className="text-[10px] text-muted-foreground">{row.sub}</div>
              ) : null}
            </DenseTableCell>
            {row.data ? <MetricCells row={row.data} /> : <EmptyMetricCells />}
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
