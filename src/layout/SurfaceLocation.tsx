/**
 * A surface's own address — what the design gets for free from an iframe.
 *
 * The design's Symbol panel is `Research Symbol.dc.html?embed=1&lock=…#/research/symbol?symbol=…`:
 * a document of its own, whose query string is its own. This app renders the
 * page component inside the frame's router, so without this the panel's
 * Symbol page would read the frame's `?symbol=` and write its `?tab=` into the
 * frame's address — a Desk URL gaining `?tab=volatility` because a tab was
 * clicked in the panel.
 *
 * So the subtree gets a location of its own, by the router's own contexts:
 *
 * - **Reads** (`useLocation`, `useSearchParams`, every `useResearchContext`
 *   under the page) see `/research/symbol?symbol=<its symbol>&<its params>`.
 * - **Writes** to that same path stay here: a tab click, a date, the walk.
 * - **Everything else navigates the frame**, as a link in any surface does
 *   (`equipSurface.ts`): a Compare link from the panel opens Compare as the page.
 *
 * The symbol is not stored here. A following surface shows the carry, so a
 * new name anywhere in the shell reaches it; a locked one keeps its own. A
 * write that changes the symbol carries it (following) or re-locks (locked).
 */
import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  NavigationType,
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_RouteContext as RouteContext,
  parsePath,
  type Location,
  type Path,
  type To,
} from 'react-router-dom'
import { readStoredContext, useCarriedSymbol, writeStoredContext } from '@/lib/symbolContext'

function withoutSymbol(search: string): string {
  const p = new URLSearchParams(search)
  p.delete('symbol')
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function SurfaceLocation({
  path,
  lockedSymbol,
  initialSearch = '',
  children,
}: {
  /** The one path this surface is; writes to any other path go to the frame. */
  path: string
  /** Set for a locked surface: the symbol it keeps whatever is carried. */
  lockedSymbol?: string
  /** The params it opens with, besides the symbol — `?tab=chain` from a contract row. */
  initialSearch?: string
  children: ReactNode
}) {
  const outer = useContext(NavigationContext)
  const carried = useCarriedSymbol()
  const [lock, setLock] = useState(lockedSymbol ?? '')
  const [rest, setRest] = useState(() => withoutSymbol(initialSearch))
  const symbol = lockedSymbol ? lock : carried

  const location = useMemo<Location>(() => {
    const p = new URLSearchParams(rest)
    if (symbol) p.set('symbol', symbol)
    const s = p.toString()
    return { pathname: path, search: s ? `?${s}` : '', hash: '', state: null, key: 'surface' }
  }, [path, rest, symbol])

  const route = useCallback(
    (to: To, replace: boolean, state?: unknown, opts?: object) => {
      const target: Partial<Path> = typeof to === 'string' ? parsePath(to) : to
      if ((target.pathname ?? path) !== path) {
        // Anywhere else is the frame's to open.
        if (replace) outer.navigator.replace(to, state, opts)
        else outer.navigator.push(to, state, opts)
        return
      }
      const params = new URLSearchParams(target.search ?? '')
      const next = (params.get('symbol') ?? '').trim().toUpperCase()
      if (next && next !== symbol) {
        if (lockedSymbol) setLock(next)
        else writeStoredContext(next, readStoredContext().date ?? '')
      }
      setRest(withoutSymbol(target.search ?? ''))
    },
    [outer.navigator, path, symbol, lockedSymbol],
  )

  const navigation = useMemo(
    () => ({
      ...outer,
      navigator: {
        ...outer.navigator,
        push: (to: To, state?: unknown, opts?: object) => route(to, false, state, opts),
        replace: (to: To, state?: unknown, opts?: object) => route(to, true, state, opts),
      },
    }),
    [outer, route],
  )

  return (
    <NavigationContext.Provider value={navigation}>
      <LocationContext.Provider value={{ location, navigationType: NavigationType.Pop }}>
        {/* Not a data route: `useNavigate` then resolves against the location
            above and calls the navigator above, instead of the frame router. */}
        <RouteContext.Provider value={{ outlet: null, matches: [], isDataRoute: false }}>
          {children}
        </RouteContext.Provider>
      </LocationContext.Provider>
    </NavigationContext.Provider>
  )
}
