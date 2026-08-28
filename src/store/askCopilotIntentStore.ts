/**
 * Intent store: open Research Copilot from Lab pages with pending context.
 * Composer prefills suggested prompt + context chip; does not auto-send.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type AskCopilotIntentPayload = {
  originPage: string
  originLabel: string
  symbol?: string
  date?: string
  panel?: string
  snapshot?: Record<string, unknown>
  suggestedPrompt?: string
}

export type AskCopilotIntent = AskCopilotIntentPayload & {
  open: boolean
  nonce: number
}

const initial: AskCopilotIntent = {
  open: false,
  nonce: 0,
  originPage: '',
  originLabel: '',
}

const store = createExternalStore<AskCopilotIntent>(initial)

export const askCopilotIntentStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  open(intent: AskCopilotIntentPayload) {
    store.setState({
      ...initial,
      ...intent,
      open: true,
      nonce: store.getState().nonce + 1,
    })
  },
  consume(): AskCopilotIntent | null {
    const current = store.getState()
    if (!current.open) return null
    store.setState({ open: false })
    return current
  },
  close() {
    store.setState({ open: false })
  },
}

export function useAskCopilotIntent() {
  return store.useStore()
}
