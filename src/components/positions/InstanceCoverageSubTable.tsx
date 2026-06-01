import { cn } from '@/lib/utils'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PosStatusPill } from './PosStatusPill'
import { fmtUsd, fmtSignedPct, pnlColorClass } from '@/utils/positions'
import type { InstanceStockCoverage, LivePositionRow } from '@/types/positions'
import type { QuoteItem, DailyBenchmark } from '@/types/market'
import { instancePanel } from './instancePanelClasses'

interface Props {
  coverage: InstanceStockCoverage[]
  liveStocks: LivePositionRow[]
  quotesBySymbol: Record<string, QuoteItem>
  benchBySymbol: Record<string, DailyBenchmark>
  onOpenStock?: (symbol: string, accountId: string) => void
}

interface StockMetrics {
  held: number
  avg_cost: number | null
  live_last: number | null
  cost_basis: number | null
  daily_pnl: number | null
  daily_pct: number | null
  total_pnl: number | null
  total_pct: number | null
}

function computeStockMetrics(
  liveStocks: LivePositionRow[],
  symbol: string,
  accountId: string,
  quote: QuoteItem | undefined,
  bench: DailyBenchmark | undefined,
): StockMetrics {
  const sym = symbol.toUpperCase()
  const matches = liveStocks.filter(
    (s) => (s.symbol ?? '').toUpperCase() === sym && s.account_id === accountId
  )

  let held = 0
  let costSum = 0
  let qtyAbs = 0
  for (const s of matches) {
    const qty = s.position ?? 0
    held += qty
    if (s.avgCost != null) { costSum += Math.abs(qty) * s.avgCost; qtyAbs += Math.abs(qty) }
  }

  const avg_cost = qtyAbs > 0 ? costSum / qtyAbs : null
  const live_last = quote?.last ?? matches[0]?.price ?? null
  const cost_basis = costSum > 0 ? costSum : null

  let daily_pnl: number | null = null
  let daily_pct: number | null = null
  if (live_last != null && bench) {
    const base = bench.is_today && bench.prev_close != null ? bench.prev_close : bench.close
    if (base != null && base > 0) {
      daily_pnl = (live_last - base) * held
      daily_pct = ((live_last - base) / base) * 100
    }
  }

  let total_pnl: number | null = null
  let total_pct: number | null = null
  if (live_last != null && avg_cost != null && avg_cost > 0) {
    total_pnl = (live_last - avg_cost) * held
    total_pct = ((live_last - avg_cost) / avg_cost) * 100
  }

  return { held, avg_cost, live_last, cost_basis, daily_pnl, daily_pct, total_pnl, total_pct }
}

function coverageStatusLabel(held: number, required: number): { label: string; variant: 'covered' | 'partial' | 'naked' } {
  if (held >= required) return { label: 'Fully Covered', variant: 'covered' }
  if (held > 0) return { label: `Partial (${held}/${required})`, variant: 'partial' }
  return { label: 'Naked', variant: 'naked' }
}

function StatusBadge({ variant, label }: { variant: 'covered' | 'partial' | 'naked'; label: string }) {
  if (variant === 'covered') return <PosStatusPill tone="brightOk">{label}</PosStatusPill>
  if (variant === 'partial') return <PosStatusPill tone="warn">{label}</PosStatusPill>
  return <PosStatusPill tone="bad">{label}</PosStatusPill>
}

export function InstanceCoverageSubTable({ coverage, liveStocks, quotesBySymbol, benchBySymbol, onOpenStock }: Props) {
  if (coverage.length === 0) return null

  return (
    <section className={cn(instancePanel.subSection, instancePanel.subSectionCoverage)}>
      <h4 className={instancePanel.subHeading}>Underlying Coverage</h4>
      <div className={instancePanel.subTableWrap}>
        <Table className={instancePanel.subTable}>
          <TableHeader className={instancePanel.subTableHeader}>
            <TableRow>
              <TableHead className={instancePanel.subTableHead}>Symbol</TableHead>
              <TableHead className={instancePanel.subTableHead}>Account</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Cost Basis</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Avg Cost</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Live Last</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Daily</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Total</TableHead>
              <TableHead className={instancePanel.subTableHead}>Direction</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Required</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Held</TableHead>
              <TableHead className={instancePanel.subTableHead}>Status</TableHead>
              <TableHead className={cn('text-right', instancePanel.subTableHead)}>Surplus/Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.map((sc, i) => {
              const quote = quotesBySymbol[sc.symbol.toUpperCase()]
              const bench = benchBySymbol[sc.symbol.toUpperCase()]
              const m = computeStockMetrics(liveStocks, sc.symbol, sc.account_id, quote, bench)
              const gap = m.held - sc.required_shares
              const status = coverageStatusLabel(Math.abs(m.held), sc.required_shares)

              return (
                <TableRow key={`${sc.symbol}-${sc.account_id}-${i}`} className={instancePanel.subDataRow}>
                  <TableCell>
                    {onOpenStock ? (
                      <button
                        type="button"
                        className={instancePanel.subContractBtn}
                        onClick={() => onOpenStock(sc.symbol, sc.account_id)}
                      >
                        {sc.symbol}
                      </button>
                    ) : (
                      <span className={instancePanel.subContractBtn}>{sc.symbol}</span>
                    )}
                  </TableCell>
                  <TableCell className={cn('font-mono text-xs', instancePanel.subMutedCell)}>{sc.account_id}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(m.cost_basis)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(m.avg_cost)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtUsd(m.live_last)}</TableCell>
                  <TableCell className="text-right text-xs">
                    <span className={cn('font-mono', pnlColorClass(m.daily_pnl))}>{fmtUsd(m.daily_pnl)}</span>
                    {m.daily_pct != null && (
                      <span className={cn('ml-1 font-mono', pnlColorClass(m.daily_pct))}>{fmtSignedPct(m.daily_pct)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <span className={cn('font-mono', pnlColorClass(m.total_pnl))}>{fmtUsd(m.total_pnl)}</span>
                    {m.total_pct != null && (
                      <span className={cn('ml-1 font-mono', pnlColorClass(m.total_pct))}>{fmtSignedPct(m.total_pct)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{sc.direction === 'long' ? 'Long' : 'Short'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{sc.required_shares}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{Math.abs(m.held)}</TableCell>
                  <TableCell><StatusBadge variant={status.variant} label={status.label} /></TableCell>
                  <TableCell className={cn('text-right font-mono text-xs font-semibold', pnlColorClass(gap))}>
                    {gap >= 0 ? '+' : ''}{gap}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
