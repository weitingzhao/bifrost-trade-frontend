import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fmtUsd, fmtPct, formatLastUpdate, resolveBasePrice, pnlColorClass } from '@/utils/positions'
import type { IbPositionRow } from '@/types/monitor'
import type { QuoteItem, DailyBenchmark } from '@/types/market'

interface Props {
  positions: IbPositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onCategoryClick?: () => void
}

function colorClass(n: number | null | undefined) {
  return pnlColorClass(n)
}

interface RowCalc {
  currPrice: number | null
  basePrice: number | null
  totalCost: number | null
  totalMarket: number | null
  dailyPct: number | null
  dailyUsd: number | null
  changePct: number | null
  changeUsd: number | null
  updTs: number | null
}

function calcRow(
  pos: IbPositionRow,
  quote: QuoteItem | undefined,
  bench: DailyBenchmark | undefined
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
  return { currPrice, basePrice, totalCost, totalMarket, dailyPct, dailyUsd, changePct, changeUsd, updTs }
}

interface GroupTotals {
  totalCost: number
  totalMarket: number
  dailyUsd: number
  changeUsd: number
  hasDailyDenom: boolean
}

function calcGroupTotals(
  rows: IbPositionRow[],
  quotesBySymbol: Record<string, QuoteItem>,
  benchBySymbol: Record<string, DailyBenchmark>
): GroupTotals {
  let totalCost = 0, totalMarket = 0, dailyUsd = 0, changeUsd = 0
  let hasDailyDenom = false
  for (const pos of rows) {
    const quote = quotesBySymbol[pos.symbol?.toUpperCase() ?? '']
    const bench = benchBySymbol[pos.symbol?.toUpperCase() ?? '']
    const r = calcRow(pos, quote, bench)
    if (r.totalCost != null) totalCost += r.totalCost
    if (r.totalMarket != null) totalMarket += r.totalMarket
    if (r.dailyUsd != null) { dailyUsd += r.dailyUsd; hasDailyDenom = true }
    if (r.changeUsd != null) changeUsd += r.changeUsd
  }
  return { totalCost, totalMarket, dailyUsd, changeUsd, hasDailyDenom }
}

export function StockPositionsTable({ positions, quotesBySymbol, benchBySymbol, onCategoryClick }: Props) {
  if (positions.length === 0) {
    return (
      <div>
        <p className="text-sm font-semibold mb-2">Stock positions</p>
        <p className="text-sm text-muted-foreground">None</p>
      </div>
    )
  }

  // Group by category
  const byCategory: Record<string, IbPositionRow[]> = {}
  for (const pos of positions) {
    const cat = pos.category ?? 'Uncategorized'
    ;(byCategory[cat] ??= []).push(pos)
  }
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    if (a === 'Uncategorized') return -1
    if (b === 'Uncategorized') return 1
    return a.localeCompare(b)
  })

  // Grand totals
  const grand = calcGroupTotals(positions, quotesBySymbol, benchBySymbol)
  const grandChangePct = grand.totalCost !== 0 ? (grand.changeUsd / grand.totalCost) * 100 : null
  const grandDailyPct = grand.totalCost !== 0 ? (grand.dailyUsd / grand.totalCost) * 100 : null

  return (
    <div>
      <p className="text-sm font-semibold mb-2">Stock positions</p>
      <div className="rounded-md border overflow-x-auto">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[80px]">Symbol</TableHead>
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
              <TableHead>Strategy</TableHead>
              <TableHead>Instance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.map((cat) => {
              const rows = byCategory[cat]
              const grp = calcGroupTotals(rows, quotesBySymbol, benchBySymbol)
              const grpChangePct = grp.totalCost !== 0 ? (grp.changeUsd / grp.totalCost) * 100 : null
              const grpDailyPct = grp.totalCost !== 0 ? (grp.dailyUsd / grp.totalCost) * 100 : null

              return [
                // Category header
                <TableRow
                  key={`cat-${cat}`}
                  className="bg-muted/40 hover:bg-muted/60 cursor-pointer"
                  onClick={onCategoryClick}
                >
                  <TableCell
                    colSpan={13}
                    className="py-1 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                  >
                    {cat}
                  </TableCell>
                </TableRow>,

                // Position rows
                ...rows.map((pos) => {
                  const sym = pos.symbol?.toUpperCase() ?? ''
                  const quote = quotesBySymbol[sym]
                  const bench = benchBySymbol[sym]
                  const r = calcRow(pos, quote, bench)

                  const lastClass = cn(
                    'text-right font-mono text-xs font-semibold',
                    pos.avgCost != null && r.currPrice != null
                      ? colorClass(r.currPrice - pos.avgCost)
                      : ''
                  )

                  return (
                    <TableRow key={pos.contract_key ?? pos.symbol}>
                      <TableCell className="font-mono text-xs font-medium">
                        {pos.symbol ?? '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{pos.position ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtUsd(pos.avgCost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtUsd(r.totalCost)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtUsd(r.totalMarket)}</TableCell>
                      <TableCell className={lastClass}>{fmtUsd(r.currPrice)}</TableCell>
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
                      <TableCell className="text-xs text-muted-foreground">
                        {pos.strategy_opportunity_name?.trim() ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {pos.strategy_instance_label?.trim() ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                }),

                // Group subtotal
                <TableRow key={`sub-${cat}`} className="bg-muted/20 hover:bg-muted/20 border-t border-dashed">
                  <TableCell className="text-xs text-muted-foreground italic py-1 px-3" colSpan={3}>
                    {cat} subtotal
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {fmtUsd(grp.totalCost)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {fmtUsd(grp.totalMarket)}
                  </TableCell>
                  <TableCell />
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(grpDailyPct))}>
                    {fmtPct(grpDailyPct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(grp.dailyUsd))}>
                    {fmtUsd(grp.dailyUsd)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(grpChangePct))}>
                    {fmtPct(grpChangePct)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono text-xs', colorClass(grp.changeUsd))}>
                    {fmtUsd(grp.changeUsd)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>,
              ]
            })}

            {/* Grand totals */}
            <TableRow className="border-t-2 font-semibold bg-muted/30 hover:bg-muted/30">
              <TableCell className="text-xs py-1.5 px-3" colSpan={3}>Stock Total</TableCell>
              <TableCell className="text-right font-mono text-xs">{fmtUsd(grand.totalCost)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{fmtUsd(grand.totalMarket)}</TableCell>
              <TableCell />
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grandDailyPct))}>
                {fmtPct(grandDailyPct)}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grand.dailyUsd))}>
                {fmtUsd(grand.dailyUsd)}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grandChangePct))}>
                {fmtPct(grandChangePct)}
              </TableCell>
              <TableCell className={cn('text-right font-mono text-xs', colorClass(grand.changeUsd))}>
                {fmtUsd(grand.changeUsd)}
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
