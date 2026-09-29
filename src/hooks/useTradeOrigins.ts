import { useMemo } from 'react'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { originsByTrade, type TradeOrigin } from '@/utils/tradeOrigin'

/**
 * The plan behind every trade (Rev .112), read once and shared by Queue,
 * Trade review, Playbook › Record and the Trade page, so all four agree on a
 * trade's source and on the date its plan said to be out by.
 */
export function useTradeOrigins(): {
  byTrade: ReadonlyMap<number, TradeOrigin>
  exitBy: ReadonlyMap<number, string | null>
  loading: boolean
  failed: boolean
} {
  const plans = useStrategyPlans({ limit: 500 })
  return useMemo(() => {
    const byTrade = originsByTrade(plans.data?.items ?? [])
    const exitBy = new Map([...byTrade].map(([id, o]) => [id, o.exitBy]))
    return { byTrade, exitBy, loading: plans.isLoading, failed: plans.isError }
  }, [plans.data?.items, plans.isLoading, plans.isError])
}
