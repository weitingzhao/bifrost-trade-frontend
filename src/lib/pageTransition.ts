/**
 * Page transitions (design Rev .71 §1, the app's half): a route change runs
 * inside `document.startViewTransition` — the old page fades out in 180ms,
 * the new one fades in over 240ms rising 6px — while the sidebar, the top
 * bar, the toolbar, the panel, the float and the Symbol list hold still
 * (index.css names them as their own, unanimated groups).
 *
 * React Router does the work when a navigation carries `viewTransition`;
 * this turns it on for every navigation that changes the path. A navigation
 * that only moves the query or the hash — a filter, a tab, a sort — is the
 * same page and does not fade. Reduced motion, or a browser without view
 * transitions, gets a plain navigation.
 */
import type { createBrowserRouter } from 'react-router-dom'

type Router = ReturnType<typeof createBrowserRouter>

function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** The path a `to` points at, or null when it names no new path. */
export function targetPath(to: unknown, here: string = window.location.href): string | null {
  if (typeof to === 'string') {
    if (to.startsWith('?') || to.startsWith('#')) return null
    try {
      return new URL(to, here).pathname
    } catch {
      return null
    }
  }
  if (to && typeof to === 'object' && 'pathname' in to) {
    const p = (to as { pathname?: string }).pathname
    return p ? new URL(p, here).pathname : null
  }
  return null
}

export function withPageTransitions(router: Router): Router {
  if (typeof document === 'undefined' || !('startViewTransition' in document)) return router
  const navigate = router.navigate.bind(router)
  router.navigate = ((to: Parameters<Router['navigate']>[0], opts?: Parameters<Router['navigate']>[1]) => {
    if (typeof to === 'number' || reduced()) return navigate(to as never, opts as never)
    const path = targetPath(to)
    const moves = path != null && path !== window.location.pathname
    // `Link` passes `viewTransition: undefined` explicitly, so a spread
    // default would be overwritten — only an explicit choice wins.
    return navigate(to as never, (moves ? { ...opts, viewTransition: opts?.viewTransition ?? true } : opts) as never)
  }) as Router['navigate']
  return router
}
