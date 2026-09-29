/**
 * The one way to open an instance (design Rev .103, `ShellRegistry.openInstance`).
 *
 * Every `#NNN` in the app calls this rather than keeping a sheet of its own:
 * a plain click shows the instance in the following `instance` surface (the
 * 440 panel, or wherever the last one was put), ⇧ opens a fresh tab beside it,
 * ⌘ / Ctrl goes to the page. `list` and `from` are the rows the token sat
 * among, which the surface's ‹ › and [ ] step.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFrameNavigate } from '@/lib/surfaceScope'
import { closeSurface, focusTab, tradePath, tradeSurface, openSurface, opensAsPage, placeOf, surfaceState } from './equipSurface'
import { howFrom } from './symbolGo'
import { markPagedFrom } from './pagedFrom'

export interface OpenTradeOpts {
  list?: readonly number[]
  from?: string
  /** A tab of its own, beside the following one (⇧). */
  fresh?: boolean
  /** The Instance page instead of a surface (⌘ / Ctrl). */
  page?: boolean
  /** Put it here rather than where place memory would — a compare's second record. */
  place?: 'panel' | 'float'
}

export type OpenTrade = (id: number, opts?: OpenTradeOpts) => void

/** Read a click's modifiers the way the Symbol tokens do. */
export function tradeHowFrom(e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } | null | undefined): Pick<OpenTradeOpts, 'fresh' | 'page'> {
  const how = howFrom(e)
  return { fresh: how === 'compare', page: how === 'page' }
}

export function useOpenTrade(): OpenTrade {
  const navigate = useNavigate()
  // Inside a surface, a page belongs to the main frame, not the panel.
  const frameNavigate = useFrameNavigate()
  return useCallback(
    (id, opts) => {
      const surf = tradeSurface(id, { fresh: opts?.fresh, list: opts?.list, from: opts?.from })
      if (opts?.page) {
        // An explicit Full page ↗ is a one-off, not a new habit: the cell that
        // showed it closes and place memory is left as it was (the place
        // buttons' ⤢ is where "pages from now on" is said).
        const st = surfaceState()
        for (const sf of [st.float, ...(st.panel?.tabs ?? [])]) if (sf?.trade === id) closeSurface(sf.key)
        const to = tradePath(id, surf.tradeList, opts?.from)
        markPagedFrom(window.location.pathname + window.location.search, to)
        ;(frameNavigate ?? navigate)(to)
        return
      }
      if (!opts?.place && placeOf(surf.key) == null && opensAsPage(surf.key)) {
        openSurface(surf, 'page')
        const to = tradePath(id, surf.tradeList, opts?.from)
        markPagedFrom(window.location.pathname + window.location.search, to)
        ;(frameNavigate ?? navigate)(to)
        return
      }
      openSurface(surf, opts?.place)
      if (placeOf(surf.key) === 'panel') focusTab(surf.key)
    },
    [navigate, frameNavigate],
  )
}

/** Two records side by side — Rules' ⇄ and Positions' `?instance=&vs=`: one in the panel, one floating. */
export function openTradePair(open: OpenTrade, a: number, b: number, from: string): void {
  open(a, { fresh: true, from, place: 'panel' })
  open(b, { fresh: true, from, place: 'float' })
}
