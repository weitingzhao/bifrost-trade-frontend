import { renderQuoteLastBidAsk } from '@/utils/watchlistHelpers'
import type { QuoteItem } from '@/types/market'
import {
  watchlistQuoteBaClass,
  watchlistQuoteLastClass,
  watchlistQuoteStackClass,
} from './watchlistUi'

export function QuoteCell({ quote }: { quote: QuoteItem | undefined }) {
  const { last, bidAsk } = renderQuoteLastBidAsk(quote)
  return (
    <span className={watchlistQuoteStackClass}>
      <span className={watchlistQuoteLastClass}>{last}</span>
      {bidAsk != null && <span className={watchlistQuoteBaClass}>{bidAsk}</span>}
    </span>
  )
}
