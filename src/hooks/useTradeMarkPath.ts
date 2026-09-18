/**
 * One closed trade's mark path, and the underlying beneath it.
 *
 * Two reads into the market-data warehouse, both scoped to the one contract on
 * screen: the design's Single-trade page is the only surface that draws a path,
 * and a book-wide pull would be thousands of bars to draw one.
 *
 * The window runs from the opening fill to expiry rather than to the exit, so
 * the days after the exit arrive in the same series and become the design's
 * "after my exit, had I stayed" branch.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchOptionDailyBars,
  fetchStockDailyCloses,
  occToOptionTicker,
  type DailyBar,
} from '@/api/marketData/dailyBars'
import { buildExpiryBranch, buildMarkPath, type ExpiryBranch, type MarkPath } from '@/utils/reviewMarkPath'
import type { ReviewTrade } from '@/utils/reviewTrades'

export interface TradeMarkPath {
  path: MarkPath | null
  expiryBranch: ExpiryBranch | null
  underlying: DailyBar[]
  optionTicker: string | null
}

const EMPTY: TradeMarkPath = { path: null, expiryBranch: null, underlying: [], optionTicker: null }

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function useTradeMarkPath(trade: ReviewTrade | null) {
  const optionTicker = trade ? occToOptionTicker(trade.contractKey) : null
  const from = trade?.openedOn ?? null
  // Expiry, or today when the contract has not reached it — the vendor has no
  // bars past the last session either way.
  const to = trade?.expiry ? (trade.expiry < today() ? trade.expiry : today()) : null
  const enabled = Boolean(trade && optionTicker && from && to)

  const query = useQuery({
    queryKey: ['review', 'markPath', optionTicker, from, to],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<TradeMarkPath> => {
      if (!trade || !optionTicker || !from || !to) return EMPTY
      const [bars, underlying] = await Promise.all([
        fetchOptionDailyBars(optionTicker, from, to),
        fetchStockDailyCloses(trade.underlying, from, to).catch(() => [] as DailyBar[]),
      ])
      return {
        path: buildMarkPath(trade, bars),
        expiryBranch: buildExpiryBranch(trade, underlying, today()),
        underlying,
        optionTicker,
      }
    },
  })

  return {
    ...(query.data ?? EMPTY),
    optionTicker,
    loading: enabled && query.isLoading,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  }
}
