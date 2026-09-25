/**
 * ⌘K — one input for "get me somewhere", as Spotlight (design Rev .69 §5,
 * preview Rev .72 §8): a floating field 16vh from the top, 640 wide, the
 * page left undimmed; a click outside closes it. At 720 and wider a 220px
 * column explains the row under the cursor — a name (in Watch or not, what
 * ↵ / ⇧↵ / ⌘↵ do), a page (its crumbs and path), a command (what it does).
 * ↑ ↓ move, hovering moves too, ↵ runs the row in view.
 *
 * The sidebar's job is to make the structure visible; this is the job of
 * actually going. Three kinds of result share the input, narrowed by prefix:
 * nothing = symbols, pages and commands together; `/` = pages only; `>` =
 * commands only.
 *
 * Empty, it shows what you were just doing rather than an empty box — the
 * last three names first (design Rev .58), then the book and the pages.
 *
 * A name picked here follows the Symbol list's rule (`symbolGo.ts`): ↵
 * carries it, swapping in place where the page reads it and opening the
 * Symbol panel beside any other; ⇧↵ opens a locked tab to compare; ⌘↵ the
 * Symbol page.
 */
import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { useLocation, useNavigate } from 'react-router-dom'
import { Command as CommandIcon, Check, Clock, Hash, History, PanelLeft, Pin, Plus, Star, X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import mb from './menubar/menubar.module.css'
import css from './spotlight.module.css'
import { useSidebar } from '@/components/ui/sidebar'
import { toggleThread } from '@/hooks/useCopilotThread'
import { useCockpitPins } from '@/hooks/useCockpitPins'
import { useSymbolPickerUniverse } from '@/hooks/useSymbolPickerUniverse'
import { useSymbolSearch } from '@/hooks/useSymbolSearch'
import { omnibar, omnibarStore, parseQuery, readRecentPaths } from '@/lib/omnibar'
import { withSymbolParam } from '@/lib/symbolLink'
import { useSymbolContext } from '@/lib/symbolContext'
import { useRecentSymbols } from '@/lib/recentSymbols'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { howFrom, useSymbolGo } from './symbolGo'
import { NAV_ORDERS, ORDER_LABEL, ORDER_WHY, setNavOrder, useNavOrder, type NavOrder } from './navOrder'
import { PAGE_ROUTES, routeFor } from './routeRegistry'
import { SHORTCUTS } from '@/lib/cockpit/shortcuts'
import { matches, trail } from './omnibarMatch'
import { symbolTabHref } from '@/lib/symbolTabs'

/**
 * The other places a symbol is worth opening, offered as rows rather than a
 * hidden key.
 *
 * Three of the four used to be retired paths — `/research/dossier`,
 * `/research/vol-regime`, `/research/discovery` — so the group rendered
 * `routeFor()` on three redirect rows that all read `Research / Analyze /
 * Symbol`: three identical rows, each costing a redirect hop. They are the
 * Symbol page's tabs now, which is what they became.
 */
const SYMBOL_DESTINATIONS: { label: string; href: string }[] = [
  { label: 'Symbol · Overview', href: symbolTabHref('overview') },
  { label: 'Positions', href: '/portfolio/positions' },
  { label: 'Symbol · Volatility', href: symbolTabHref('volatility') },
  { label: 'Symbol · Chain', href: symbolTabHref('chain') },
]

/** Ticker shape. Confirming it is a real one is a separate question — see `ticker` below. */
function tickerShaped(term: string): string | null {
  return /^[A-Za-z]{1,5}$/.test(term) ? term.toUpperCase() : null
}

/** What the preview column says about the row under the cursor (Rev .72 §8). */
interface Preview {
  kind: string
  kindInk: string
  title: string
  ink?: string
  mono?: boolean
  sub: string
  keys: { k: string; l: string }[]
}

function SpotlightPreview({ p }: { p: Preview | undefined }) {
  if (!p) return <div className={css.prev} />
  return (
    <div className={css.prev}>
      <span className={css.prevKind} style={{ color: p.kindInk }}>
        {p.kind}
      </span>
      <span className={cn(css.prevTitle, p.mono && 'font-mono')} style={{ color: p.ink }}>
        {p.title}
      </span>
      {p.sub ? <span className={css.prevSub}>{p.sub}</span> : null}
      {p.keys.length > 0 ? (
        <div className={css.prevKeys}>
          {p.keys.map((k) => (
            <div key={k.k} className={css.prevKey}>
              <kbd>{k.k}</kbd>
              <span>{k.l}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** ＋ Watch on a name row — adds it without choosing the row. */
function WatchButton({ sym, on, onAdd }: { sym: string; on: boolean; onAdd: (sym: string) => void }) {
  const stop = (e: MouseEvent | PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }
  return (
    <button
      type="button"
      onPointerDown={stop}
      onClick={(e) => {
        stop(e)
        if (!on) onAdd(sym)
      }}
      disabled={on}
      title={on ? `${sym} is on the Watchlist` : `Add ${sym} to the Watchlist`}
      className="ml-auto inline-flex items-center gap-0.5 rounded px-1.5 text-dense-micro text-muted-foreground hover:bg-secondary hover:text-foreground disabled:hover:bg-transparent"
    >
      {on ? <Check className="size-3" /> : <Plus className="size-3" />} Watch
    </button>
  )
}

export function Omnibar() {
  const { open } = omnibarStore.useStore()
  const [raw, setRaw] = useState('')
  // The row in view — cmdk's own selection, read back for the preview.
  const [sel, setSel] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { symbol, clearSymbol } = useSymbolContext()
  const { go, verb } = useSymbolGo()
  const recentSymbols = useRecentSymbols()
  const { addItem } = useWatchlistMutations()
  // cmdk's onSelect carries no event: the modifiers are read off the key or
  // the pointer that made the choice, just before it lands.
  const mods = useRef<{ shiftKey: boolean; metaKey: boolean }>({ shiftKey: false, metaKey: false })
  const noteMods = (e: KeyboardEvent | PointerEvent) => {
    mods.current = { shiftKey: e.shiftKey, metaKey: e.metaKey || e.ctrlKey }
  }
  const addToWatch = (sym: string) => {
    if (!addItem.isPending)
      addItem.mutate({ contract_key: stockWatchlistContractKey(sym), symbol: sym, sec_type: 'STK', source: 'omnibar' })
  }
  const { toggleSidebar } = useSidebar()
  const pins = useCockpitPins()
  const universe = useSymbolPickerUniverse()
  const currentOrder = useNavOrder()

  const { mode, term } = parseQuery(raw)
  const tickerTerm = mode === 'all' ? term : ''
  const search = useSymbolSearch(tickerTerm, open && tickerTerm.length >= 1)

  const pages = useMemo(() => {
    if (mode === 'commands' || mode === 'shortcuts') return []
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

  /**
   * A named destination navigates; a bare pick follows the shell's rule —
   * swap in place, or the Symbol panel beside this page.
   */
  function goToSymbol(sym: string, destination?: string) {
    const how = howFrom(mods.current)
    mods.current = { shiftKey: false, metaKey: false }
    run(() => (destination ? navigate(withSymbolParam(destination, sym)) : go(sym, how)))
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

  // Every row registers what the preview says about it, by its cmdk value.
  const previews = new Map<string, Preview>()
  const reg = (value: string, p: Preview) => {
    previews.set(value, p)
    return value
  }
  const symPrev = (sym: string, extra?: string): Preview => ({
    kind: 'Symbol',
    kindInk: 'var(--sk-ticker)',
    title: sym,
    ink: 'var(--sk-ticker)',
    mono: true,
    sub: [
      extra,
      universe.holdingsSet.has(sym) ? 'In the book.' : null,
      universe.watchlistSet.has(sym) ? 'In your Watch list.' : 'Not in Watch yet.',
    ]
      .filter(Boolean)
      .join(' '),
    keys: [
      { k: '↵', l: verb === 'swap' ? 'swap this page to it' : 'open beside this page' },
      { k: '⇧↵', l: 'locked tab to compare' },
      { k: '⌘↵', l: 'Symbol page' },
    ],
  })
  const pagePrev = (path: string, label?: string): Preview => {
    const r = routeFor(path.split('?')[0])
    return {
      kind: 'Page',
      kindInk: 'var(--sk-mute2)',
      title: label ?? r.label,
      sub: [[...(r.crumbs ?? [])].join(' › '), path].filter(Boolean).join(' · '),
      keys: [{ k: '↵', l: 'go to page' }],
    }
  }
  const cmdPrev = (title: string, sub = ''): Preview => ({
    kind: 'Command',
    kindInk: 'var(--sk-contract)',
    title,
    sub,
    keys: [{ k: '↵', l: 'run' }],
  })

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? omnibar.open() : omnibar.close())}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-transparent supports-backdrop-filter:backdrop-blur-none"
        className={cn(
          mb.pop,
          css.spot,
          'top-[16vh] w-[min(640px,calc(100vw-32px))] max-w-none translate-y-0 gap-0 rounded-[14px] p-0 sm:max-w-none',
        )}
      >
        <DialogTitle className="sr-only">Spotlight</DialogTitle>
        <DialogDescription className="sr-only">Jump to a symbol, a page or a command</DialogDescription>
        <Command
          shouldFilter={false}
          value={sel}
          onValueChange={setSel}
          className="bg-transparent [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2 [&_[cmdk-item]_svg]:size-4"
        >
      <div className={css.field}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className={css.glass}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <CommandPrimitive.Input
          value={raw}
          onValueChange={setRaw}
          onKeyDown={noteMods}
          placeholder="Symbol, page or command"
          className={css.input}
        />
        <button type="button" className={css.close} aria-label="Close" onClick={() => omnibar.close()}>
          ✕
        </button>
      </div>
      <div className={css.body}>
      <CommandList className={css.list}>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        {suggestions && recentSymbols.length > 0 && (
          <CommandGroup heading="Recent symbols">
            {recentSymbols.slice(0, 3).map((r) => (
              <CommandItem
                key={`rec-${r.symbol}`}
                value={reg(`rec-${r.symbol}`, symPrev(r.symbol, 'A name you opened recently.'))}
                onPointerDown={noteMods}
                onSelect={() => goToSymbol(r.symbol)}
              >
                <History /> <span className="font-mono text-[var(--sk-ticker)]">{r.symbol}</span>
                {/* Said in the preview column where there is room for one (≥720). */}
                <span className="truncate text-muted-foreground min-[720px]:hidden">↵ {verb} · ⇧ compare · ⌘ page</span>
                <WatchButton sym={r.symbol} on={universe.watchlistSet.has(r.symbol)} onAdd={addToWatch} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {suggestions && suggestions.positionSymbols.length > 0 && (
          <CommandGroup heading="In the book">
            {suggestions.positionSymbols.slice(0, 6).map((s) => (
              <CommandItem key={`book-${s}`} value={reg(`book-${s}`, symPrev(s))} onPointerDown={noteMods} onSelect={() => goToSymbol(s)}>
                <Hash /> <span className="font-mono">{s}</span>
                <WatchButton sym={s} on={universe.watchlistSet.has(s)} onAdd={addToWatch} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {suggestions && suggestions.watchlistOnlySymbols.length > 0 && (
          <CommandGroup heading="Watchlist">
            {suggestions.watchlistOnlySymbols.slice(0, 6).map((s) => (
              <CommandItem key={`wl-${s}`} value={reg(`wl-${s}`, symPrev(s))} onPointerDown={noteMods} onSelect={() => goToSymbol(s)}>
                <Star /> <span className="font-mono">{s}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(search.data?.length ?? 0) > 0 && (
          <CommandGroup heading="Symbols">
            {search.data!.slice(0, 6).map((hit) => (
              <CommandItem
                key={hit.symbol}
                value={reg(`sym-${hit.symbol}`, symPrev(hit.symbol, hit.name ?? undefined))}
                onPointerDown={noteMods}
                onSelect={() => goToSymbol(hit.symbol)}
              >
                <Hash />
                <span className="font-mono">{hit.symbol}</span>
                <span className="truncate text-muted-foreground">{hit.name ?? ''}</span>
                {universe.holdingsSet.has(hit.symbol) && <CommandShortcut>in book</CommandShortcut>}
                <WatchButton sym={hit.symbol} on={universe.watchlistSet.has(hit.symbol)} onAdd={addToWatch} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {ticker && (
          <CommandGroup heading={`Open ${ticker} in`}>
            {/* First, so ↵ on a typed ticker follows the rule: the named
                destinations render before the search answers, and cmdk keeps
                whichever row was selected first. */}
            <CommandItem value={reg(`go-${ticker}`, symPrev(ticker))} onPointerDown={noteMods} onSelect={() => goToSymbol(ticker)}>
              <Hash /> <span className="font-mono text-[var(--sk-ticker)]">{ticker}</span>
              <span className="truncate text-muted-foreground min-[720px]:hidden">
                {verb === 'swap' ? 'swap it in here' : 'beside this page'} · ⇧ compare · ⌘ page
              </span>
            </CommandItem>
            {SYMBOL_DESTINATIONS.map((dest) => (
              <CommandItem
                key={`dest-${dest.href}`}
                value={reg(`dest-${dest.href}`, pagePrev(dest.href, `${ticker} · ${dest.label}`))}
                onSelect={() => goToSymbol(ticker, dest.href)}
              >
                <Hash /> {dest.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode === 'shortcuts' && (
          <CommandGroup heading="Keyboard">
            {SHORTCUTS.filter(
              (s) =>
                !term ||
                `${s.keys} ${s.what} ${s.scope}`.toLowerCase().includes(term.toLowerCase()),
            ).map((s) => (
              <CommandItem key={s.keys} value={reg(`key-${s.keys}`, { kind: 'Shortcut', kindInk: 'var(--sk-accent)', title: s.keys, mono: true, sub: `${s.what} · ${s.scope}`, keys: [] })}>
                <CommandIcon />
                <span className="font-mono text-dense-caption">{s.keys}</span>
                <span className="truncate">{s.what}</span>
                <CommandShortcut>{s.scope}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {pages.length > 0 && (
          <CommandGroup heading="Pages">
            {pages.map((entry) => (
              <CommandItem
                key={entry.path}
                value={reg(`page-${entry.path}`, pagePrev(entry.path))}
                onSelect={() => run(() => navigate(entry.path))}
              >
                <CommandIcon /> {trail(entry)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode !== 'shortcuts' && recents.length > 0 && (
          <CommandGroup heading="Recent pages">
            {recents.map((entry) => (
              <CommandItem
                key={`recent-${entry.path}`}
                value={reg(`recent-${entry.path}`, pagePrev(entry.path))}
                onSelect={() => run(() => navigate(entry.path))}
              >
                <Clock /> {trail(entry)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {mode !== 'pages' && mode !== 'shortcuts' && (
          <CommandGroup heading="Commands">
            <CommandItem
              value={reg('cmd-copilot', cmdPrev('Ask', 'Open or close the conversation with the Copilot · ⌘J'))}
              onSelect={() => run(toggleThread)}
            >
              <CommandIcon /> Ask — open or close the conversation <CommandShortcut>⌘J</CommandShortcut>
            </CommandItem>
            <CommandItem value={reg('cmd-sidebar', cmdPrev('Toggle sidebar', 'Show or hide the sidebar · ⌘B'))} onSelect={() => run(toggleSidebar)}>
              <PanelLeft /> Toggle sidebar
            </CommandItem>
            {symbol && (
              <CommandItem
                value={reg('cmd-pin', cmdPrev(pins.isSymbolPinned(symbol) ? `Unpin ${symbol}` : `Pin ${symbol}`, 'Keep the carried name on the pin shelf'))}
                onSelect={() =>
                  run(() => (pins.isSymbolPinned(symbol) ? pins.unpinSymbol(symbol) : pins.pinSymbol(symbol)))
                }
              >
                <Pin /> {pins.isSymbolPinned(symbol) ? `Unpin ${symbol}` : `Pin ${symbol}`}
              </CommandItem>
            )}
            {symbol && (
              <CommandItem value={reg('cmd-clear', cmdPrev(`Clear symbol ${symbol}`, 'Stop carrying the name from page to page'))} onSelect={() => run(clearSymbol)}>
                <X /> Clear symbol {symbol}
              </CommandItem>
            )}
            {/* The design's own placement (shell-registry `commands()`): the
                order switch is a thing you do, not a place you go — a sidebar
                row that reorders the rows it sits in is a preference dressed
                as a destination. */}
            {(Object.keys(NAV_ORDERS) as NavOrder[]).map((k) => (
              <CommandItem key={`cmd-navorder-${k}`} value={reg(`cmd-navorder-${k}`, cmdPrev(`Menu order · ${ORDER_LABEL[k]}`, ORDER_WHY[k]))} title={ORDER_WHY[k]} onSelect={() => run(() => setNavOrder(k))}>
                <PanelLeft /> Menu order · {ORDER_LABEL[k]}
                <span className="truncate text-muted-foreground">{ORDER_WHY[k]}</span>
                <CommandShortcut>{k === currentOrder ? 'current' : 'set'}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <SpotlightPreview p={previews.get(sel)} />
      </div>
      {/* The keys a name answers, said where you choose one (design Rev .58). */}
      <div className="flex items-center gap-2.5 border-t border-border px-3 py-1.5 text-dense-micro text-muted-foreground">
        <kbd className="font-mono">↵</kbd>
        <span>{verb === 'swap' ? 'swap the symbol here' : 'open beside this page'}</span>
        <kbd className="font-mono">⇧↵</kbd>
        <span>compare</span>
        <kbd className="font-mono">⌘↵</kbd>
        <span>Symbol page</span>
        <kbd className="ml-auto font-mono">esc</kbd>
        <span>close</span>
      </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
