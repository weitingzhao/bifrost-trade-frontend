import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSystemMessages, subscribeSystemMessages } from '@/api/messages'
import type { SystemMessage } from '@/types/messages'
import { QUERY_KEYS } from '@/constants/queryKeys'

const INITIAL_LIMIT = 50
const IB_CONN_DISMISS_SEC = 30
const CLIENT_TTL_SEC = 3600

function mergeMessages(prev: SystemMessage[], incoming: SystemMessage[]): SystemMessage[] {
  const map = new Map(prev.map((m) => [m.message_id, m]))
  for (const m of incoming) map.set(m.message_id, m)
  return [...map.values()].sort((a, b) => b.occurred_at - a.occurred_at)
}

function pruned(msgs: SystemMessage[]): SystemMessage[] {
  const cutoff = Date.now() / 1000 - CLIENT_TTL_SEC
  return msgs.filter((m) => m.occurred_at > cutoff)
}

export function useSystemMessages() {
  const queryClient = useQueryClient()
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Initial load via TanStack Query — gives proper loading/error states.
  const { data: messages = [] } = useQuery<SystemMessage[]>({
    queryKey: QUERY_KEYS.market.systemMessages,
    queryFn: async () => {
      const res = await fetchSystemMessages(INITIAL_LIMIT)
      return pruned(res.messages)
    },
    staleTime: Infinity,   // SSE keeps it fresh; no background refetch needed
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  })

  // SSE subscription — pushes new messages into the Query cache.
  useEffect(() => {
    const unsub = subscribeSystemMessages((msg) => {
      queryClient.setQueryData<SystemMessage[]>(QUERY_KEYS.market.systemMessages, (prev) =>
        mergeMessages(pruned(prev ?? []), [msg]),
      )
    })
    return unsub
  }, [queryClient])

  // Auto-dismiss ib.connection messages after 30 seconds.
  useEffect(() => {
    const tm = timersRef.current
    for (const msg of messages) {
      if (tm.has(msg.message_id)) continue
      if (msg.topic !== 'ib.connection') continue
      const age = Date.now() / 1000 - msg.occurred_at
      const ms = Math.max(0, (IB_CONN_DISMISS_SEC - age) * 1000)
      const id = msg.message_id
      tm.set(
        id,
        setTimeout(() => {
          setDismissedIds((prev) => new Set([...prev, id]))
          tm.delete(id)
        }, ms),
      )
    }
  }, [messages])

  const dismissMessage = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
    const t = timersRef.current.get(id)
    if (t != null) {
      clearTimeout(t)
      timersRef.current.delete(id)
    }
  }, [])

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(messages.map((m) => m.message_id)))
    for (const t of timersRef.current.values()) clearTimeout(t)
    timersRef.current.clear()
  }, [messages])

  const activeMsgCount = messages.filter((m) => !dismissedIds.has(m.message_id)).length

  return { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll }
}
