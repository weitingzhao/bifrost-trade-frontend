import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtUsd, fmtPct, formatLastUpdate, resolveBasePrice } from '@/utils/positions'
import type { LivePositionRow } from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

interface Props {
  positions: LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  title?: string
  filterSymbol?: string
}

function colorClass(n: number | null | undefined) {
  if (n == null) return ''
  if (n > 0) return 'text-green-600 dark:text-green-400'
  if (n < 0) return 'text-red-600 dark:text-red-400'
  return ''
}

interface RowCalc {
  currPrice: number | null
  totalCost: number | null
  totalMarket: number | null
  dailyPct: number | null
  dailyUsd: number | null
  changePct: number | null
  changeUsd: number | null
  updTs: number | null
}

function calcRow(
  pos: LivePositionRow,
  quote: QuoteItem | undefined,
  bench: DailyBenchmark | undefined,
): RowCalc {
  const qty = pos.position ?? 0
  const avgCost = pos.avgCost ?? null
  const currPrice = quote?.last ?? pos.price ?? null
  const basePrice = resolveBasePrice(pos, bench)
  const totalCost = avgCost != null ? qty * avgCost : null
  const totalMarket = currPrice != null ? qty * currPrice : null
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
    pos.unrealized_pnl ?? (currPrice != null && avgCost != null ? (currPrice - avgCost) * qty : null)
  const updTs = quote?.timestamp ?? pos.price_updated_at ?? null
  return { currPrice, totalCost, totalMarket, dailyPct, dailyUsd, changePct, changeUsd, updTs }
}

export function StocksTab({ positions, quotesBySymbol, benchBySymbol, title = 'Stock Positions', filterSymbol }: Props) {
  const filtered = filterSymbol
    ? positions.filter((p) => (p.symbol ?? '').toUpperCase().includes(filterSymbol.toUpperCase()))
    : positions

  if (filtered.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    )
  }

  let grandTotalCost = 0
  let grandTotalMarket = 0
  let grandDailyUsd = 0
  let grandChangeUsd = 0

  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead className="min-w-[70px]">Symbol</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-right">Total Mkt</TableHead>
              <TableHead className="text-right">Last</TableHead>
              <TableHead className="text-right">Daily %</TableHead>
              <TableHead className="text-right">Daily $</TableHead>
              <TableHead className="text-right">Chg %</TableHead>
              <TableHead className="text-right">Chg $</TableHead>
              <TableHead className="text-right">Upd</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pos, i) => {
              const sym = (pos.symbol ?? '').toUpperCase()
              const quote = quotesBySymbol[sym]
              const bench = benchBySymbol[sym]
              const r = calcRow(pos, quote, bench)

              if (r.totalCost != null) grandTotalCost += r.totalCost
              if (r.totalMarket != null) grandTotalMarket += r.totalMarket
              if (r.dailyUsd != null) grandDailyUsd += r.dailyUsd
              if (r.changeUsd != null) grandChangeUsd += r.changeUsd

              return (
                <TableRow key={`${pos.account_id}-${pos.contract_key ?? pos.symbol}-${i}`}>
                  <TableCell className="text-xs text-muted-foreground font-mono">{pos.account_id}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{pos.symbol ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{pos.position ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.avgCost)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(r.totalCost)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(r.totalMarket)}</TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(r.currPrice && pos.avgCost ? r.currPrice - pos.avgCost : null))}>
                    {fmtUsd(r.currPrice)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(r.dailyPct))}>
                    {fmtPct(r.dailyPct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(r.dailyUsd))}>
                    {fmtUsd(r.dailyUsd)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(r.changePct))}>
                    {fmtPct(r.changePct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', colorClass(r.changeUsd))}>
                    {fmtUsd(r.changeUsd)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatLastUpdate(r.updTs)}
                  </TableCell>
                </TableRow>
              )
            })}
            <TableRow className="border-t-2 font-semibold bg-muted/30 hover:bg-muted/30">
              <TableCell className="text-xs py-1.5" colSpan={4}>Total</TableCell>
              <TableCell className="text-right font-mono text-xs">{fmtUsd(grandTotalCost)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{fmtUsd(grandTotalMarket)}</TableCell>
              <TableCell />
              <TableCell />
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grandDailyUsd))}>
                {fmtUsd(grandDailyUsd)}
              </TableCell>
              <TableCell />
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grandChangeUsd))}>
                {fmtUsd(grandChangeUsd)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
