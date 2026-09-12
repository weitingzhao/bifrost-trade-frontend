/**
 * Omnibar state and the recent-pages trail behind it.
 *
 * The bar is the answer to "go somewhere" — the menu's job is to make the
 * structure visible, not to be walked every time. So it opens from anywhere
 * (⌘K), and what it offers when empty is what you were just doing.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { routeFor } from '@/layout/routeRegistry'

/** One input, three kinds of result — which kind is decided by the first character. */
export type OmnibarMode = 'all' | 'pages' | 'commands'

export function parseQuery(raw: string): { mode: OmnibarMode; term: string } {
  const q = raw.trimStart()
  if (q.startsWith('/')) return { mode: 'pages', term: q.slice(1).trim() }
  if (q.startsWith('>') || q.startsWith('\u203a')) return { mode: 'commands', term: q.slice(1).trim() }
  return { mode: 'all', term: q.trim() }
}

export const omnibarStore = createExternalStore({ open: false })

export const omnibar = {
  open: () => omnibarStore.setState({ open: true }),
  close: () => omnibarStore.setState({ open: false }),
  toggle: () => omnibarStore.setState((s) => ({ open: !s.open })),
}

const RECENT_KEY = 'bifrost.omnibar.recent'
const RECENT_MAX = 8

export function readRecentPaths(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
  } catch {
    return []
  }
}

/**
 * Records where you have been, most recent first.
 *
 * Only named, non-redirect routes: a redirect is a path you passed through,
 * never one you chose, and an unnamed path has nothing to show in a list.
 */
export function useRecentPagesTrail() {
  const { pathname } = useLocation()
  useEffect(() => {
    const entry = routeFor(pathname)
    if (entry.redirect || entry.path === '*') return
    try {
      const next = [pathname, ...readRecentPaths().filter((p) => p !== pathname)].slice(0, RECENT_MAX)
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // ignore quota / private mode
    }
  }, [pathname])
}
