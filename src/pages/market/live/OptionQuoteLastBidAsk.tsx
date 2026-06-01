import type { QuoteItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import styles from './live.module.css'

interface Props {
  quote: QuoteItem | undefined
}

/** Last + bid/ask spread vs Last (Legacy renderLastBidAskOption). */
export function OptionQuoteLastBidAsk({ quote }: Props) {
  if (!quote) return <>—</>

  const ref = quoteDisplayLast(quote)
  const bid = quote.bid != null && Number.isFinite(quote.bid) ? quote.bid : null
  const ask = quote.ask != null && Number.isFinite(quote.ask) ? quote.ask : null
  const bidDiff = ref != null && bid != null ? bid - ref : null
  const askDiff = ref != null && ask != null ? ask - ref : null

  return (
    <>
      {ref != null ? fmtUsd(ref) : '—'}
      {bidDiff != null && (
        <span
          className={cn(
            styles.quoteSpread,
            pnlColorClass(bidDiff),
          )}
          title="Bid vs Last"
        >
          {' '}
          {Math.abs(bidDiff).toFixed(2)}
        </span>
      )}
      {askDiff != null && (
        <span
          className={cn(
            styles.quoteSpread,
            pnlColorClass(askDiff),
          )}
          title="Ask vs Last"
        >
          {' '}
          {Math.abs(askDiff).toFixed(2)}
        </span>
      )}
    </>
  )
}
