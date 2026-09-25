/**
 * The shell's right-click menus (design Rev .69 §1) — one Radix menu, opened
 * where the pointer is.
 *
 * - **A symbol or a contract**: the same three verbs as a Symbol-list row or
 *   the omnibar (`useSymbolGo`: ↵ the shell's rule, ⇧↵ a locked tab, ⌘↵ the
 *   Symbol page), then Add to Watch and Copy; a contract adds "Open contract
 *   in Symbol" on its own face.
 * - **A panel tab** (`data-ctx-tab`): open as page · move to float · close
 *   (⌥W) · close the others — the last three with Undo.
 *
 * What counts as a symbol is marked, not guessed from a colour: an explicit
 * `data-ctx-sym` (+ `data-ctx-contract`), the entity classes the app already
 * uses to *say* "this is a symbol" / "this is a contract"
 * (`text-entity-symbol`, `text-[var(--sk-ticker)]` and their option twins),
 * or a link whose own text is the name its `?symbol=` carries. Anything else
 * keeps the browser's own menu, and inputs always do.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { useSymbolPickerUniverse } from '@/hooks/useSymbolPickerUniverse'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { withSymbolParam } from '@/lib/symbolLink'
import { notify } from '@/lib/shellNotify'
import { dismissSurface } from './equipMotion'
import { closeOtherTabs, openSurface, restoreSurfaces, surfaceState } from './equipSurface'
import { useSymbolGo } from './symbolGo'
import { parseContract, targetOf, type ContextTarget } from './shellContextTarget'

function copy(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
  notify(`Copied ${text}`)
}

export function ShellContextMenu() {
  const navigate = useNavigate()
  const { go, verb } = useSymbolGo()
  const { addItem } = useWatchlistMutations()
  const universe = useSymbolPickerUniverse()
  const [target, setTarget] = useState<ContextTarget | null>(null)
  const back = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onMenu = (e: MouseEvent) => {
      const next = targetOf(e)
      if (next == null) return
      e.preventDefault()
      back.current = e.target instanceof Element ? e.target.closest<HTMLElement>('button, a, [tabindex]') : null
      setTarget(next)
    }
    document.addEventListener('contextmenu', onMenu)
    return () => document.removeEventListener('contextmenu', onMenu)
  }, [])

  const close = (open: boolean) => {
    if (!open) setTarget(null)
  }

  const tabItems = (key: string) => {
    const s = surfaceState()
    const tab = s.panel?.tabs.find((t) => t.key === key)
    if (!tab) return null
    const others = (s.panel?.tabs.length ?? 0) > 1
    return (
      <>
        <DropdownMenuItem
          disabled={!tab.canPage}
          onSelect={() => {
            openSurface(tab, 'page')
            navigate(tab.subject === 'lock' && tab.symbol ? withSymbolParam(tab.to, tab.symbol) : tab.to)
          }}
        >
          Open as page
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openSurface(tab, 'float')}>Move to float</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => dismissSurface(key)}>
          Close tab <DropdownMenuShortcut>⌥W</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!others}
          onSelect={() => {
            const snap = surfaceState()
            closeOtherTabs(key)
            notify('Closed the other tabs', { undo: () => restoreSurfaces(snap) })
          }}
        >
          Close other tabs
        </DropdownMenuItem>
      </>
    )
  }

  const symItems = (sym: string, contract: string | null) => {
    const pick = contract ? parseContract(contract) : null
    const watched = universe.watchlistSet.has(sym)
    return (
      <>
        {pick ? <DropdownMenuItem onSelect={() => go(sym, 'swap', pick)}>Open contract in Symbol</DropdownMenuItem> : null}
        <DropdownMenuItem onSelect={() => go(sym, 'swap')}>
          {verb === 'swap' ? `Swap this page to ${sym}` : `Open ${sym} beside`} <DropdownMenuShortcut>↵</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go(sym, 'compare')}>
          Open in a locked tab <DropdownMenuShortcut>⇧↵</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => go(sym, 'page')}>
          Open Symbol page <DropdownMenuShortcut>⌘↵</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={watched || addItem.isPending}
          onSelect={() => {
            addItem.mutate(
              { contract_key: stockWatchlistContractKey(sym), symbol: sym, sec_type: 'STK', source: 'context-menu' },
              { onSuccess: () => notify(`${sym} added to Watch`) },
            )
          }}
        >
          {watched ? `${sym} is on Watch` : `Add ${sym} to Watch`}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(contract ?? sym)}>
          Copy {contract ?? sym} <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
      </>
    )
  }

  const body = target == null ? null : target.kind === 'tab' ? tabItems(target.key) : symItems(target.sym, target.contract)
  const head = target == null ? '' : target.kind === 'tab' ? target.label : (target.contract ?? target.sym)
  const headInk =
    target?.kind === 'sym' ? (target.contract ? 'var(--sk-contract)' : 'var(--sk-ticker)') : 'var(--sk-mute2)'

  return (
    <DropdownMenu open={target != null && body != null} onOpenChange={close} modal={false}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          tabIndex={-1}
          style={{ position: 'fixed', left: target?.x ?? 0, top: target?.y ?? 0, width: 0, height: 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={2}
        className="min-w-[220px] max-w-[320px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          if (back.current && document.contains(back.current)) back.current.focus({ preventScroll: true })
          back.current = null
        }}
      >
        <DropdownMenuLabel className="font-mono text-dense-meta font-bold tracking-[0.04em]" style={{ color: headInk }}>
          {head}
        </DropdownMenuLabel>
        {body}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
