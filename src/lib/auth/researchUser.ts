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

/**
 * A request's headers with the Research user's bearer added — for the shared
 * request helpers that also pass headers of their own. The caller's own
 * `Authorization` wins; signed out, nothing is added and the request goes as
 * it did.
 */
export function withResearchAuth(headers?: HeadersInit): Headers {
  const out = new Headers(headers)
  for (const [k, v] of Object.entries(getResearchAuthHeaders())) {
    if (!out.has(k)) out.set(k, v)
  }
  return out
}

export function useResearchAuth() {
  return store.useStore()
}
