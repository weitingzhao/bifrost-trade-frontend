import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCopilotSessions } from '@/api/researchCopilotSessions'

/**
 * List Copilot sessions with automatic refresh after each finished chat turn.
 *
 * The `copilot:turn-done` window event is dispatched by `useCopilotSession`
 * when the SSE stream emits a `done` frame — that's exactly when the backend
 * persists the session (best-effort). Invalidating the query at that point
 * guarantees a new session shows up in the "Chat history" rail without waiting
 * for the 15s staleTime.
 */
export function useCopilotSessions(limit = 20) {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['research', 'copilot', 'sessions', limit],
    queryFn: () => fetchCopilotSessions(limit),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    function refresh() {
      qc.invalidateQueries({ queryKey: ['research', 'copilot', 'sessions'] })
    }
    window.addEventListener('copilot:turn-done', refresh)
    return () => window.removeEventListener('copilot:turn-done', refresh)
  }, [qc])

  return q
}
