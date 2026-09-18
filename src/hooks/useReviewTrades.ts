/**
 * The closed trades every Review page reads.
 *
 * Five pages ask different questions of one list — the queue, one trade's fit,
 * the habits across them, what each play has done, and what rule that argues
 * for. They read the same derivation so the queue's count, the habits' sample
 * and a play's `n` are always the same trades (§14.2).
 */
import { useMemo } from 'react'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { buildReviewTrades, playbookStats } from '@/utils/reviewTrades'

export function useReviewTrades(accountFilter: string) {
  const execQuery = useExecutionsCanonical()

  const scoped = useMemo(() => {
    const rows = execQuery.data?.items ?? []
    return accountFilter === 'all' ? rows : rows.filter((e) => (e.account_id ?? '').trim() === accountFilter)
  }, [execQuery.data?.items, accountFilter])

  const { trades, expiredUnbooked } = useMemo(() => buildReviewTrades(scoped), [scoped])
  const plays = useMemo(() => playbookStats(trades), [trades])

  const accountIds = useMemo(
    () => [...new Set((execQuery.data?.items ?? []).map((e) => (e.account_id ?? '').trim()).filter(Boolean))].sort(),
    [execQuery.data?.items],
  )

  return {
    trades,
    expiredUnbooked,
    plays,
    accountIds,
    loading: execQuery.isLoading,
    error: execQuery.error ?? null,
    refetch: () => void execQuery.refetch(),
  }
}
