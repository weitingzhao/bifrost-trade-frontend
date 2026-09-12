import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSystemMessages, subscribeSystemMessages } from '@/api/messages'
import type { SystemMessage } from '@/types/messages'
import { QUERY_KEYS } from '@/constants/queryKeys'

const INITIAL_LIMIT = 50
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

  // `ib.connection` messages used to auto-dismiss after 30 seconds. That was a
  // workaround for the toast: every message interrupted, so the noisiest topic
  // was given a timer to make it stop. Now that it never toasts (see
  // `toastPolicy.ts`), the timer would leave it neither shown nor kept — it
  // would vanish from the Inbox count half a minute after arriving, which is
  // the one place it was supposed to end up. `CLIENT_TTL_SEC` still bounds the
  // list; dismissal is the reader's call again.
  const dismissMessage = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]))
  }, [])

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(messages.map((m) => m.message_id)))
  }, [messages])

  const activeMsgCount = messages.filter((m) => !dismissedIds.has(m.message_id)).length

  return { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll }
}
