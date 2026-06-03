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
  livePaneClass,
  livePaneTitleClass,
  livePaneTitleRowClass,
} from './liveUi'

interface Props {
  rows: MarketStreamsRow[]
  benchmarks: Record<string, DailyBenchmark>
  quotesMap: Record<string, QuoteItem>
  streamsLamp: string
  hasStreamAccounts: boolean
  onSymbolReorder?: (category: string, fromSymbol: string, toSymbol: string) => void
}

export function WatchingStocksPane({
  rows,
  benchmarks,
  quotesMap,
  streamsLamp,
  hasStreamAccounts,
}: Props) {
  return (
    <div className={livePaneClass}>
      <div className={livePaneTitleRowClass}>
        <StatusLamp lamp={streamsLamp} />
        <h2 className={livePaneTitleClass}>
          Watching Stocks
          <InfoTooltip text='STK symbols whose Watchlist category is Watching. Stock quotes and daily % match Market Streams; Host/Secondary and position qty/cost are omitted here.' />
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className={liveEmptyHintClass}>No STK symbols with Watchlist category Watching</p>
      ) : (
        <div className={liveTable.shell}>
          <table className={liveTable.table} aria-label="Watching stocks quotes">
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
                <DenseTableHead align="right" className={liveTable.stackedPnlHead}>
                  SINCE
                  <span className={liveTable.stackedPnlHeadSub}>% / $</span>
                </DenseTableHead>
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
                  hasStreamAccounts={hasStreamAccounts}
                  benchmarks={benchmarks}
                />
              ))}
            </DenseTableBody>
          </table>
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
