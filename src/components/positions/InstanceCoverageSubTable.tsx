import { cn } from '@/lib/utils'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseLinkButton,
  DenseTag,
  InlinePnl,
  NestedDenseTable,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd, fmtSignedPct } from '@/utils/positions'
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
    (s) => (s.symbol ?? '').toUpperCase() === sym && s.account_id === accountId,
  )

  let held = 0
  let costSum = 0
  let qtyAbs = 0
  for (const s of matches) {
    const qty = s.position ?? 0
    held += qty
    if (s.avgCost != null) {
      costSum += Math.abs(qty) * s.avgCost
      qtyAbs += Math.abs(qty)
    }
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

function coverageStatusLabel(
  held: number,
  required: number,
): { label: string; variant: 'covered' | 'partial' | 'naked' } {
  if (held >= required) return { label: 'Fully Covered', variant: 'covered' }
  if (held > 0) return { label: `Partial (${held}/${required})`, variant: 'partial' }
  return { label: 'Naked', variant: 'naked' }
}

function StatusBadge({ variant, label }: { variant: 'covered' | 'partial' | 'naked'; label: string }) {
  if (variant === 'covered') return <DenseTag variant="success" size="cell">{label}</DenseTag>
  if (variant === 'partial') return <DenseTag variant="warning" size="cell">{label}</DenseTag>
  return <DenseTag variant="danger" size="cell">{label}</DenseTag>
}

export function InstanceCoverageSubTable({
  coverage,
  liveStocks,
  quotesBySymbol,
  benchBySymbol,
  onOpenStock,
}: Props) {
  if (coverage.length === 0) return null

  return (
    <section className={cn(instancePanel.subSection, instancePanel.subSectionCoverage)}>
      <h4 className={instancePanel.subHeading}>Underlying Coverage</h4>
      <div className={instancePanel.subTableWrap}>
        <NestedDenseTable>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead>Account</DenseTableHead>
              <DenseTableHead align="right">Cost Basis</DenseTableHead>
              <DenseTableHead align="right">Avg Cost</DenseTableHead>
              <DenseTableHead align="right">Live Last</DenseTableHead>
              <DenseTableHead align="right">Daily</DenseTableHead>
              <DenseTableHead align="right">Total</DenseTableHead>
              <DenseTableHead>Direction</DenseTableHead>
              <DenseTableHead align="right">Required</DenseTableHead>
              <DenseTableHead align="right">Held</DenseTableHead>
              <DenseTableHead>Status</DenseTableHead>
              <DenseTableHead align="right">Surplus/Gap</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {coverage.map((sc, i) => {
              const quote = quotesBySymbol[sc.symbol.toUpperCase()]
              const bench = benchBySymbol[sc.symbol.toUpperCase()]
              const m = computeStockMetrics(liveStocks, sc.symbol, sc.account_id, quote, bench)
              const gap = m.held - sc.required_shares
              const status = coverageStatusLabel(Math.abs(m.held), sc.required_shares)

              return (
                <DenseTableRow key={`${sc.symbol}-${sc.account_id}-${i}`}>
                  <DenseTableCell className={denseTableEntityCell}>
                    {onOpenStock ? (
                      <DenseLinkButton
                        variant="stock"
                        label={sc.symbol}
                        ariaLabel={`Open details for ${sc.symbol}`}
                        onClick={() => onOpenStock(sc.symbol, sc.account_id)}
                        className={cn(denseTableEntityLink, 'font-mono')}
                      />
                    ) : (
                      <DenseTag variant="symbol" size="cell" className="font-mono">
                        {sc.symbol}
                      </DenseTag>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={cn('font-mono', instancePanel.subMutedCell)}>
                    {sc.account_id}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(m.cost_basis)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(m.avg_cost)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{fmtUsd(m.live_last)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <InlinePnl value={m.daily_pnl}>{fmtUsd(m.daily_pnl)}</InlinePnl>
                    {m.daily_pct != null && (
                      <span className="ml-1">
                        <InlinePnl value={m.daily_pct}>{fmtSignedPct(m.daily_pct)}</InlinePnl>
                      </span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    <InlinePnl value={m.total_pnl}>{fmtUsd(m.total_pnl)}</InlinePnl>
                    {m.total_pct != null && (
                      <span className="ml-1">
                        <InlinePnl value={m.total_pct}>{fmtSignedPct(m.total_pct)}</InlinePnl>
                      </span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell>{sc.direction === 'long' ? 'Long' : 'Short'}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{sc.required_shares}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{Math.abs(m.held)}</DenseTableCell>
                  <DenseTableCell>
                    <StatusBadge variant={status.variant} label={status.label} />
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'font-semibold')}>
                    <InlinePnl value={gap}>
                      {gap >= 0 ? '+' : ''}
                      {gap}
                    </InlinePnl>
                  </DenseTableCell>
                </DenseTableRow>
              )
            })}
          </DenseTableBody>
        </NestedDenseTable>
      </div>
    </section>
  )
}
