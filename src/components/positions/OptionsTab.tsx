import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtUsd, fmtExpiry, rightLabel } from '@/utils/positions'
import type { OpenOptionPosition } from '@/types/positions'
import type { QuoteItem } from '@/types/market'

interface Props {
  positions: OpenOptionPosition[]
  quotesBySymbol: Record<string, QuoteItem>
  filterSymbol?: string
  filterExpiry?: string
}

function colorClass(n: number | null | undefined) {
  if (n == null) return ''
  if (n > 0) return 'text-green-600 dark:text-green-400'
  if (n < 0) return 'text-red-600 dark:text-red-400'
  return ''
}

function optionIntrinsic(right: string, strike: number, spot: number | null): number | null {
  if (spot == null) return null
  if (right === 'C') return Math.max(0, spot - strike)
  if (right === 'P') return Math.max(0, strike - spot)
  return null
}

function moneyness(right: string, strike: number, spot: number | null): string {
  if (spot == null) return '—'
  if (Math.abs(spot - strike) < 0.5) return 'ATM'
  if (right === 'C') return spot > strike ? 'ITM' : 'OTM'
  if (right === 'P') return spot < strike ? 'ITM' : 'OTM'
  return '—'
}

function expiryMatchesFilter(expiry: string, filter: string): boolean {
  const f = filter.replace(/\D/g, '')
  if (!f) return true
  const ex = expiry.replace(/\D/g, '')
  if (!ex) return false
  return ex.startsWith(f) || f.startsWith(ex)
}

export function OptionsTab({ positions, quotesBySymbol, filterSymbol, filterExpiry }: Props) {
  let filtered = positions

  if (filterSymbol) {
    const upper = filterSymbol.toUpperCase()
    filtered = filtered.filter((p) => p.symbol.includes(upper))
  }

  if (filterExpiry) {
    filtered = filtered.filter((p) => expiryMatchesFilter(p.expiry, filterExpiry))
  }

  if (filtered.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Option Positions</p>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    )
  }

  let totalPremium = 0
  for (const pos of filtered) {
    if (pos.avg_cost != null) totalPremium += -(pos.qty * pos.avg_cost)
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">Option Positions</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[60px]">Symbol</TableHead>
              <TableHead>Right</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Strike</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Moneyness</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead className="text-right">Mark</TableHead>
              <TableHead className="text-right">Intrinsic</TableHead>
              <TableHead className="text-right">PnL</TableHead>
              <TableHead>Strategy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pos, i) => {
              const spot = quotesBySymbol[pos.symbol]?.last ?? null
              const intrinsic = optionIntrinsic(pos.right, pos.strike, spot)
              const money = moneyness(pos.right, pos.strike, spot)
              const side = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : '—'
              const premium = pos.avg_cost != null ? -(pos.qty * pos.avg_cost) : null
              const changePct =
                pos.mark_price != null && pos.avg_cost != null && pos.avg_cost !== 0
                  ? ((pos.mark_price - pos.avg_cost) / pos.avg_cost) * 100
                  : null

              return (
                <TableRow key={pos.contract_key || i}>
                  <TableCell className="font-mono text-xs font-medium">{pos.symbol}</TableCell>
                  <TableCell className="text-xs">{rightLabel(pos.right)}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtExpiry(pos.expiry)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.strike)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{pos.qty || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{side}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{money}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.avg_cost)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(premium))}>
                    {fmtUsd(premium)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(changePct))}>
                    {fmtUsd(pos.mark_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {intrinsic != null ? fmtUsd(intrinsic) : '—'}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(pos.unrealized_pnl))}>
                    {fmtUsd(pos.unrealized_pnl)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {pos.strategy_opportunity_name ?? '—'}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={8} className="text-xs font-medium py-1.5">
                Option Premium Total
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(totalPremium))}>
                {fmtUsd(totalPremium)}
              </TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
