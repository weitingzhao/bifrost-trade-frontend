import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { MarketStreamsRow } from '@/utils/marketStreamsRows'
import {
  formatExpiry,
  formatOptionRightLabel,
  formatStrike,
  watchlistItemLabel,
} from '@/utils/watchlistHelpers'
import { MarketStreamStkRow } from './MarketStreamStkRow'
import { OptionQuoteLastBidAsk } from './OptionQuoteLastBidAsk'
import styles from './live.module.css'

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
    <div className={styles.card}>
      <div className={styles.paneTitleRow}>
        <StatusLamp lamp={streamsLamp} />
        <h2 className={styles.paneTitle}>
          Watching Stocks
          <InfoTooltip text='STK symbols whose Watchlist category is Watching. Stock quotes and daily % match Market Streams; Host/Secondary and position qty/cost are omitted here.' />
        </h2>
      </div>
      {rows.length === 0 ? (
        <p className={styles.emptyHint}>No STK symbols with Watchlist category Watching</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Watching stocks quotes">
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th title="Last price; Bid and Ask shown as spread vs Last">Last (Bid / Ask)</th>
                <th className={styles.pnlStackedTh}>
                  Daily
                  <span className={styles.pnlStackedSub}>% / $</span>
                </th>
                <th className={styles.pnlStackedTh}>
                  SINCE
                  <span className={styles.pnlStackedSub}>% / $</span>
                </th>
              </tr>
            </thead>
            <tbody>
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
            </tbody>
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
    <div className={styles.watchingOptionsPane}>
      <div className={styles.paneTitleRow}>
        <StatusLamp
          lamp={streamsLamp}
          title="Quotes: green when Market API can read Redis and IB ingestor is connected (OPT quotes via contract_quote_live)."
        />
        <h2 className={styles.paneTitle}>
          Watching Options
          <InfoTooltip text="Option contracts from Watchlist; quotes from daemon (contract_quote_live). Same quote-path health as Market Streams." />
        </h2>
      </div>
      {items.length === 0 ? (
        <p className={styles.emptyHint}>No option contracts on Watchlist</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Watching option quotes">
            <thead>
              <tr>
                <th scope="col">Symbol</th>
                <th title="Last price; Bid and Ask shown as spread vs Last">Last (Bid / Ask)</th>
                <th>Expiry</th>
                <th>Right</th>
                <th>Strike</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const q = quotesByContractKey[item.contract_key]
                const categoryName = (item.category ?? '').trim() || 'Uncategorized'
                return (
                  <tr key={item.contract_key}>
                    <td className={styles.symbolCell} title={item.contract_key}>
                      {watchlistItemLabel(item)}
                    </td>
                    <td className={cn(styles.numCell, styles.lastBidAsk)}>
                      <OptionQuoteLastBidAsk quote={q} />
                    </td>
                    <td>{formatExpiry(item.expiry)}</td>
                    <td>{formatOptionRightLabel(item.option_right)}</td>
                    <td className={styles.numCell}>{formatStrike(item.strike)}</td>
                    <td>{categoryName}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
