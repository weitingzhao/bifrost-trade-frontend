import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchMonitorStatus, postRefreshAccounts } from '@/api/monitor'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { HttpError } from '@/lib/http'

const POLL_INTERVAL_MS = 2_000
const POLL_DEADLINE_MS = 30_000

/** How the line under the page head reads: refreshed, still waiting, or refused. */
export type AccountsRefreshTone = 'success' | 'muted' | 'warning'

/**
 * What a refused refresh says. The server's reason when it gave one (api 0.12.2:
 * "IB is not connected on the host slot: …"), under the action's name so the
 * line reads on its own; otherwise the request's own message (status line, network).
 */
export function refreshFailureText(e: unknown): string {
  if (e instanceof HttpError && e.detail) return `Refresh accounts: ${e.detail}`
  return e instanceof Error ? e.message : 'Refresh accounts: network or API error'
}

export function useAccountsRefresh(accountsFetchedAt: number | null | undefined) {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackTone, setFeedbackTone] = useState<AccountsRefreshTone>('muted')

  const refresh = useCallback(async () => {
    const say = (text: string, tone: AccountsRefreshTone) => {
      setFeedback(text)
      setFeedbackTone(tone)
    }
    setIsRefreshing(true)
    setFeedback(null)
    const requestedAt = Date.now() / 1000
    const baselineFetchedAt = accountsFetchedAt ?? null

    try {
      // Throws on a refusal (503 when IB is not connected), with the server's reason.
      await postRefreshAccounts()

      let refreshed = false
      const deadline = Date.now() + POLL_DEADLINE_MS

      while (Date.now() < deadline) {
        const status = await fetchMonitorStatus()
        void queryClient.setQueryData(QUERY_KEYS.monitor.status, status)

        const fetchedAt = status.portfolio?.accounts_fetched_at
        if (fetchedAt != null && fetchedAt > requestedAt) {
          refreshed = true
          break
        }
        if (baselineFetchedAt != null && fetchedAt != null && fetchedAt > baselineFetchedAt) {
          refreshed = true
          break
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }

      if (refreshed) say('Refreshed', 'success')
      else say('Request sent; no data update detected yet. Try again later.', 'muted')
    } catch (e) {
      say(refreshFailureText(e), 'warning')
    } finally {
      setIsRefreshing(false)
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
    }
  }, [accountsFetchedAt, queryClient])

  return { refresh, isRefreshing, feedback, feedbackTone }
}
