/**
 * The float is the frame's remote control (§5a.8, eleventh round).
 *
 * Inside a surface, following a link *within the equipment* stays where you
 * are — the float, or the panel tab — and a link *out* to a spine page
 * navigates the frame while the surface stays open: you tap a name in the
 * notebook and the desk changes, the notebook stays put.
 *
 * The design gets this from its iframes (an embedded page's own `go()` swaps
 * the embed or posts to the frame). This app renders the page component in
 * place under the one router, so a link inside a float would otherwise always
 * navigate the frame — the spine half of the rule for free, the equipment half
 * never. This handler is that half: it catches the click on the way down,
 * before the link's own navigation, and re-opens the equipment surface in the
 * place the click came from.
 *
 * It only takes what it can honour. A link carrying a query or a hash is left
 * to navigate the frame: the pages read their parameters from the frame's
 * URL, so opening the surface without them would drop what the link meant.
 */
import type { MouseEvent } from 'react'
import { openSurface, surfaceForRoute, type Place } from './equipSurface'

/** The equipment surface a click lands on, or null when the frame should take it. */
export function equipmentTarget(href: string, origin: string): string | null {
  let url: URL
  try {
    url = new URL(href, origin)
  } catch {
    return null
  }
  if (url.origin !== origin || url.search || url.hash) return null
  return surfaceForRoute(url.pathname) ? url.pathname : null
}

export function keepEquipmentLinksIn(place: Exclude<Place, 'page'>) {
  return (e: MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const to = equipmentTarget(a.href, window.location.origin)
    const surface = to ? surfaceForRoute(to) : null
    if (!surface) return
    // Capture phase, so React Router's own handler sees `defaultPrevented`
    // and does not navigate the frame.
    e.preventDefault()
    openSurface(surface, place)
  }
}
