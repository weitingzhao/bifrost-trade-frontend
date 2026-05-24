import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtUsd, fmtPct, formatLastUpdate, fmtExpiry, rightLabel, pnlColorClass } from '@/utils/positions'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'

interface Props {
  positions: IbPositionRow[]
  quotesByCk: Record<string, QuoteItem>
  quotesBySymbol?: Record<string, QuoteItem>
}

function colorClass(n: number | null | undefined) {
  return pnlColorClass(n)
}

function optionIntrinsic(
  right: string | undefined,
  strike: number | undefined,
  spot: number | null
): number | null {
  if (!right || strike == null || spot == null) return null
  if (right === 'C') return Math.max(0, spot - strike)
  if (right === 'P') return Math.max(0, strike - spot)
  return null
}

export function OptionPositionsTable({ positions, quotesByCk, quotesBySymbol }: Props) {
  if (positions.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">Option Positions</p>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    )
  }

  const totalPremium = positions.reduce((sum, pos) => {
    const qty = pos.position ?? 0
    const avgCost = pos.avgCost ?? null
    const premium = avgCost != null ? -(qty * avgCost) : null
    return sum + (premium ?? 0)
  }, 0)

  // Collect unique underlying symbols for spot display
  const underlyingSymbols = [...new Set(positions.map((p) => p.symbol?.toUpperCase()).filter(Boolean) as string[])]
  const spotBySymbol: Record<string, number> = {}
  for (const sym of underlyingSymbols) {
    const spot = quotesBySymbol?.[sym]?.last
    if (spot != null) spotBySymbol[sym] = spot
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">Option Positions</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[70px]">Symbol</TableHead>
              <TableHead>Right</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Strike</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Premium</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">Daily %</TableHead>
              <TableHead className="text-right">Daily $</TableHead>
              <TableHead className="text-right">Chg %</TableHead>
              <TableHead className="text-right">Chg $</TableHead>
              <TableHead className="text-right">Upd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos, i) => {
              const ck = pos.contract_key ?? ''
              const quote = quotesByCk[ck]
              const qty = pos.position ?? 0
              const avgCost = pos.avgCost ?? null
              const currPrice = quote?.last ?? pos.price ?? null
              const premium = avgCost != null ? -(qty * avgCost) : null

              const side = qty > 0 ? 'Long' : qty < 0 ? 'Short' : '—'
              const intrinsic = optionIntrinsic(pos.right, pos.strike, currPrice)

              // No benchmark for options; use pos.price as base
              const basePrice = pos.price ?? null
              const dailyPct =
                currPrice != null && basePrice != null && basePrice !== 0
                  ? ((currPrice - basePrice) / basePrice) * 100
                  : null
              const dailyUsd =
                currPrice != null && basePrice != null ? (currPrice - basePrice) * qty : null
              const changePct =
                currPrice != null && avgCost != null && avgCost !== 0
                  ? ((currPrice - avgCost) / avgCost) * 100
                  : null
              const changeUsd =
                pos.unrealized_pnl ??
                (currPrice != null && avgCost != null ? (currPrice - avgCost) * qty : null)
              const updTs = quote?.timestamp ?? pos.price_updated_at ?? null

              return (
                <TableRow key={ck || i}>
                  <TableCell className="font-mono text-xs font-medium">{pos.symbol ?? '—'}</TableCell>
                  <TableCell className="text-xs">{rightLabel(pos.right)}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtExpiry(pos.expiry ?? pos.lastTradeDateOrContractMonth)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.strike)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{qty || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{side}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(avgCost)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(premium))}>
                    {fmtUsd(premium)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {intrinsic != null && (
                      <span className="block">{fmtUsd(intrinsic)} intr.</span>
                    )}
                    {pos.strategy_opportunity_name && (
                      <span className="block truncate max-w-[120px]">
                        {pos.strategy_opportunity_name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(currPrice && avgCost ? currPrice - avgCost : null))}>
                    {fmtUsd(currPrice)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(dailyPct))}>
                    {fmtPct(dailyPct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(dailyUsd))}>
                    {fmtUsd(dailyUsd)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(changePct))}>
                    {fmtPct(changePct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(changeUsd))}>
                    {fmtUsd(changeUsd)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatLastUpdate(updTs)}
                  </TableCell>
                </TableRow>
              )
            })}

            {/* Premium total */}
            <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={7} className="text-xs font-medium py-1.5 px-3">
                <span>Option Premium Total</span>
                {Object.entries(spotBySymbol).map(([sym, spot]) => (
                  <span key={sym} className="ml-2 font-normal text-muted-foreground">
                    {sym} spot {fmtUsd(spot)}
                  </span>
                ))}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(totalPremium))}>
                {fmtUsd(totalPremium)}
              </TableCell>
              <TableCell colSpan={7} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
