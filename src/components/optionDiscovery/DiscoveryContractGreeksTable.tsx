import type { ReactNode } from 'react'
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

export type GreeksCompareRow = {
  label: string
  snap: string
  bs: string
  diff: number | null
  vegaHint?: boolean
}

function diffClass(pct: number | null): string {
  if (pct == null) return ''
  const abs = Math.abs(pct)
  if (abs < 3) return 'text-green-600 dark:text-green-500'
  if (abs < 10) return 'text-amber-600 dark:text-amber-400'
  return 'text-destructive'
}

function fmtDiff(pct: number | null): string {
  if (pct == null) return '—'
  return (pct > 0 ? '+' : '') + pct.toFixed(1) + '%'
}

type Props = {
  rows: readonly GreeksCompareRow[]
  footer: ReactNode
}

export function DiscoveryContractGreeksTable({ rows, footer }: Props) {
  return (
    <DenseDataTable wrapClassName="rounded-md border-border/60" tableClassName="text-xs">
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead className="normal-case tracking-normal">Metric</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Snapshot (Massive)</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>BS</DenseTableHead>
          <DenseTableHead className={cn(denseTableNumCell, 'normal-case tracking-normal')}>Diff %</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map(row => (
          <DenseTableRow key={row.label}>
            <DenseTableCell className="font-medium">{row.label}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{row.snap}</DenseTableCell>
            <DenseTableCell className={denseTableNumCell}>{row.bs}</DenseTableCell>
            <DenseTableCell className={cn(denseTableNumCell, 'font-medium', diffClass(row.diff))}>
              {fmtDiff(row.diff)}
              {row.vegaHint ? <span className="text-muted-foreground"> Units?</span> : null}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
      <tfoot>
        <tr className="hover:bg-transparent">
          <DenseTableCell colSpan={4} className="text-xs text-muted-foreground">
            {footer}
          </DenseTableCell>
        </tr>
      </tfoot>
    </DenseDataTable>
  )
}
