import { useState, useEffect, useRef } from 'react'
import { fetchSystemMessages, subscribeSystemMessages } from '@/api/messages'
import type { SystemMessage } from '@/types/messages'

const INITIAL_LIMIT = 50
const IB_CONN_DISMISS_SEC = 30
const CLIENT_TTL_SEC = 3600

function mergeMessages(prev: SystemMessage[], incoming: SystemMessage[]): SystemMessage[] {
  const map = new Map(prev.map(m => [m.message_id, m]))
  for (const m of incoming) map.set(m.message_id, m)
  return [...map.values()].sort((a, b) => b.occurred_at - a.occurred_at)
}

function pruned(msgs: SystemMessage[]): SystemMessage[] {
  const cutoff = Date.now() / 1000 - CLIENT_TTL_SEC
  return msgs.filter(m => m.occurred_at > cutoff)
}

export function useSystemMessages() {
  const [messages, setMessages] = useState<SystemMessage[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Initial fetch + SSE subscription
  useEffect(() => {
    let cancelled = false
    const timers = timersRef.current

    fetchSystemMessages(INITIAL_LIMIT)
      .then(res => { if (!cancelled) setMessages(pruned(res.messages)) })
      .catch(() => {})

    const unsub = subscribeSystemMessages(msg => {
      if (!cancelled) setMessages(prev => mergeMessages(pruned(prev), [msg]))
    })

    return () => {
      cancelled = true
      unsub()
      for (const t of timers.values()) clearTimeout(t)
    }
  }, [])

  // Auto-dismiss ib.connection messages after 30 seconds
  useEffect(() => {
    const tm = timersRef.current
    for (const msg of messages) {
      if (tm.has(msg.message_id)) continue
      if (msg.topic !== 'ib.connection') continue
      const age = Date.now() / 1000 - msg.occurred_at
      const ms = Math.max(0, (IB_CONN_DISMISS_SEC - age) * 1000)
      const id = msg.message_id
      tm.set(id, setTimeout(() => {
        setDismissedIds(prev => new Set([...prev, id]))
        tm.delete(id)
      }, ms))
    }
  }, [messages])

  function dismissMessage(id: string) {
    setDismissedIds(prev => new Set([...prev, id]))
    const t = timersRef.current.get(id)
    if (t != null) { clearTimeout(t); timersRef.current.delete(id) }
  }

  function dismissAll() {
    setDismissedIds(new Set(messages.map(m => m.message_id)))
    for (const t of timersRef.current.values()) clearTimeout(t)
    timersRef.current.clear()
  }

  const activeMsgCount = messages.filter(m => !dismissedIds.has(m.message_id)).length

  return { messages, dismissedIds, activeMsgCount, dismissMessage, dismissAll }
}
