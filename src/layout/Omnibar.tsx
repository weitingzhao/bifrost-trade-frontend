/**
 * ⌘K — one input for "get me somewhere".
 *
 * The sidebar's job is to make the structure visible; this is the job of
 * actually going. Three kinds of result share the input, narrowed by prefix:
 * nothing = symbols, pages and commands together; `/` = pages only; `>` =
 * commands only.
 *
 * Empty, it shows what you were just doing rather than an empty box.
 */
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Command as CommandIcon, Clock, Hash, PanelLeft, Pin, Star, X } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { useSidebar } from '@/components/ui/sidebar'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { useSymbolPickerUniverse } from '@/hooks/useSymbolPickerUniverse'
import { useSymbolSearch } from '@/hooks/useSymbolSearch'
import { omnibar, omnibarStore, parseQuery, readRecentPaths } from '@/lib/omnibar'
import { withSymbolParam } from '@/lib/symbolLink'
import { useSymbolContext } from '@/lib/symbolContext'
import { PAGE_ROUTES, routeFor, type RouteEntry } from './routeRegistry'

/** Where a symbol goes when the page you are on has no use for one. */
const SYMBOL_HOME = '/research/dossier'

/** The other places a symbol is worth opening, offered as rows rather than a hidden key. */
const SYMBOL_DESTINATIONS = ['/research/dossier', '/portfolio/positions', '/research/vol-regime', '/research/discovery']

function trail(entry: RouteEntry): string {
  return [...(entry.crumbs ?? []), entry.label].join(' / ')
}

function matches(entry: RouteEntry, term: string): boolean {
  if (!term) return true
  const needle = term.toLowerCase()
  return trail(entry).toLowerCase().includes(needle) || entry.path.toLowerCase().includes(needle)
}

/** Ticker shape. Confirming it is a real one is a separate question — see `ticker` below. */
function tickerShaped(term: string): string | null {
  return /^[A-Za-z]{1,5}$/.test(term) ? term.toUpperCase() : null
}

export function Omnibar() {
  const { open } = omnibarStore.useStore()
  const [raw, setRaw] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { symbol, setSymbol, clearSymbol } = useSymbolContext()
  const { toggleSidebar } = useSidebar()
  const pins = useCockpitPins()
  const universe = useSymbolPickerUniverse()

  const { mode, term } = parseQuery(raw)
  const tickerTerm = mode === 'all' ? term : ''
  const search = useSymbolSearch(tickerTerm, open && tickerTerm.length >= 1)

  const pages = useMemo(() => {
    if (mode === 'commands') return []
    // Empty and unprefixed is the resting state: what you were just doing, not
    // the first eight rows of the sitemap. `/` with nothing after it is a
    // deliberate ask for the page list, so that one does list them.
    if (mode === 'all' && !term) return []
    return PAGE_ROUTES.filter((r) => matches(r, term)).slice(0, 8)
  }, [mode, term])
  // `pathname` is in the deps because the trail is mutable storage, not a
  // value: without it the memo serves whatever the list held when this page
  // first rendered, which is one navigation behind. The trail only ever
  // changes on a navigation, so the pathname is the whole trigger.
  const recents = useMemo(
    () =>
      term || mode !== 'all'
        ? []
        : readRecentPaths()
            .filter((p) => p !== pathname)
            .slice(0, 5)
            .map(routeFor)
            .filter((r) => r.path !== '*'),
    [term, mode, pathname],
  )

  function run(action: () => void) {
    omnibar.close()
    setRaw('')
    action()
  }

  /** Stay put when the page is reading a symbol; otherwise open the symbol's home. */
  function goToSymbol(sym: string, destination?: string) {
    const target = destination ?? (routeFor(pathname).symbolScope ? null : SYMBOL_HOME)
    run(() => (target ? navigate(withSymbolParam(target, sym)) : setSymbol(sym)))
  }

  // Only where symbols are on offer at all, and only for a symbol something
  // has confirmed: without the second half, typing "vol" to find Vol Regime
  // also offers to open a company called VOL in four places.
  const shaped = mode === 'all' ? tickerShaped(term) : null
  const ticker =
    shaped &&
    (search.data?.some((h) => h.symbol === shaped) ||
      universe.holdingsSet.has(shaped) ||
      universe.watchlistSet.has(shaped))
      ? shaped
      : null
  const suggestions = mode === 'all' && !term ? universe : null

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? omnibar.open() : omnibar.close())}
      shouldFilter={false}
      contentClassName="sm:max-w-2xl"
      title="Omnibar"
      description="Jump to a symbol, a page or a command"
    >
      <CommandInput
        value={raw}
        onValueChange={setRaw}
        placeholder="Symbol, page, or > for commands…"
      />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        {suggestions && suggestions.positionSymbols.length > 0 && (
          <CommandGroup heading="In the book">
            {suggestions.positionSymbols.slice(0, 6).map((s) => (
              <CommandItem key={`book-${s}`} value={`book-${s}`} onSelect={() => goToSymbol(s)}>
                <Hash /> <span className="font-mono">{s}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {suggestions && suggestions.watchlistOnlySymbols.length > 0 && (
          <CommandGroup heading="Watchlist">
            {suggestions.watchlistOnlySymbols.slice(0, 6).map((s) => (
              <CommandItem key={`wl-${s}`} value={`wl-${s}`} onSelect={() => goToSymbol(s)}>
                <Star /> <span className="font-mono">{s}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(search.data?.length ?? 0) > 0 && (
          <CommandGroup heading="Symbols">
            {search.data!.slice(0, 6).map((hit) => (
              <CommandItem key={hit.symbol} value={`sym-${hit.symbol}`} onSelect={() => goToSymbol(hit.symbol)}>
                <Hash />
                <span className="font-mono">{hit.symbol}</span>
                <span className="truncate text-muted-foreground">{hit.name ?? ''}</span>
                {universe.holdingsSet.has(hit.symbol) && <CommandShortcut>in book</CommandShortcut>}
                {!universe.holdingsSet.has(hit.symbol) && universe.watchlistSet.has(hit.symbol) && (
                  <CommandShortcut>watchlist</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {ticker && (
          <CommandGroup heading={`Open ${ticker} in`}>
            {SYMBOL_DESTINATIONS.map((path) => (
              <CommandItem
                key={`dest-${path}`}
                value={`dest-${path}`}
                onSelect={() => goToSymbol(ticker, path)}
              >
                <Hash /> {trail(routeFor(path))}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {pages.length > 0 && (
          <CommandGroup heading="Pages">
            {pages.map((entry) => (
              <CommandItem
                key={entry.path}
                value={`page-${entry.path}`}
                onSelect={() => run(() => navigate(entry.path))}
              >
                <CommandIcon /> {trail(entry)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {recents.length > 0 && (
          <CommandGroup heading="Recent pages">
            {recents.map((entry) => (
              <CommandItem
                key={`recent-${entry.path}`}
                value={`recent-${entry.path}`}
                onSelect={() => run(() => navigate(entry.path))}
              >
                <Clock /> {trail(entry)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode !== 'pages' && (
          <CommandGroup heading="Commands">
            <CommandItem
              value="cmd-copilot"
              onSelect={() => run(() => copilotDockStore.getState().toggle())}
            >
              <CommandIcon /> Toggle Copilot <CommandShortcut>⌘J</CommandShortcut>
            </CommandItem>
            <CommandItem value="cmd-sidebar" onSelect={() => run(toggleSidebar)}>
              <PanelLeft /> Toggle sidebar
            </CommandItem>
            {symbol && (
              <CommandItem
                value="cmd-pin"
                onSelect={() =>
                  run(() => (pins.isSymbolPinned(symbol) ? pins.unpinSymbol(symbol) : pins.pinSymbol(symbol)))
                }
              >
                <Pin /> {pins.isSymbolPinned(symbol) ? `Unpin ${symbol}` : `Pin ${symbol}`}
              </CommandItem>
            )}
            {symbol && (
              <CommandItem value="cmd-clear" onSelect={() => run(clearSymbol)}>
                <X /> Clear symbol {symbol}
              </CommandItem>
            )}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
