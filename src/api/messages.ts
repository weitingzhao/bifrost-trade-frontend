import type { SystemMessagesResponse, SystemMessage } from '@/types/messages'

const BASE = import.meta.env.VITE_API_MONITOR as string

export async function fetchSystemMessages(limit = 50): Promise<SystemMessagesResponse> {
  const res = await fetch(`${BASE}/api/messages?limit=${limit}`)
  if (!res.ok) throw new Error(`Messages: ${res.status}`)
  return res.json() as Promise<SystemMessagesResponse>
}

export function subscribeSystemMessages(
  onMessage: (msg: SystemMessage) => void,
): () => void {
  const es = new EventSource(`${BASE}/api/messages/stream`)
  es.onmessage = (e: MessageEvent<string>) => {
    try {
      onMessage(JSON.parse(e.data) as SystemMessage)
    } catch {
      // ignore malformed frames
    }
  }
  return () => es.close()
}
