/**
 * Page ↔ surface (design Rev .103 §9). A surface that becomes the full page
 * remembers where the frame was; its page head's ⇥ / ▢ send it back to the
 * panel or the float and return the frame there. The source is written in the
 * three places a surface becomes a page — the place buttons' ⤢, a tab's
 * "Open as page", and a record's Full page ↗ — and kept in sessionStorage,
 * not the browser's history: Back would walk the reader's own steps, not
 * undo the move. No source (a deep link) returns Home.
 */
import {
  INSTANCE_SURFACE_ROUTE,
  SYMBOL_SURFACE_ROUTE,
  instancePath,
  instanceSurface,
  surfaceForRoute,
  symbolSurface,
  type Surface,
} from './equipSurface'
import { withSymbolParam } from '@/lib/symbolLink'

const KEY = 'bifrost.pagedFrom'
export const PAGED_FROM_FALLBACK = '/home'

/** Remember where the frame was as a surface becomes the page at `to`. */
export function markPagedFrom(from: string, to: string): void {
  if (!from || from.split('?')[0] === to.split('?')[0]) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ from, to: to.split('?')[0] }))
  } catch {
    // Storage off: the page still returns Home.
  }
}

/** Where to go back to from the page at `path` — only if that is the page the source was written for. */
export function pagedFromFor(path: string): string {
  try {
    const raw = sessionStorage.getItem(KEY)
    const v = raw ? (JSON.parse(raw) as { from?: string; to?: string }) : null
    if (v?.from && v.to === path.split('?')[0]) return v.from
  } catch {
    // Unreadable is no source.
  }
  return PAGED_FROM_FALLBACK
}

/** The page a surface becomes — the Symbol surface carries its name, an instance its list. */
export function surfacePagePath(surface: Surface, carried: string): string {
  if (surface.instance != null) return instancePath(surface.instance, surface.instanceList, surface.instanceFrom)
  if (surface.subject) return withSymbolParam(surface.to, surface.subject === 'lock' ? surface.symbol : carried)
  return surface.to
}

/** The surface a full page can go back to being, or null for a page that is only a page. */
export function surfaceOf(pathname: string, search: string): Surface | null {
  const q = new URLSearchParams(search)
  if (pathname.startsWith(`${INSTANCE_SURFACE_ROUTE}/`)) {
    const id = Number(pathname.slice(INSTANCE_SURFACE_ROUTE.length + 1))
    if (!Number.isFinite(id) || id <= 0) return null
    const list = (q.get('list') ?? '')
      .split(',')
      .map(Number)
      .filter((x) => Number.isFinite(x) && x > 0)
    return instanceSurface(id, { list, from: q.get('from') ?? undefined })
  }
  if (pathname === SYMBOL_SURFACE_ROUTE) return symbolSurface()
  return surfaceForRoute(pathname)
}
