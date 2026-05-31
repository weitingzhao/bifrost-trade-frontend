import type { DailyBenchmark } from '@/types/market'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import { getDailyRefTooltip } from '@/utils/marketStreamsDailyTotals'
import { getQuoteFreshness, quoteFreshnessTitle } from '@/utils/quoteFreshness'
import type { MarketStreamsRow } from '@/utils/marketStreamsRows'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import { DailyCalcBreakdown } from './DailyCalcBreakdown'
import styles from './live.module.css'

interface Props {
  row: MarketStreamsRow
  categoryForDrag: string
  dragEnabled: boolean
  watchingStocksSlim?: boolean
  hasStreamAccounts: boolean
  benchmarks: Record<string, DailyBenchmark>
  onSymbolReorder?: (category: string, fromSymbol: string, toSymbol: string) => void
}

function pnlClass(v: number | null | undefined): string {
  if (v == null || v === 0) return ''
  return v > 0 ? styles.pnlPositive : styles.pnlNegative
}

export function MarketStreamStkRow({
  row,
  categoryForDrag,
  dragEnabled,
  watchingStocksSlim = false,
  hasStreamAccounts,
  benchmarks,
  onSymbolReorder,
}: Props) {
  const {
    symbol,
    quote: q,
    qty,
    avgCost,
    changePct,
    pnlVsBench,
    pnlCost,
    hostQty,
    hostAvgCost,
    hostPnlCost,
    secondaryQty,
    secondaryAvgCost,
    secondaryPnlCost,
    positionDailyPrevClose,
  } = row

  const symbolFreshness = getQuoteFreshness(q?.ts)
  const symBench = benchmarks[(symbol || '').trim().toUpperCase()]
  const dailyLast = quoteDisplayLast(q ?? undefined)

  const symbolClass = cn(
    styles.symbolCell,
    symbolFreshness === 'fresh' && styles.symbolFresh,
    symbolFreshness === 'stale' && styles.symbolStale,
    symbolFreshness === 'very-stale' && styles.symbolVeryStale,
  )

  return (
    <tr
      onDragOver={dragEnabled ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' } : undefined}
      onDrop={
        dragEnabled && onSymbolReorder
          ? e => {
              e.preventDefault()
              try {
                const raw = e.dataTransfer.getData('application/x-market-streams-symbol')
                if (!raw) return
                const { category: fromCat, symbol: fromSymbol } = JSON.parse(raw) as {
                  category: string
                  symbol: string
                }
                if (fromCat === categoryForDrag && fromSymbol !== row.symbol) {
                  onSymbolReorder(categoryForDrag, fromSymbol, row.symbol)
                }
              } catch {
                /* ignore */
              }
            }
          : undefined
      }
    >
      <td
        className={symbolClass}
        title={[quoteFreshnessTitle(symbolFreshness), getDailyRefTooltip(symBench, dailyLast)]
          .filter(Boolean)
          .join('\n') || undefined}
      >
        {dragEnabled && (
          <span
            className={styles.dragHandle}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData(
                'application/x-market-streams-symbol',
                JSON.stringify({ category: categoryForDrag, symbol: row.symbol }),
              )
              e.dataTransfer.effectAllowed = 'move'
            }}
            title="Drag to reorder symbol"
            aria-hidden
          >
            ⋮⋮
          </span>
        )}
        <strong>{symbol}</strong>
      </td>

      {!watchingStocksSlim && hasStreamAccounts && (
        <>
          <td className={styles.numCell}>{hostQty != null && Number.isFinite(hostQty) ? hostQty : '—'}</td>
          <td className={styles.numCell}>
            {hostAvgCost != null && Number.isFinite(hostAvgCost) ? fmtUsd(hostAvgCost) : '—'}
          </td>
          <td className={cn(styles.numCell, pnlClass(hostPnlCost))}>
            {hostPnlCost != null && Number.isFinite(hostPnlCost) ? fmtUsd(hostPnlCost, true) : '—'}
          </td>
          <td className={styles.numCell}>
            {secondaryQty != null && Number.isFinite(secondaryQty) ? secondaryQty : '—'}
          </td>
          <td className={styles.numCell}>
            {secondaryAvgCost != null && Number.isFinite(secondaryAvgCost) ? fmtUsd(secondaryAvgCost) : '—'}
          </td>
          <td className={cn(styles.numCell, pnlClass(secondaryPnlCost))}>
            {secondaryPnlCost != null && Number.isFinite(secondaryPnlCost)
              ? fmtUsd(secondaryPnlCost, true)
              : '—'}
          </td>
        </>
      )}

      {!watchingStocksSlim && (
        <>
          <td className={styles.numCell}>{qty != null && Number.isFinite(qty) ? qty : '—'}</td>
          <td className={styles.numCell}>{avgCost != null && Number.isFinite(avgCost) ? fmtUsd(avgCost) : '—'}</td>
        </>
      )}

      <td className={cn(styles.numCell, styles.lastBidAsk)}>
        {q ? (() => {
          const displayLast = quoteDisplayLast(q)
          const bid = q.bid != null && Number.isFinite(q.bid) ? q.bid : null
          const ask = q.ask != null && Number.isFinite(q.ask) ? q.ask : null
          const bidDiff = displayLast != null && bid != null ? bid - displayLast : null
          const askDiff = displayLast != null && ask != null ? ask - displayLast : null
          const bench = benchmarks[(symbol || '').trim().toUpperCase()]
          const prevClose =
            bench && bench.prev_close != null && Number.isFinite(bench.prev_close)
              ? bench.prev_close
              : bench && Number.isFinite(bench.close)
                ? bench.close
                : null
          const lastVsPrev =
            displayLast != null && prevClose != null && prevClose > 0
              ? displayLast > prevClose
                ? styles.pnlPositive
                : displayLast < prevClose
                  ? styles.pnlNegative
                  : ''
              : ''
          return (
            <>
              {displayLast != null ? (
                <span className={lastVsPrev}>{fmtUsd(displayLast)}</span>
              ) : (
                '—'
              )}
              {bidDiff != null && (
                <span className={cn(styles.spread, pnlClass(bidDiff))} title="Bid vs Last">
                  {' '}
                  {Math.abs(bidDiff).toFixed(2)}
                </span>
              )}
              {askDiff != null && (
                <span className={cn(styles.spread, pnlClass(askDiff))} title="Ask vs Last">
                  {' '}
                  {Math.abs(askDiff).toFixed(2)}
                </span>
              )}
            </>
          )
        })() : '—'}
      </td>

      <td className={cn(styles.numCell, styles.dailyCalcCell)}>
        <span className={styles.pnlStackedLine}>
          {changePct != null && Number.isFinite(changePct) ? (
            <span className={pnlClass(changePct)}>{Math.abs(changePct).toFixed(2)}%</span>
          ) : (
            '—'
          )}
        </span>
        <span className={styles.pnlStackedLine}>
          {pnlVsBench != null && Number.isFinite(pnlVsBench) ? (
            <span className={pnlClass(pnlVsBench)}>{fmtUsd(Math.abs(pnlVsBench))}</span>
          ) : (
            '—'
          )}
        </span>
        <DailyCalcBreakdown
          symbol={(symbol || '').trim() || '—'}
          bench={symBench}
          positionDailyPrevClose={positionDailyPrevClose}
          last={dailyLast}
          qty={qty}
        />
      </td>

      <td className={styles.numCell}>
        <span className={styles.pnlStackedLine}>
          {(() => {
            const dl = quoteDisplayLast(q ?? undefined)
            if (avgCost == null || !Number.isFinite(avgCost) || avgCost <= 0 || dl == null) return '—'
            const sincePct = ((dl - avgCost) / avgCost) * 100
            return <span className={pnlClass(sincePct)}>{Math.abs(sincePct).toFixed(2)}%</span>
          })()}
        </span>
        <span className={styles.pnlStackedLine}>
          {pnlCost != null && Number.isFinite(pnlCost) ? (
            <span className={pnlClass(pnlCost)}>{fmtUsd(pnlCost, true)}</span>
          ) : (
            '—'
          )}
        </span>
      </td>
    </tr>
  )
}
