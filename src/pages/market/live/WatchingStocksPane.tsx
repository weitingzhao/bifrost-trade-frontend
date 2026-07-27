import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import type { MarketStreamsRow } from '@/utils/marketStreamsRows'
import {
  formatExpiry,
  formatOptionRightLabel,
  formatStrike,
  watchlistItemLabel,
} from '@/utils/watchlistHelpers'
import { MarketStreamStkRow } from './MarketStreamStkRow'
import { OptionQuoteLastBidAsk } from './OptionQuoteLastBidAsk'
import { liveTable } from './liveTableClasses'
import {
  liveEmptyHintClass,
  liveOpenOrdersSubtitleClass,
  livePaneClass,
  livePaneTitleClass,
  livePaneTitleRowClass,
} from './liveUi'

interface Props {
  watchingRows: MarketStreamsRow[]
  subscribedRows?: MarketStreamsRow[]
  benchmarks: Record<string, DailyBenchmark>
  quotesMap: Record<string, QuoteItem>
  streamsLamp: string
  hasStreamAccounts: boolean
  onSymbolReorder?: (category: string, fromSymbol: string, toSymbol: string) => void
}

function ObserveStkTable({
  rows,
  ariaLabel,
  benchmarks,
  quotesMap,
  hasStreamAccounts,
  showSourceBadge,
}: {
  rows: MarketStreamsRow[]
  ariaLabel: string
  benchmarks: Record<string, DailyBenchmark>
  quotesMap: Record<string, QuoteItem>
  hasStreamAccounts: boolean
  showSourceBadge: boolean
}) {
  return (
    <div className={liveTable.shell}>
      <table className={liveTable.table} aria-label={ariaLabel}>
        <DenseTableHeader className={liveTable.stickyThead}>
          <DenseTableHeadRow>
            <DenseTableHead scope="col">Symbol</DenseTableHead>
            <DenseTableHead title="Last price; Bid and Ask shown as spread vs Last">
              Last (Bid / Ask)
            </DenseTableHead>
            <DenseTableHead align="right" className={liveTable.stackedPnlHead}>
              Daily
              <span className={liveTable.stackedPnlHeadSub}>% / $</span>
            </DenseTableHead>
            {showSourceBadge ? (
              <DenseTableHead>Source</DenseTableHead>
            ) : (
              <DenseTableHead align="right" className={liveTable.stackedPnlHead}>
                SINCE
                <span className={liveTable.stackedPnlHeadSub}>% / $</span>
              </DenseTableHead>
            )}
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {rows.map(row => (
            <MarketStreamStkRow
              key={row.symbol}
              row={{ ...row, quote: quotesMap[row.symbol.toUpperCase()] ?? row.quote }}
              categoryForDrag="Watching"
              dragEnabled={false}
              watchingStocksSlim
              showSourceBadge={showSourceBadge}
              hasStreamAccounts={hasStreamAccounts}
              benchmarks={benchmarks}
            />
          ))}
        </DenseTableBody>
      </table>
    </div>
  )
}

export function WatchingStocksPane({
  watchingRows,
  subscribedRows = [],
  benchmarks,
  quotesMap,
  streamsLamp,
  hasStreamAccounts,
}: Props) {
  const hasWatching = watchingRows.length > 0
  const hasSubscribed = subscribedRows.length > 0
  const empty = !hasWatching && !hasSubscribed

  return (
    <div className={livePaneClass}>
      <div className={livePaneTitleRowClass}>
        <StatusLamp lamp={streamsLamp} />
        <h2 className={livePaneTitleClass}>
          Watching &amp; Subscribed
          <InfoTooltip text="Observe-only STK (no position). Watching: watchlist symbols. Subscribed: Gateway default and on-demand streams. Host/Secondary qty and cost are omitted here." />
        </h2>
      </div>
      {empty ? (
        <p className={liveEmptyHintClass}>No observe-only STK symbols</p>
      ) : (
        <div className="flex flex-col gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className={liveOpenOrdersSubtitleClass}>Watching</h3>
            {hasWatching ? (
              <ObserveStkTable
                rows={watchingRows}
                ariaLabel="Watching stocks quotes"
                benchmarks={benchmarks}
                quotesMap={quotesMap}
                hasStreamAccounts={hasStreamAccounts}
                showSourceBadge={false}
              />
            ) : (
              <p className={liveEmptyHintClass}>No watchlist STK symbols</p>
            )}
          </div>
          <div className="min-w-0">
            <h3 className={liveOpenOrdersSubtitleClass}>Subscribed</h3>
            {hasSubscribed ? (
              <ObserveStkTable
                rows={subscribedRows}
                ariaLabel="Subscribed stocks quotes"
                benchmarks={benchmarks}
                quotesMap={quotesMap}
                hasStreamAccounts={hasStreamAccounts}
                showSourceBadge
              />
            ) : (
              <p className={liveEmptyHintClass}>No gateway or on-demand STK symbols</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface WatchingOptionsProps {
  items: WatchlistItem[]
  quotesByContractKey: Record<string, QuoteItem>
  streamsLamp: string
}

export function WatchingOptionsPane({ items, quotesByContractKey, streamsLamp }: WatchingOptionsProps) {
  return (
    <div className={livePaneClass}>
      <div className={livePaneTitleRowClass}>
        <StatusLamp
          lamp={streamsLamp}
          title="Quotes: green when Market API can read Redis and IB ingestor is connected (OPT quotes via contract_quote_live)."
        />
        <h2 className={livePaneTitleClass}>
          Watching Options
          <InfoTooltip text="Option contracts from Watchlist; quotes from daemon (contract_quote_live). Same quote-path health as Market Streams." />
        </h2>
      </div>
      {items.length === 0 ? (
        <p className={liveEmptyHintClass}>No option contracts on Watchlist</p>
      ) : (
        <div className={liveTable.shell}>
          <table className={liveTable.table} aria-label="Watching option quotes">
            <DenseTableHeader className={liveTable.stickyThead}>
              <DenseTableHeadRow>
                <DenseTableHead scope="col">Symbol</DenseTableHead>
                <DenseTableHead title="Last price; Bid and Ask shown as spread vs Last">
                  Last (Bid / Ask)
                </DenseTableHead>
                <DenseTableHead>Expiry</DenseTableHead>
                <DenseTableHead>Right</DenseTableHead>
                <DenseTableHead align="right">Strike</DenseTableHead>
                <DenseTableHead>Category</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {items.map(item => {
                const q = quotesByContractKey[item.contract_key]
                const categoryName = (item.category ?? '').trim() || 'Uncategorized'
                return (
                  <DenseTableRow key={item.contract_key}>
                    <DenseTableCell className={denseTableEntityCell} title={item.contract_key}>
                      <span className={cn(denseTableEntityLink, 'font-mono font-semibold text-entity-option')}>
                        {watchlistItemLabel(item)}
                      </span>
                    </DenseTableCell>
                    <DenseTableCell className={cn(denseTableNumCell, liveTable.lastBidAsk)}>
                      <OptionQuoteLastBidAsk quote={q} />
                    </DenseTableCell>
                    <DenseTableCell>{formatExpiry(item.expiry)}</DenseTableCell>
                    <DenseTableCell>{formatOptionRightLabel(item.option_right)}</DenseTableCell>
                    <DenseTableCell className={denseTableNumCell}>{formatStrike(item.strike)}</DenseTableCell>
                    <DenseTableCell>
                      <DenseTag variant="category" size="cell">
                        {categoryName}
                      </DenseTag>
                    </DenseTableCell>
                  </DenseTableRow>
                )
              })}
            </DenseTableBody>
          </table>
        </div>
      )}
    </div>
  )
}
