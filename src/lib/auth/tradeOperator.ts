/**
 * The Trade operator token and its sign-in dialog's switch (debt TD-23).
 *
 * Every write on the Trade API needs a role: operator for a change, admin for
 * a process exit or an IB disconnect. The role comes from `Authorization:
 * Bearer`, the env's `OPS_OPERATOR_TOKEN` / `OPS_ADMIN_TOKEN`; without one the
 * caller is the env's `default_role`. One token slot: an admin token covers
 * operator too.
 *
 * Kept in this browser's localStorage, the same as the Research identity. The
 * token is never put in a URL — the API stopped reading `?token=`.
 */

import { createExternalStore } from '@/lib/cockpit/externalStore'

const TOKEN_KEY = 'trade_operator_token'

/** A write the API refused, as the 403 body named it. */
export interface RefusedWrite {
  method: string
  path: string
  requiredRole: string
  currentRole: string
}

interface TradeOperatorState {
  token: string | null
  open: boolean
  refused: RefusedWrite | null
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

const store = createExternalStore<TradeOperatorState>({ token: readToken(), open: false, refused: null })

export const tradeOperatorStore = {
  getState: store.getState,
  subscribe: store.subscribe,
  setToken(token: string) {
    const trimmed = token.trim()
    if (!trimmed) return
    try {
      localStorage.setItem(TOKEN_KEY, trimmed)
    } catch {
      // A private window keeps it for the session only.
    }
    store.setState({ token: trimmed, refused: null })
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    store.setState({ token: null })
  },
}

export function tradeOperatorToken(): string | null {
  return store.getState().token ?? readToken()
}

export function openTradeOperatorDialog(refused: RefusedWrite | null = null) {
  store.setState({ open: true, refused })
}

export function closeTradeOperatorDialog() {
  store.setState({ open: false, refused: null })
}

export function useTradeOperator() {
  return store.useStore()
}
