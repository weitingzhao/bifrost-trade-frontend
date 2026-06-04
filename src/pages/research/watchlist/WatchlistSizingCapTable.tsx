import { cn } from '@/lib/utils'
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
import { sizingCapRowFocusClass } from './sizingUi'

type CapRow = {
  key: string
  label: string
  maxRiskUsd: number | null
  maxShares: number | null
}

type Props = {
  capRows: CapRow[]
  cashCapShares: number | null
  availableMinShares: number | null
}

export function WatchlistSizingCapTable({ capRows, cashCapShares, availableMinShares }: Props) {
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Source</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Max $ at risk</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Max shares</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {capRows.map(row => (
          <DenseTableRow key={row.key}>
            <DenseTableCell className="text-xs">{row.label}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {row.maxRiskUsd != null ? fmtUsd(row.maxRiskUsd) : '—'}
            </DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>
              {row.maxShares != null ? row.maxShares.toLocaleString() : '—'}
            </DenseTableCell>
          </DenseTableRow>
        ))}
        <DenseTableRow>
          <DenseTableCell className="text-xs">Cash merged (IB + cash-like, ÷ entry)</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {cashCapShares != null ? cashCapShares.toLocaleString() : '—'}
          </DenseTableCell>
        </DenseTableRow>
        <DenseTableRow className={cn(sizingCapRowFocusClass)}>
          <DenseTableCell>
            <strong>Available (min)</strong>
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>—</DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            <strong>
              {availableMinShares != null ? availableMinShares.toLocaleString() : '—'}
            </strong>
          </DenseTableCell>
        </DenseTableRow>
      </DenseTableBody>
    </DenseDataTable>
  )
}
