/** Research Copilot auth token store (RS-KB2). */

import { createExternalStore } from '@/lib/cockpit/externalStore'

const TOKEN_KEY = 'research_copilot_token'
const USER_KEY = 'research_copilot_user'

type AuthState = {
  token: string | null
  userLabel: string | null
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function readUserLabel(): string | null {
  try {
    return localStorage.getItem(USER_KEY)
  } catch {
    return null
  }
}

const store = createExternalStore<AuthState>({
  token: readToken(),
  userLabel: readUserLabel(),
})

export const researchAuthStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  setCredentials(token: string, userLabel: string) {
    const trimmed = token.trim()
    try {
      localStorage.setItem(TOKEN_KEY, trimmed)
      localStorage.setItem(USER_KEY, userLabel.trim() || 'user')
    } catch {
      // ignore
    }
    store.setState({ token: trimmed, userLabel: userLabel.trim() || 'user' })
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    } catch {
      // ignore
    }
    store.setState({ token: null, userLabel: null })
  },
}

export function getResearchAuthHeaders(): Record<string, string> {
  const token = store.getState().token ?? readToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function useResearchAuth() {
  return store.useStore()
}
