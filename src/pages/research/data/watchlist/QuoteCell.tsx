import { renderQuoteLastBidAsk } from '@/utils/watchlistHelpers'
import type { QuoteItem } from '@/types/market'
import {
  watchlistQuoteBaClass,
  watchlistQuoteLastClass,
  watchlistQuoteStackClass,
  watchlistSizingSheetQuoteStackClass,
} from './watchlistUi'

export function QuoteCell({ quote, compact }: { quote: QuoteItem | undefined; compact?: boolean }) {
  const { last, bidAsk } = renderQuoteLastBidAsk(quote)
  return (
    <span className={compact ? watchlistSizingSheetQuoteStackClass : watchlistQuoteStackClass}>
      <span className={watchlistQuoteLastClass}>{last}</span>
      {bidAsk != null && <span className={watchlistQuoteBaClass}>{bidAsk}</span>}
    </span>
  )
}
