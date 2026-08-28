/**
 * Ambient Lab view registered by AskCopilotButton while a Research page is mounted.
 * Every Copilot stream attaches this as client_context (unless the user dismissed the chip).
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import type { AskCopilotIntentPayload } from '@/store/askCopilotIntentStore'

type CopilotViewState = {
  view: AskCopilotIntentPayload | null
  suppressed: boolean
}

const store = createExternalStore<CopilotViewState>({
  view: null,
  suppressed: false,
})

function sameOrigin(
  a: AskCopilotIntentPayload | null,
  b: AskCopilotIntentPayload,
): boolean {
  return a?.originPage === b.originPage
}

export const copilotViewStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  register(view: AskCopilotIntentPayload) {
    const prev = store.getState()
    store.setState({
      view,
      suppressed: sameOrigin(prev.view, view) ? prev.suppressed : false,
    })
  },
  clear(originPage?: string) {
    const current = store.getState().view
    if (originPage && current && current.originPage !== originPage) return
    store.setState({ view: null, suppressed: false })
  },
  suppress() {
    store.setState({ suppressed: true })
  },
  unsuppress() {
    store.setState({ suppressed: false })
  },
}

export function useCopilotView() {
  return store.useStore()
}
