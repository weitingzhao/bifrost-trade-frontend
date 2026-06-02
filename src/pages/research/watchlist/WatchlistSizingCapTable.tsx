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

type CapRow = {
  key: string
  label: string
  maxRiskUsd: number | null
  maxShares: number | null
}

type Props = {
  capRows: CapRow[]
  availableMinShares: number | null
}

export function WatchlistSizingCapTable({ capRows, availableMinShares }: Props) {
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Source</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Max $ risk</DenseTableHead>
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
        <DenseTableRow className="font-semibold">
          <DenseTableCell>Available (min)</DenseTableCell>
          <DenseTableCell />
          <DenseTableCell className={denseTableNumCell}>
            {availableMinShares != null ? availableMinShares.toLocaleString() : '—'}
          </DenseTableCell>
        </DenseTableRow>
      </DenseTableBody>
    </DenseDataTable>
  )
}
