/**
 * One reviewed instance's path (design Rev .104), and the underlying beneath it.
 *
 * A closed single-leg instance is a contract: it keeps the contract path and
 * its exact held-to-expiry branch (`useContractMarkPath`'s reading). Anything
 * else — a roll, a spread, or an instance still open — is the multi-leg line
 * (`buildTradePath`), which has no do-nothing branch: holding a rolled
 * instance to expiry means holding its last legs, and an open one has not
 * settled.
 */
import { useQuery } from '@tanstack/react-query'
import {
  fetchOptionDailyBars,
  fetchStockDailyCloses,
  occToOptionTicker,
  type DailyBar,
} from '@/api/marketData/dailyBars'
import { buildExpiryBranch, buildMarkPath } from '@/utils/reviewMarkPath'
import { buildTradePath } from '@/utils/reviewTradePath'
import type { ReviewedTrade } from '@/utils/reviewedTrades'
import type { TradeMarkPath } from '@/hooks/useContractMarkPath'

const EMPTY: TradeMarkPath = { path: null, expiryBranch: null, underlying: [], optionTicker: null }

/** The query for one instance's path — shared by the page and its Compared-with peers. */
export function tradePathQuery(inst: ReviewedTrade | null, today: string) {
  const single = inst != null && inst.legs.length === 1 && !inst.open
  const tickers = (inst?.legs ?? []).map((l) => [l.contractKey, occToOptionTicker(l.contractKey)] as const)
  const from = inst?.openedOn ?? null
  const lastExpiry = (inst?.legs ?? []).map((l) => l.expiry).filter(Boolean).sort().pop() ?? null
  // A single closed contract reads on to expiry (its do-nothing branch); every
  // other line ends at the close, or today.
  const to = inst == null ? null : single ? (lastExpiry && lastExpiry < today ? lastExpiry : today) : (inst.closedOn ?? today)
  const enabled = Boolean(inst && from && to && tickers.every(([, t]) => t))
  return {
    queryKey: ['review', 'tradePath', inst?.contractKey, tickers.map(([, t]) => t).join(','), from, to] as const,
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<TradeMarkPath> => {
      if (!inst || !from || !to) return EMPTY
      const [legBars, underlying] = await Promise.all([
        Promise.all(tickers.map(async ([key, t]) => [key, t ? await fetchOptionDailyBars(t, from, to) : []] as const)),
        fetchStockDailyCloses(inst.underlying, from, to).catch(() => [] as DailyBar[]),
      ])
      const barsByKey = new Map<string, DailyBar[]>(legBars.map(([k, b]) => [k, [...b]]))
      if (single) {
        const bars = barsByKey.get(inst.legs[0].contractKey) ?? []
        return {
          path: buildMarkPath(inst, bars),
          expiryBranch: buildExpiryBranch(inst, underlying, today),
          underlying,
          optionTicker: tickers[0][1],
        }
      }
      return { path: buildTradePath(inst, barsByKey, today), expiryBranch: null, underlying, optionTicker: tickers[0]?.[1] ?? null }
    },
  }
}

export function useTradePath(inst: ReviewedTrade | null, today: string) {
  const q = tradePathQuery(inst, today)
  const query = useQuery(q)
  return {
    ...(query.data ?? EMPTY),
    loading: q.enabled && query.isLoading,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  }
}
