/**
 * Every page's Ask, and its one destination.
 *
 * §5a.8's seventeenth round: **"open beside" has exactly one landing place.**
 * Ask from a page, from a float or from a tab, and the conversation arrives
 * as a tab in the side panel (or wherever that surface was last put) — never
 * as a second column, never as a navigation to the Desk.
 *
 * This is mounted by the shell rather than by the conversation, because it
 * has to be listening while the conversation is closed. The composer consumes
 * the intent (prefill + chip) and never auto-sends.
 */
import { useEffect } from 'react'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { openThread } from '@/hooks/useCopilotThread'
import { useAskCopilotIntent } from '@/store/askCopilotIntentStore'

export function AskCopilotIntentHost() {
  const intent = useAskCopilotIntent()

  useEffect(() => {
    if (!intent.open) return
    openThread()
    cockpitDrawerStore.getState().setTab('copilot')
  }, [intent.open, intent.nonce])

  return null
}
