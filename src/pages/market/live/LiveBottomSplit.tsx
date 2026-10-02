import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import type { OpenOrder } from '@/types/market'
import type { MarketStreamsRow } from '@/utils/marketStreamsRows'
import { OpenOrdersPane } from './OpenOrdersPane'
import { WatchingOptionsPane, WatchingStocksPane } from './WatchingStocksPane'
import {
  liveSplitBodyClass,
  liveSplitGridClass,
  liveSplitOuterCardClass,
  liveSplitRightColClass,
  liveSplitWatchingColClass,
} from './liveUi'

interface Props {
  watchingRows: MarketStreamsRow[]
  subscribedRows: MarketStreamsRow[]
  watchingOptions: WatchlistItem[]
  optOrders: OpenOrder[]
  stkOrders: OpenOrder[]
  benchmarks: Record<string, DailyBenchmark>
  quotesMap: Record<string, QuoteItem>
  quotesByContractKey: Record<string, QuoteItem>
  streamsLamp: string
  hasStreamAccounts: boolean
  openOrdersUpdatedAt: number | null
}

export function LiveBottomSplit({
  watchingRows,
  subscribedRows,
  watchingOptions,
  optOrders,
  stkOrders,
  benchmarks,
  quotesMap,
  quotesByContractKey,
  streamsLamp,
  hasStreamAccounts,
  openOrdersUpdatedAt,
}: Props) {
  return (
    <div className={liveSplitOuterCardClass}>
      <div
        className={liveSplitBodyClass}
        role="group"
        aria-label="Watching and subscribed stocks, Watching options, and open orders"
      >
        <div className={liveSplitGridClass}>
          <div className={liveSplitWatchingColClass}>
            <WatchingStocksPane
              watchingRows={watchingRows}
              subscribedRows={subscribedRows}
              benchmarks={benchmarks}
              quotesMap={quotesMap}
              streamsLamp={streamsLamp}
              hasStreamAccounts={hasStreamAccounts}
            />
          </div>
          <div className={liveSplitRightColClass}>
            <WatchingOptionsPane
              items={watchingOptions}
              quotesByContractKey={quotesByContractKey}
              streamsLamp={streamsLamp}
            />
            <OpenOrdersPane
              optOrders={optOrders}
              stkOrders={stkOrders}
              openOrdersUpdatedAt={openOrdersUpdatedAt}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
