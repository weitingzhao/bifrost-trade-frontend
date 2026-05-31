import { renderQuoteLastBidAsk } from '@/utils/watchlistHelpers'
import type { QuoteItem } from '@/types/market'
import styles from './watchlist.module.css'

export function QuoteCell({ quote }: { quote: QuoteItem | undefined }) {
  const { last, bidAsk } = renderQuoteLastBidAsk(quote)
  return (
    <span>
      <span className={styles.quoteLast}>{last}</span>
      {bidAsk != null && <span className={styles.quoteBa}>{bidAsk}</span>}
    </span>
  )
}
