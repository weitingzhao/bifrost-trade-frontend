import type { DailyBenchmark } from '@/types/market'
import { cn } from '@/lib/utils'
import { DenseTableCell, InlinePnl, denseTableNumCell } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import { getDailyRefTooltip } from '@/utils/marketStreamsDailyTotals'
import { getQuoteFreshness, quoteFreshnessTitle } from '@/utils/quoteFreshness'
import type { MarketStreamsRow } from '@/utils/marketStreamsRows'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import { DailyCalcBreakdown } from './DailyCalcBreakdown'
import { LiveStackedPnlCell } from './LiveStackedPnlCell'
import { liveSymbolFreshnessClass, liveTable } from './liveTableClasses'
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
      <DenseTableCell
        className={liveSymbolFreshnessClass(symbolFreshness)}
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
      </DenseTableCell>

      {!watchingStocksSlim && hasStreamAccounts && (
        <>
          <DenseTableCell className={denseTableNumCell}>
            {hostQty != null && Number.isFinite(hostQty) ? hostQty : '—'}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {hostAvgCost != null && Number.isFinite(hostAvgCost) ? fmtUsd(hostAvgCost) : '—'}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {hostPnlCost != null && Number.isFinite(hostPnlCost) ? (
              <InlinePnl value={hostPnlCost}>{fmtUsd(hostPnlCost, true)}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {secondaryQty != null && Number.isFinite(secondaryQty) ? secondaryQty : '—'}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {secondaryAvgCost != null && Number.isFinite(secondaryAvgCost)
              ? fmtUsd(secondaryAvgCost)
              : '—'}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {secondaryPnlCost != null && Number.isFinite(secondaryPnlCost) ? (
              <InlinePnl value={secondaryPnlCost}>{fmtUsd(secondaryPnlCost, true)}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
        </>
      )}

      {!watchingStocksSlim && (
        <>
          <DenseTableCell className={denseTableNumCell}>
            {qty != null && Number.isFinite(qty) ? qty : '—'}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {avgCost != null && Number.isFinite(avgCost) ? fmtUsd(avgCost) : '—'}
          </DenseTableCell>
        </>
      )}

      <DenseTableCell className={cn(denseTableNumCell, liveTable.lastBidAsk)}>
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
          const lastDelta =
            displayLast != null && prevClose != null && prevClose > 0
              ? displayLast - prevClose
              : null
          return (
            <>
              {displayLast != null ? (
                <InlinePnl value={lastDelta}>{fmtUsd(displayLast)}</InlinePnl>
              ) : (
                '—'
              )}
              {bidDiff != null && (
                <span className={liveTable.bidAskSpread} title="Bid vs Last">
                  {' '}
                  <InlinePnl value={bidDiff}>{Math.abs(bidDiff).toFixed(2)}</InlinePnl>
                </span>
              )}
              {askDiff != null && (
                <span className={liveTable.bidAskSpread} title="Ask vs Last">
                  {' '}
                  <InlinePnl value={askDiff}>{Math.abs(askDiff).toFixed(2)}</InlinePnl>
                </span>
              )}
            </>
          )
        })() : '—'}
      </DenseTableCell>

      <DenseTableCell className={cn(denseTableNumCell, styles.dailyCalcCell)}>
        <LiveStackedPnlCell
          pct={changePct}
          dollar={pnlVsBench}
          formatPct={v => `${v.toFixed(2)}%`}
          formatDollar={v => fmtUsd(Math.abs(v ?? 0))}
        />
        <DailyCalcBreakdown
          symbol={(symbol || '').trim() || '—'}
          bench={symBench}
          positionDailyPrevClose={positionDailyPrevClose}
          last={dailyLast}
          qty={qty}
        />
      </DenseTableCell>

      <DenseTableCell className={denseTableNumCell}>
        <LiveStackedPnlCell
          pct={(() => {
            const dl = quoteDisplayLast(q ?? undefined)
            if (avgCost == null || !Number.isFinite(avgCost) || avgCost <= 0 || dl == null) return null
            return ((dl - avgCost) / avgCost) * 100
          })()}
          dollar={pnlCost}
          formatPct={v => `${v.toFixed(2)}%`}
          formatDollar={v => fmtUsd(v, true)}
        />
      </DenseTableCell>
    </tr>
  )
}
