import { fetchCopilotSession } from '@/api/researchCopilotSessions'
import { hydrateCopilotMessages } from '@/lib/cockpit/hydrateCopilotMessages'
import { copilotSessionStore } from '@/hooks/useCopilotSession'

/** Load a persisted thread into the dock. No-op when it is already the open session. */
export async function openCopilotSession(id: string): Promise<void> {
  if (id === copilotSessionStore.getState().sessionId) return
  const detail = await fetchCopilotSession(id)
  const msgs = hydrateCopilotMessages(detail.messages ?? [], id, detail.session?.model)
  copilotSessionStore.setState({
    messages: msgs,
    sessionId: id,
    streaming: false,
    lastError: null,
  })
}
