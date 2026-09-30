/**
 * Review records, one per instance (design Rev .110) — read by Queue, Single
 * trade and the Review menu badge, so the three can never disagree about what
 * is still awaiting a look.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchTradeReviews, saveTradeReview, type TradeReview, type TradeReviewPatch } from '@/api/tradeReviews'
import { fetchExecutions } from '@/api/trading'
import type { ExecutionsResponse } from '@/types/positions'
import { buildReviewInstances } from '@/utils/reviewInstances'

export function useTradeReviews() {
  const q = useQuery({
    queryKey: QUERY_KEYS.strategy.reviews,
    queryFn: fetchTradeReviews,
    staleTime: 30_000,
  })
  const byInstance = useMemo(
    () => new Map<number, TradeReview>((q.data ?? []).map((r) => [r.strategy_instance_id, r])),
    [q.data],
  )
  return { ...q, byInstance }
}

export function useSaveTradeReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ instanceId, patch }: { instanceId: number; patch: TradeReviewPatch }) =>
      saveTradeReview(instanceId, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.strategy.reviews }),
  })
}

/**
 * The Review menu's "N to review": closed instances with no confirmed review.
 *
 * The sidebar is on every page, and the fills behind "closed" are the heaviest
 * read in the app — so the badge never fetches them. It reads whatever the
 * canonical executions query already holds (any Review, Ledger or Positions
 * visit fills it) and stays blank until then, rather than pulling the whole
 * book on every navigation.
 *
 * `enabled: false` is what keeps it from fetching; the queryFn is still given
 * because TanStack reads the query's options from its latest observer, and a
 * refetch or invalidation driven by useExecutionsCanonical would otherwise log
 * "No queryFn was passed" whenever the badge happened to be that observer.
 */
export function useReviewBadge(): number | null {
  const execQ = useQuery<ExecutionsResponse>({
    queryKey: ['trading', 'executions', 'canonical'],
    queryFn: () => fetchExecutions('canonical'),
    enabled: false,
  })
  const reviews = useTradeReviews()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  return useMemo(() => {
    const items = execQ.data?.items
    if (!items || !reviews.data) return null
    return buildReviewInstances(items, today).filter(
      (t) => !t.open && t.tradeId != null && !reviews.byInstance.get(t.tradeId)?.reviewed,
    ).length
  }, [execQ.data, reviews.data, reviews.byInstance, today])
}
