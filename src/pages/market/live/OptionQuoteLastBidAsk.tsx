import type { QuoteItem } from '@/types/market'
import { InlinePnl } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import { quoteDisplayLast } from '@/utils/watchlistHelpers'
import { liveTable } from './liveTableClasses'

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
        <span className={liveTable.quoteSpread} title="Bid vs Last">
          {' '}
          <InlinePnl value={bidDiff}>{Math.abs(bidDiff).toFixed(2)}</InlinePnl>
        </span>
      )}
      {askDiff != null && (
        <span className={liveTable.quoteSpread} title="Ask vs Last">
          {' '}
          <InlinePnl value={askDiff}>{Math.abs(askDiff).toFixed(2)}</InlinePnl>
        </span>
      )}
    </>
  )
}
