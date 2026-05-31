import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchMonitorStatus, postRefreshAccounts } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'

const POLL_INTERVAL_MS = 2_000
const POLL_DEADLINE_MS = 30_000

export function useAccountsRefresh(accountsFetchedAt: number | null | undefined) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setFeedback(null)
    const requestedAt = Date.now() / 1000
    const baselineFetchedAt = accountsFetchedAt ?? null

    try {
      const res = await postRefreshAccounts()
      if (!res.ok) {
        setFeedback(res.error ?? 'Refresh request failed')
        return
      }

      let refreshed = false
      const deadline = Date.now() + POLL_DEADLINE_MS

      while (Date.now() < deadline) {
        const status = await fetchMonitorStatus()
        void queryClient.setQueryData(QUERY_KEYS.monitor.status, status)

        const fetchedAt = status.portfolio?.accounts_fetched_at
        if (fetchedAt != null && fetchedAt > requestedAt) {
          setFeedback('Refreshed')
          refreshed = true
          break
        }
        if (baselineFetchedAt != null && fetchedAt != null && fetchedAt > baselineFetchedAt) {
          setFeedback('Refreshed')
          refreshed = true
          break
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }

      if (!refreshed) {
        setFeedback('Request sent; no data update detected yet. Try again later.')
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Network or API error')
    } finally {
      setIsRefreshing(false)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    }
  }, [accountsFetchedAt, queryClient])

  return { refresh, isRefreshing, feedback }
}
