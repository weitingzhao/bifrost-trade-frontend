/**
 * Global host: Lab "Ask Copilot" opens the floating panel on the Copilot tab.
 * Composer consumes the intent (prefill + chip) — never auto-sends.
 */
import { useEffect } from 'react'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { useAskCopilotIntent } from '@/store/askCopilotIntentStore'

export function AskCopilotIntentHost() {
  const intent = useAskCopilotIntent()

  useEffect(() => {
    if (!intent.open) return
    copilotDockStore.getState().open_()
    cockpitDrawerStore.getState().setTab('copilot')
  }, [intent.open, intent.nonce])

  return null
}
