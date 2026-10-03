import type { SystemMessagesResponse, SystemMessage } from '@/types/messages'
import { openSseWithBackoff } from '@/lib/sse'
import { monitorUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson } from '@/lib/http'
import { SystemMessagesResponseSchema } from '@/lib/schemas/platform'

const validateMessages = withValidation<SystemMessagesResponse>(
  SystemMessagesResponseSchema,
  'monitor/api/messages',
)


export async function fetchSystemMessages(limit = 50): Promise<SystemMessagesResponse> {
  return requestJson(monitorUrl(`/api/messages?limit=${limit}`), { label: `Messages` }).then(validateMessages)
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
