import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtCcy, pnlClass } from './types'

type SummaryRow = {
  period: string
  col1Label: string
  col1: string
  col2Label?: string
  col2?: string
  pnl: number
}

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">No data for this period.</p>
  const hasCol2 = rows.some(r => r.col2Label)
  return (
    <div className="rounded border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-7">Period</TableHead>
            <TableHead className="h-7">{rows[0].col1Label}</TableHead>
            {hasCol2 && <TableHead className="h-7">{rows[0].col2Label}</TableHead>}
            <TableHead className="h-7 text-right">Realized PnL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.period} className="text-xs">
              <TableCell className="py-1">{r.period}</TableCell>
              <TableCell className="py-1">{r.col1}</TableCell>
              {hasCol2 && <TableCell className="py-1">{r.col2 ?? ''}</TableCell>}
              <TableCell className={cn('py-1 text-right font-mono', pnlClass(r.pnl))}>
                {fmtCcy(r.pnl)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
