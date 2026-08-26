/**
 * Intent store: open Save-as-Hypothesis dialog from Cockpit Actions (Wave RS-E1.4).
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type SaveHypothesisIntent = {
  open: boolean
  nonce: number
  originPage: string
  defaultTitle?: string
  defaultThesis?: string
  defaultSymbols?: string[]
  defaultTags?: string[]
  originRef?: Record<string, unknown>
}

const initial: SaveHypothesisIntent = {
  open: false,
  nonce: 0,
  originPage: 'cockpit',
}

const store = createExternalStore<SaveHypothesisIntent>(initial)

export const saveHypothesisIntentStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  open(partial?: Partial<Omit<SaveHypothesisIntent, 'open' | 'nonce'>>) {
    store.setState({
      ...initial,
      ...partial,
      open: true,
      nonce: store.getState().nonce + 1,
      originPage: partial?.originPage ?? 'cockpit',
    })
  },
  close() {
    store.setState({ open: false })
  },
}

export function useSaveHypothesisIntent() {
  return store.useStore()
}
