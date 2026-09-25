/**
 * Picking a name — one rule for the Symbol list, the omnibar, the top bar's
 * token and the toolbar's Symbol button (design Rev .58, Shell Spec §5a.11).
 *
 * - **↵ / click** carries it. A page that reads the symbol swaps in place;
 *   any other page opens the Symbol panel beside it, or brings it forward —
 *   it no longer leaves the page.
 * - **⇧** opens a second, locked Symbol tab, for side by side. It does not
 *   carry: comparing is not switching.
 * - **⌘** opens the Symbol page itself.
 * - **A contract** carries its underlying and opens the panel on the face
 *   that reads it — Chain for one leg, Payoff for a structure.
 */
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { readStoredContext, useSymbolContext, writeStoredContext } from '@/lib/symbolContext'
import { withSymbolParam } from '@/lib/symbolLink'
import {
  SYMBOL_SURFACE_ROUTE,
  focusTab,
  isVisible,
  openSurface,
  opensAsPage,
  placeOf,
  symbolSurface,
  toggleSurface,
} from './equipSurface'
import { routeFor } from './routeRegistry'

export type SymbolHow = 'swap' | 'compare' | 'page'

/** How a click or a key reads: ⇧ compares, ⌘ / Ctrl opens the page. */
export function howFrom(e: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean } | null | undefined): SymbolHow {
  if (e?.shiftKey) return 'compare'
  return e?.metaKey || e?.ctrlKey ? 'page' : 'swap'
}

/** A contract row's pick: the face it opens on, and the row to light there. */
export interface ContractPick {
  multi: boolean
  /** `YYYYMMDD`. */
  expiry?: string
  strike?: number
  right?: 'C' | 'P'
}

/**
 * The Chain face's own seed — the Dealer face already hands a strike over
 * this way (`?expiration=&strike=&right=`), so a contract row speaks it too.
 */
export function contractParams(c: ContractPick): Record<string, string> {
  const out: Record<string, string> = {}
  const d = (c.expiry ?? '').replace(/\D/g, '')
  if (d.length === 8) out.expiration = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  if (c.strike != null && Number.isFinite(c.strike)) out.strike = String(c.strike)
  if (c.right) out.right = c.right
  return out
}

export interface SymbolGo {
  go: (sym: string, how?: SymbolHow, contract?: ContractPick) => void
  /** The toolbar button and the top bar's token: the Symbol surface, shown or put away. */
  toggle: () => void
  /** What ↵ does on this page — the omnibar and the rows say it. */
  verb: 'swap' | 'panel'
}

export function useSymbolGo(): SymbolGo {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { symbol, setSymbol } = useSymbolContext()
  const scoped = Boolean(routeFor(pathname).symbolScope)

  const showPanel = useCallback(() => {
    const surf = symbolSurface()
    if (placeOf(surf.key) == null) {
      // Put away as a page last time: that is where it opens now.
      if (opensAsPage(surf.key)) {
        navigate(SYMBOL_SURFACE_ROUTE)
        return
      }
      openSurface(surf)
    } else if (!isVisible(surf.key)) {
      focusTab(surf.key)
    }
  }, [navigate])

  const go = useCallback(
    (raw: string, how: SymbolHow = 'swap', contract?: ContractPick) => {
      const sym = raw.trim().toUpperCase()
      if (!sym) return
      if (how === 'compare') {
        openSurface(symbolSurface(sym, { lock: true }), 'panel')
        return
      }
      if (how === 'page') {
        writeStoredContext(sym, readStoredContext().date ?? '')
        navigate(withSymbolParam(SYMBOL_SURFACE_ROUTE, sym))
        return
      }
      if (scoped) setSymbol(sym)
      else writeStoredContext(sym, readStoredContext().date ?? '')
      if (contract) {
        openSurface(
          symbolSurface(null, { tab: contract.multi ? 'payoff' : 'chain', params: contractParams(contract) }),
          'panel',
        )
        return
      }
      if (!scoped) showPanel()
    },
    [scoped, setSymbol, navigate, showPanel],
  )

  const toggle = useCallback(() => {
    const surf = symbolSurface()
    if (placeOf(surf.key) == null && opensAsPage(surf.key)) {
      navigate(withSymbolParam(SYMBOL_SURFACE_ROUTE, symbol))
      return
    }
    toggleSurface(surf)
  }, [navigate, symbol])

  return { go, toggle, verb: scoped ? 'swap' : 'panel' }
}
