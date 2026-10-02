/**
 * `fetch` for the Trade API: a write carries the operator token (debt TD-23).
 *
 * Same signature as `fetch`, so a module swaps one word. A request is touched
 * only when it is a write (not GET / HEAD / OPTIONS) to a Trade API prefix —
 * `/api/{monitor,trading,strategy,portfolio,market,research}` — and carries no
 * Authorization of its own. `/api/plugin/research` is the Research engine with
 * its own bearer and is left alone.
 *
 * A write the API refuses with 403 and a `required_role` opens the operator
 * sign-in, naming what was refused; the response still goes back to the caller,
 * so its own error handling runs as before.
 */

import { openTradeOperatorDialog, tradeOperatorToken } from '@/lib/auth/tradeOperator'

const TRADE_PATH = /(^|\/)api\/(monitor|trading|strategy|portfolio|market|research)(\/|$)/
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/** The pathname of a Trade API URL, or null when the URL is not one. */
export function tradeApiPath(input: RequestInfo | URL): string | null {
  let pathname: string
  try {
    pathname = new URL(urlOf(input), window.location.origin).pathname
  } catch {
    return null
  }
  return TRADE_PATH.test(pathname) ? pathname : null
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const m = init?.method ?? (input instanceof Request ? input.method : 'GET')
  return m.toUpperCase()
}

export async function tradeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = methodOf(input, init)
  const path = SAFE_METHODS.has(method) ? null : tradeApiPath(input)
  if (path === null) return fetch(input, init)

  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  const token = tradeOperatorToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers })

  if (res.status === 403) {
    const body = (await res
      .clone()
      .json()
      .catch(() => null)) as { required_role?: unknown; current_role?: unknown } | null
    if (body && typeof body.required_role === 'string') {
      openTradeOperatorDialog({
        method,
        path,
        requiredRole: body.required_role,
        currentRole: typeof body.current_role === 'string' ? body.current_role : 'viewer',
      })
    }
  }
  return res
}
