import type { DailyBenchmark } from '@/types/market'
import { cn } from '@/lib/utils'
import {
  DenseTableCell,
  DenseTag,
  InlinePnl,
  denseTableEntityCell,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import { getDailyRefTooltip } from '@/utils/marketStreamsDailyTotals'
import { getQuoteFreshness, quoteFreshnessTitle } from '@/utils/quoteFreshness'
import { symbolSourceLabel, type MarketStreamsRow } from '@/utils/marketStreamsRows'
import {
  resolveStkAccountMetrics,
  resolveStkDailyMetrics,
  sincePctFromAvg,
  type StreamAccountViewMode,
} from '@/utils/streamAccountView'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import { AccountMetricCells } from './AccountMetricCells'
import { AccountDailyCells } from './AccountDailyCells'
import { AccountSinceCells } from './AccountSinceCells'
import { DailyCalcBreakdown } from './DailyCalcBreakdown'
import { LiveStackedPnlCell } from './LiveStackedPnlCell'
import { liveSymbolFreshnessTagClass, liveTable } from './liveTableClasses'
import styles from './live.module.css'

interface Props {
  row: MarketStreamsRow
  categoryForDrag: string
  dragEnabled: boolean
  watchingStocksSlim?: boolean
  /** When slim: show Source badge instead of Since (Subscribed section). */
  showSourceBadge?: boolean
  hasStreamAccounts: boolean
  accountViewMode?: StreamAccountViewMode
  benchmarks: Record<string, DailyBenchmark>
  onSymbolReorder?: (category: string, fromSymbol: string, toSymbol: string) => void
}

export function MarketStreamStkRow({
  row,
  categoryForDrag,
  dragEnabled,
  watchingStocksSlim = false,
  showSourceBadge = false,
  hasStreamAccounts,
  accountViewMode = 'combine',
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
    positionDailyPrevClose,
  } = row

  const symbolFreshness = getQuoteFreshness(q?.ts)
  const symBench = benchmarks[(symbol || '').trim().toUpperCase()]
  const dailyLast = quoteDisplayLast(q ?? undefined)
  const accountMetrics = resolveStkAccountMetrics(row, accountViewMode)
  const dailyMetrics = resolveStkDailyMetrics(row, accountViewMode)
  const sinceQty = accountMetrics.kind === 'single' ? accountMetrics.qty : qty
  const sinceAvgCost = accountMetrics.kind === 'single' ? accountMetrics.avgCost : avgCost
  const sincePnl = accountMetrics.kind === 'single' ? accountMetrics.pnl : pnlCost
  const sincePct = sincePctFromAvg(sinceAvgCost, dailyLast)

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
        className={denseTableEntityCell}
        title={[quoteFreshnessTitle(symbolFreshness), getDailyRefTooltip(symBench, dailyLast)]
          .filter(Boolean)
          .join('\n') || undefined}
      >
        <span className="inline-flex min-w-0 max-w-full items-center gap-1">
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
          <strong
            className={cn(
              'font-semibold text-entity-symbol',
              liveSymbolFreshnessTagClass(symbolFreshness),
            )}
          >
            {symbol}
          </strong>
        </span>
      </DenseTableCell>

      {!watchingStocksSlim && hasStreamAccounts && (
        <AccountMetricCells metrics={accountMetrics} />
      )}

      {!watchingStocksSlim && !hasStreamAccounts && (
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

      {!watchingStocksSlim ? (
        <AccountDailyCells
          metrics={
            hasStreamAccounts
              ? dailyMetrics
              : { kind: 'single', pct: changePct, dollar: pnlVsBench }
          }
          className={cn(denseTableNumCell, styles.dailyCalcCell)}
        >
          <DailyCalcBreakdown
            symbol={(symbol || '').trim() || '—'}
            bench={symBench}
            positionDailyPrevClose={positionDailyPrevClose}
            last={dailyLast}
            qty={sinceQty}
          />
        </AccountDailyCells>
      ) : (
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
            qty={sinceQty}
          />
        </DenseTableCell>
      )}

      {!watchingStocksSlim && hasStreamAccounts && (
        <AccountSinceCells metrics={accountMetrics} lastPrice={dailyLast} />
      )}

      {!watchingStocksSlim && !hasStreamAccounts && (
        <>
          <DenseTableCell className={denseTableNumCell}>
            {sincePnl != null && Number.isFinite(sincePnl) ? (
              <InlinePnl value={sincePnl}>{fmtUsd(sincePnl, true)}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
          <DenseTableCell className={denseTableNumCell}>
            {sincePct != null ? (
              <InlinePnl value={sincePct}>{`${Math.abs(sincePct).toFixed(2)}%`}</InlinePnl>
            ) : (
              '—'
            )}
          </DenseTableCell>
        </>
      )}

      {watchingStocksSlim &&
        (showSourceBadge ? (
          <DenseTableCell>
            <DenseTag variant="category" size="cell">
              {symbolSourceLabel(row.symbolSource)}
            </DenseTag>
          </DenseTableCell>
        ) : (
          <DenseTableCell className={denseTableNumCell}>
            <LiveStackedPnlCell
              pct={sincePct}
              dollar={pnlCost}
              formatPct={v => `${v.toFixed(2)}%`}
              formatDollar={v => fmtUsd(v, true)}
            />
          </DenseTableCell>
        ))}
    </tr>
  )
}
