import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { fmtUsd, pnlColorClass } from '@/utils/positions'
import { coverageStatus } from '@/utils/stockCoverage'
import type { StockCoverageItem } from '@/types/positions'

interface Props {
  items: StockCoverageItem[]
  title?: string
}

function statusBadge(status: 'Covered' | 'Partial' | 'Naked') {
  if (status === 'Covered') return <Badge variant="default" className="text-[10px]">Covered</Badge>
  if (status === 'Partial') return <Badge variant="secondary" className="text-[10px] border-yellow-500 text-yellow-600">Partial</Badge>
  return <Badge variant="destructive" className="text-[10px]">Naked</Badge>
}

function colorClass(n: number | null | undefined) {
  return pnlColorClass(n)
}

export function StockCoverageTable({ items, title = 'Stock Coverage Summary' }: Props) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right">Required</TableHead>
              <TableHead className="text-right">Held</TableHead>
              <TableHead className="text-right">Surplus/Gap</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">PnL</TableHead>
              <TableHead>Opportunities</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const status = coverageStatus(item)
              return (
                <TableRow key={`${item.symbol}-${item.account_id}-${i}`}>
                  <TableCell className="font-mono text-xs font-medium">{item.symbol}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.account_id}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{item.required_shares}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{item.held_shares}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(item.surplus_or_gap))}>
                    {item.surplus_or_gap >= 0 ? '+' : ''}{item.surplus_or_gap}
                  </TableCell>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(item.avg_cost_per_share)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(item.live_last_price)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(item.total_pnl))}>
                    {fmtUsd(item.total_pnl)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {item.backing_opportunities?.join(', ') ?? '—'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
