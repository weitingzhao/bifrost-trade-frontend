/**
 * The page-level Copilot context — what ⌘J carries when no page widget spoke.
 *
 * Shell Spec §11.0: opening the Copilot brings the page with it — route,
 * symbol, snapshot date. The 31 `AskCopilotButton`s already register a richer
 * view (panel, snapshot) while they are mounted; this module is the floor
 * under them, assembled by the shell for every page, so ⌘J on a page without
 * a button still tells the Copilot where the question is being asked from.
 *
 * The sources are the ones that already own each fact:
 * - route — the pathname, and `routeFor`'s label;
 * - symbol — the URL's `?symbol=`. The URL is the value (`lib/symbolContext`):
 *   on a scoped page the held symbol is already written into it, and on a page
 *   that ignores the parameter the symbol is not narrowing anything, so it is
 *   not context either;
 * - snapshot date — what a mounted `AsofTag` is showing. The tags publish here;
 *   when a view mixes several, the oldest speaks (§17.2 rule 3); when the page
 *   shows none, no date is sent. Nothing is computed client-side (§2.1).
 *
 * The mapping stays inside `ClientContext`'s frozen fields: origin_page,
 * origin_label, symbol, date. No new fields.
 */
import { useSyncExternalStore } from 'react'
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { normalizeSymbol } from '@/lib/symbolContext'
import { routeFor } from '@/layout/routeRegistry'
import type { AskCopilotIntentPayload } from '@/store/askCopilotIntentStore'

// ---------------------------------------------------------------------------
// Asof registry — mounted AsofTags publish the session date they display.
// ---------------------------------------------------------------------------

const asofStore = createExternalStore<{ entries: Record<string, string> }>({ entries: {} })

export const asofRegistry = {
  /** An AsofTag says what session it shows; null (or unmount) withdraws it. */
  publish(id: string, asof: string | null) {
    asofStore.setState((prev) => {
      if ((prev.entries[id] ?? null) === asof) return prev
      const entries = { ...prev.entries }
      if (asof) entries[id] = asof
      else delete entries[id]
      return { entries }
    })
  },
}

/** The oldest session on screen, `YYYY-MM-DD`; null when no tag is mounted. */
export function oldestAsofOnScreen(): string | null {
  const dates = Object.values(asofStore.getState().entries).sort()
  return dates[0] ?? null
}

export function useOldestAsofOnScreen(): string | null {
  return useSyncExternalStore(asofStore.subscribe, oldestAsofOnScreen, oldestAsofOnScreen)
}

// ---------------------------------------------------------------------------
// The assembled context.
// ---------------------------------------------------------------------------

/** The page-level context: route always, symbol and date only when they exist. */
export function ambientPageContext(
  pathname: string,
  search: string,
  asof: string | null,
): AskCopilotIntentPayload {
  const symbol = normalizeSymbol(new URLSearchParams(search).get('symbol'))
  return {
    originPage: pathname,
    originLabel: routeFor(pathname).label,
    ...(symbol ? { symbol } : {}),
    ...(asof ? { date: asof } : {}),
  }
}

/**
 * Whether a registered view is the shell's own floor rather than a page's.
 *
 * Shell views carry the pathname as their origin; the page widgets register
 * slugs (`research-workbench`). A page's richer view always wins — the shell
 * only registers over nothing or over itself.
 */
export function isShellAmbientView(view: { originPage: string } | null): boolean {
  return view != null && view.originPage.startsWith('/')
}
