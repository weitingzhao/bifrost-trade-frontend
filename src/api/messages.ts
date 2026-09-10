import type { SystemMessagesResponse, SystemMessage } from '@/types/messages'
import { openSseWithBackoff } from '@/lib/sse'
import { monitorUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { SystemMessagesResponseSchema } from '@/lib/schemas/platform'

const validateMessages = withValidation<SystemMessagesResponse>(
  SystemMessagesResponseSchema,
  'monitor/api/messages',
)


export async function fetchSystemMessages(limit = 50): Promise<SystemMessagesResponse> {
  const res = await fetch(monitorUrl(`/api/messages?limit=${limit}`))
  if (!res.ok) throw new Error(`Messages: ${res.status}`)
  return res.json().then(validateMessages)
}

export function subscribeSystemMessages(
  onMessage: (msg: SystemMessage) => void,
): () => void {
  return openSseWithBackoff(monitorUrl('/api/messages/stream'), (raw) => {
    try {
      onMessage(JSON.parse(raw) as SystemMessage)
    } catch {
      // ignore malformed frames
    }
  })
}
