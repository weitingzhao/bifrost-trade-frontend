import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Eye } from 'lucide-react'
import type { Execution } from '@/types/positions'
import { executionDateStr } from '@/utils/ledger/performanceUtils'
import { ExecSourceBadge } from './OptGroupRow'
import { fmtCcy, fmtPrice, pnlClass, SortIcon } from './types'
import type { StkSortCol } from './types'

export function StkFlatTable({
  executions, stkSort, toggleStkSort, onEdit, onDelete, onAddJournal, compact = false,
}: {
  executions: Execution[]
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
  compact?: boolean
}) {
  const rowClass = compact ? 'py-0.5' : 'py-1'
  return (
    <div className={cn('rounded border overflow-hidden', compact && 'rounded-none border-0')}>
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-7 cursor-pointer select-none" onClick={() => toggleStkSort('trade_date')}>
              Date <SortIcon active={stkSort.col === 'trade_date'} dir={stkSort.dir} />
            </TableHead>
            <TableHead className="h-7">Symbol</TableHead>
            <TableHead className="h-7">Account</TableHead>
            <TableHead className="h-7">Side</TableHead>
            <TableHead className="h-7 text-right">Qty</TableHead>
            <TableHead className="h-7 text-right">Price</TableHead>
            <TableHead className="h-7 text-right">Notional</TableHead>
            <TableHead className="h-7 text-right cursor-pointer select-none" onClick={() => toggleStkSort('realized_pnl')}>
              Realized PnL <SortIcon active={stkSort.col === 'realized_pnl'} dir={stkSort.dir} />
            </TableHead>
            <TableHead className="h-7">Source</TableHead>
            <TableHead className="h-7 w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">No executions found.</TableCell>
            </TableRow>
          )}
          {executions.map(e => (
            <TableRow key={e.account_executions_id ?? `${e.time}-${e.symbol}`} className="text-xs">
              <TableCell className={cn(rowClass, 'font-mono')}>{executionDateStr(e)}</TableCell>
              <TableCell className={cn(rowClass, 'font-medium')}>{e.symbol}</TableCell>
              <TableCell className={cn(rowClass, 'text-muted-foreground')}>{e.account_id}</TableCell>
              <TableCell className={rowClass}>
                <Badge variant={e.side === 'Buy' ? 'default' : 'secondary'} className="text-[10px] px-1 py-0">{e.side}</Badge>
              </TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{Math.abs(e.qty)}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{fmtPrice(e.price)}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono')}>{fmtCcy(Math.abs(e.qty * e.price))}</TableCell>
              <TableCell className={cn(rowClass, 'text-right font-mono', pnlClass(e.realized_pnl ?? 0))}>
                {e.realized_pnl != null ? fmtCcy(e.realized_pnl) : '—'}
              </TableCell>
              <TableCell className={rowClass}><ExecSourceBadge source={e.source} /></TableCell>
              <TableCell className={rowClass}>
                <div className="flex items-center gap-0.5">
                  <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit" onClick={() => onEdit(e)}>
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => onDelete(e)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button className="h-5 w-5 rounded flex items-center justify-center text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30" title="Add journal entry" onClick={() => onAddJournal(e.account_id, e.symbol)}>
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
