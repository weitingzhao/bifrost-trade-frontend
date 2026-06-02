import { Trash2 } from 'lucide-react'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { fmtUsd } from '@/lib/format'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'

function fmtOptNum(v: number | null | undefined, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

type Props = {
  rows: OptionSnapshotRow[]
  onRemove: (index: number) => void
}

export function DiscoveryCompareTable({ rows, onRemove }: Props) {
  return (
    <DenseDataTable wrapClassName="rounded-md border-0" tableClassName="text-xs">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Side</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Strike</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Bid</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Ask</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>Mid</DenseTableHead>
          <DenseTableHead className={denseTableNumCell}>IV</DenseTableHead>
          <DenseTableHead className="w-10" aria-label="Remove" />
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r, i) => (
          <DenseTableRow key={`${r.strike}-${r.right}-${i}`}>
            <DenseTableCell>{r.right === 'P' || r.right === 'PUT' ? 'Put' : 'Call'}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{r.strike.toFixed(2)}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{r.bid != null ? fmtUsd(r.bid) : '—'}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{r.ask != null ? fmtUsd(r.ask) : '—'}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{r.mid != null ? fmtUsd(r.mid) : '—'}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{fmtOptNum(r.iv, 4)}</DenseTableCell>
            <DenseTableCell>
              <IconActionButton
                onClick={() => onRemove(i)}
                title="Remove from compare"
                ariaLabel={`Remove row ${i + 1}`}
                tone="danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconActionButton>
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
