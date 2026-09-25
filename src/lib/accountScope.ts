/**
 * The account the shell is looking at — a hard filter, carried like the symbol
 * (design `_Shell TopBar.dc.html`, Account control, 2026-09-25).
 *
 * Two accounts are open at once, and a per-page account filter lets the same
 * number mean different things on two screens; so the scope is the shell's,
 * and pages that read it follow it. Margin and buying power are **not**
 * summable across accounts: under All they are listed per account, never
 * added.
 *
 * The design's own keys: `bifrost.account` = `all` | `HOST` | `SEC`, and the
 * `bifrost:account` event.
 *
 * **Which pages read it** is a flag in the route table (`accountScope`), the
 * way `symbolScope` is. The first round wires Positions, Desk and Plans
 * (Owner 2026-09-25); every other page shows the whole book and the control
 * says so.
 *
 * A wired page's own account toggles stay (a link can still carry `?acct=` or
 * `?host=0`): the URL, when it names an account, is the page's value, the way
 * `?symbol=` is. The page's toggle writes the scope when what it picked is a
 * scope (one account, or both), and the URL only when it is not (neither).
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type AccountScope = 'all' | 'HOST' | 'SEC'

const STORAGE_KEY = 'bifrost.account'
const EVENT = 'bifrost:account'

function readScope(): AccountScope {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'HOST' || v === 'SEC' ? v : 'all'
  } catch {
    return 'all'
  }
}

const store = createExternalStore<{ scope: AccountScope }>({ scope: readScope() })

if (typeof window !== 'undefined') {
  // Another tab changed it: this one follows.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) store.setState({ scope: readScope() })
  })
}

export function setAccountScope(scope: AccountScope): void {
  if (store.getState().scope === scope) return
  try {
    localStorage.setItem(STORAGE_KEY, scope)
  } catch {
    // Blocked storage: the scope holds for this visit.
  }
  store.setState({ scope })
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: scope }))
  } catch {
    // no window (tests)
  }
}

export function useAccountScope(): AccountScope {
  return store.useStore().scope
}

/** Which of the two a page is showing, as its own toggles say it. */
export interface AccountPair {
  host: boolean
  secondary: boolean
}

/** One object per scope, so a page's memos keyed on the pair do not churn. */
const PAIRS: Record<AccountScope, AccountPair> = {
  all: Object.freeze({ host: true, secondary: true }),
  HOST: Object.freeze({ host: true, secondary: false }),
  SEC: Object.freeze({ host: false, secondary: true }),
}

export function scopeToPair(scope: AccountScope): AccountPair {
  return PAIRS[scope]
}

/** A pair as a scope — null for neither, which a page may show but the shell never carries. */
export function pairToScope(pair: AccountPair): AccountScope | null {
  if (pair.host && pair.secondary) return 'all'
  if (pair.host) return 'HOST'
  if (pair.secondary) return 'SEC'
  return null
}

/** The broker id the scope names, or null under All. */
export function scopeAccountId(scope: AccountScope, hostId: string, secondaryId: string): string | null {
  if (scope === 'HOST') return hostId || null
  if (scope === 'SEC') return secondaryId || null
  return null
}

/** Whether a row on `accountId` is in the scope. Rows with no account stay: they are nobody's to hide. */
export function inAccountScope(accountId: string | null | undefined, scope: AccountScope, hostId: string, secondaryId: string): boolean {
  const want = scopeAccountId(scope, hostId, secondaryId)
  if (!want || !accountId) return true
  return accountId.trim().toLowerCase() === want.trim().toLowerCase()
}
