import type { DailyBenchmark, QuoteItem, WatchlistItem } from '@/types/market'
import type { OpenOrder } from '@/types/market'
import type { StatusResponse } from '@/types/monitor'
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
  watchingOptions: WatchlistItem[]
  optOrders: OpenOrder[]
  stkOrders: OpenOrder[]
  benchmarks: Record<string, DailyBenchmark>
  quotesMap: Record<string, QuoteItem>
  quotesByContractKey: Record<string, QuoteItem>
  streamsLamp: string
  ordersLamp: string
  hasStreamAccounts: boolean
  openOrdersUpdatedAt: number | null
  status: StatusResponse | undefined
}

export function LiveBottomSplit({
  watchingRows,
  watchingOptions,
  optOrders,
  stkOrders,
  benchmarks,
  quotesMap,
  quotesByContractKey,
  streamsLamp,
  ordersLamp,
  hasStreamAccounts,
  openOrdersUpdatedAt,
  status,
}: Props) {
  return (
    <div className={liveSplitOuterCardClass}>
      <div
        className={liveSplitBodyClass}
        role="group"
        aria-label="Watching stocks, Watching options, and open orders"
      >
        <div className={liveSplitGridClass}>
          <div className={liveSplitWatchingColClass}>
            <WatchingStocksPane
              rows={watchingRows}
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
              ordersLamp={ordersLamp}
              openOrdersUpdatedAt={openOrdersUpdatedAt}
              status={status}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
