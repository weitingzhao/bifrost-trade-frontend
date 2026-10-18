/**
 * The sidebar's open / folded memory (design Rev .164, DESIGN_CONTRACTS §18.4).
 *
 * Since D2 (Rev .176) the DS `SidebarProvider` keeps it under the
 * `LayoutProvider`: wide keeps the `sidebar_state` cookie; medium and expanded
 * open on the icon rail and remember their own choice (`sidebar_state@medium`
 * · `@expanded`); compact has no sidebar. What stays here is wide's starting
 * point for someone who never chose (`shellChrome`) and a one-time move of the
 * app-era keys (`bifrost.sidebar@medium` · `@expanded`, Rev .164–.175) so
 * nobody's choice is lost in the switch.
 */
import { initialSidebarOpen } from './shellChrome'

/** Wide's start: the cookie when there is one, else the viewport default. */
export function sidebarDefaultOpen(): boolean {
  return initialSidebarOpen(document.cookie, window.innerWidth)
}

/** Move the app-era per-class keys to the DS's, once; the DS key wins if both exist. */
export function migrateSidebarMemory(store: Storage | null = safeLocalStorage()): void {
  if (!store) return
  for (const w of ['medium', 'expanded'] as const) {
    const old = `bifrost.sidebar@${w}`
    const v = store.getItem(old)
    if (v == null) continue
    const key = `sidebar_state@${w}`
    if (store.getItem(key) == null) store.setItem(key, v === '1' ? 'true' : 'false')
    store.removeItem(old)
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
