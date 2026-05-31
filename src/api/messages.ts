import type { SystemMessagesResponse, SystemMessage } from '@/types/messages'
import { openSseWithBackoff } from '@/lib/sse'

const BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchSystemMessages(limit = 50): Promise<SystemMessagesResponse> {
  const res = await fetch(`${BASE}/api/messages?limit=${limit}`)
  if (!res.ok) throw new Error(`Messages: ${res.status}`)
  return res.json() as Promise<SystemMessagesResponse>
}

export function subscribeSystemMessages(
  onMessage: (msg: SystemMessage) => void,
): () => void {
  return openSseWithBackoff(`${BASE}/api/messages/stream`, (raw) => {
    try {
      onMessage(JSON.parse(raw) as SystemMessage)
    } catch {
      // ignore malformed frames
    }
  })
}
