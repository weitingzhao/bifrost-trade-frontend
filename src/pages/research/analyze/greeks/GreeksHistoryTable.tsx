import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableSubheadRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import type { GreeksRow } from '@/types/research'
import { dteFromTradeDate, fmtGreek, fmtIV, groupByExpiry } from './greeksFormat'
import { greeksDeltaCellClass, greeksIvCellClass } from './greeksUi'

type Props = {
  rows: GreeksRow[]
  tradeDate: string
  onRowHover: (row: GreeksRow | null, e: React.MouseEvent | null) => void
}

export function GreeksHistoryTable({ rows, tradeDate, onRowHover }: Props) {
  const grouped = groupByExpiry(rows)

  return (
    <DenseDataTable wrapClassName="rounded-lg border-border">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="normal-case tracking-normal">Expiry</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>DTE</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Strike</DenseTableHead>
          <DenseTableHead className="normal-case tracking-normal">C/P</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Mkt Price</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>IV</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Delta</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Gamma</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Theta/d</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Vega/1%</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {Array.from(grouped.entries()).map(([expiry, groupRows]) => {
          const dte = dteFromTradeDate(expiry, tradeDate)
          return (
            <Fragment key={expiry}>
              <DenseTableSubheadRow>
                <DenseTableCell colSpan={10}>
                  <strong className="font-mono">{expiry}</strong>
                  <DenseTag variant="info" size="pill" className="ml-2 font-mono">
                    {dte}d
                  </DenseTag>
                </DenseTableCell>
              </DenseTableSubheadRow>
              {groupRows.map((row, i) => (
                <DenseTableRow
                  key={`${row.expiry}-${row.strike}-${row.right}-${i}`}
                  className="cursor-default"
                  onMouseEnter={e => onRowHover(row, e)}
                  onMouseMove={e => onRowHover(row, e)}
                  onMouseLeave={() => onRowHover(null, null)}
                >
                  <DenseTableCell />
                  <DenseTableCell />
                  <DenseTableCell className={denseTableNumCell}>{row.strike.toFixed(1)}</DenseTableCell>
                  <DenseTableCell>
                    <DenseTag
                      variant={row.right.toUpperCase() === 'C' ? 'symbol' : 'category'}
                      size="cell"
                      className="min-w-[1.25rem] justify-center px-1"
                    >
                      {row.right.toUpperCase()}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{row.market_price.toFixed(2)}</DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, greeksIvCellClass(row.iv))}>
                    {fmtIV(row.iv)}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, greeksDeltaCellClass(row.delta))}>
                    {fmtGreek(row.delta, 3)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtGreek(row.gamma, 4)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtGreek(row.theta, 4)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtGreek(row.vega, 4)}</DenseTableCell>
                </DenseTableRow>
              ))}
            </Fragment>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
