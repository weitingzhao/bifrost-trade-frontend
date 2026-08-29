import { useMemo, useState } from 'react'
import { Pin } from 'lucide-react'
import { DenseTag, IconActionButton } from '@/components/data-display'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { SymbolSourceBadges } from '@/components/symbol/SymbolSourceBadges'
import { useSymbolPickerUniverse } from '@/hooks/useSymbolPickerUniverse'
import { useSymbolSearch } from '@/hooks/useSymbolSearch'
import type { TickerHit } from '@/api/marketData'
import { cn } from '@/lib/utils'
import { useCockpitPins } from '@/hooks/useCockpitPins'

import { DEFAULT_PREFERRED_SYMBOLS } from '@/components/symbol/constants'

export interface SymbolPickerProps {
  value: string
  onSelect: (symbol: string) => void
  placeholder?: string
  disabled?: boolean
  preferredSymbols?: string[]
  /** Include live Position + Watchlist slices in empty-state suggestions (default true). */
  showPortfolioContext?: boolean
  /** Show pin affordance for Cockpit pinboard (Wave RS-E1.2). */
  showPin?: boolean
  className?: string
  id?: string
}

function formatExchangeMeta(hit: TickerHit): string {
  const parts = [hit.primary_exchange, hit.instrument_type].filter(Boolean)
  return parts.join(' · ')
}

function TickerRow({
  hit,
  inWatchlist,
  inPosition,
  compact,
}: {
  hit: TickerHit
  inWatchlist?: boolean
  inPosition?: boolean
  compact?: boolean
}) {
  const meta = formatExchangeMeta(hit)
  const sym = hit.symbol.trim().toUpperCase()
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 font-mono text-dense-body font-semibold text-entity-symbol">
        {sym}
      </span>
      {hit.name ? (
        <span className="min-w-0 truncate text-dense-caption text-muted-foreground">
          {hit.name}
        </span>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <SymbolSourceBadges inWatchlist={inWatchlist} inPosition={inPosition} />
        {meta && !compact ? (
          <DenseTag variant="neutral" size="cell">{meta}</DenseTag>
        ) : null}
      </div>
    </div>
  )
}

function symbolHit(symbol: string): TickerHit {
  return {
    symbol,
    name: null,
    primary_exchange: null,
    instrument_type: null,
  }
}

function stepSymbol(list: string[], current: string, delta: number): string {
  if (list.length === 0) return current
  const idx = list.indexOf(current)
  if (idx < 0) return delta > 0 ? list[0]! : list[list.length - 1]!
  const next = (idx + delta + list.length) % list.length
  return list[next]!
}

export function SymbolPicker({
  value,
  onSelect,
  placeholder = 'SPX',
  disabled = false,
  preferredSymbols = [...DEFAULT_PREFERRED_SYMBOLS],
  showPortfolioContext = true,
  showPin = false,
  className,
  id,
}: SymbolPickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  /** cmdk highlight value — driven by ↑/↓ while focus stays on the text input. */
  const [highlight, setHighlight] = useState('')
  const pins = useCockpitPins()
  const pinned = pins.isSymbolPinned(value)

  const portfolio = useSymbolPickerUniverse()
  const watchlistSet = portfolio.watchlistSet
  const holdingsSet = portfolio.holdingsSet

  const inputValue = open ? draft : value
  const trimmed = inputValue.trim()
  const { data: hits = [], isFetching } = useSymbolSearch(trimmed, open)
  const showPreferred = trimmed.length === 0

  const benchmarkSymbols = useMemo(() => {
    if (!showPortfolioContext) return preferredSymbols
    return portfolio.benchmarkSymbols.length > 0
      ? portfolio.benchmarkSymbols
      : preferredSymbols.filter((s) => !holdingsSet.has(s) && !watchlistSet.has(s))
  }, [
    showPortfolioContext,
    preferredSymbols,
    portfolio.benchmarkSymbols,
    holdingsSet,
    watchlistSet,
  ])

  const hasPortfolioGroups =
    showPortfolioContext &&
    (portfolio.positionSymbols.length > 0 || portfolio.watchlistOnlySymbols.length > 0)

  /** Flat order matches visual list order for keyboard navigation. */
  const navigableSymbols = useMemo(() => {
    if (!open) return [] as string[]
    if (!showPreferred) {
      return hits.map((h) => h.symbol.trim().toUpperCase()).filter(Boolean)
    }
    if (hasPortfolioGroups) {
      return [
        ...portfolio.positionSymbols,
        ...portfolio.watchlistOnlySymbols,
        ...benchmarkSymbols,
      ].map((s) => s.trim().toUpperCase())
    }
    return benchmarkSymbols.map((s) => s.trim().toUpperCase())
  }, [
    open,
    showPreferred,
    hits,
    hasPortfolioGroups,
    portfolio.positionSymbols,
    portfolio.watchlistOnlySymbols,
    benchmarkSymbols,
  ])

  const resolvedHighlight =
    open && navigableSymbols.length > 0
      ? navigableSymbols.includes(highlight)
        ? highlight
        : navigableSymbols[0]!
      : ''

  function commitSymbol(raw: string) {
    const sym = raw.trim().toUpperCase()
    if (!sym) return
    setDraft(sym)
    if (sym !== value) onSelect(sym)
    setOpen(false)
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value)
      setOpen(true)
      return
    }
    const sym = draft.trim().toUpperCase()
    if (sym && sym !== value) onSelect(sym)
    setOpen(false)
  }

  function openPickerFromValue() {
    setDraft(value)
    setOpen(true)
  }

  function renderSymbolItem(symbol: string, compact?: boolean) {
    const sym = symbol.trim().toUpperCase()
    return (
      <CommandItem key={sym} value={sym} onSelect={() => commitSymbol(sym)}>
        <TickerRow
          hit={symbolHit(sym)}
          inWatchlist={watchlistSet.has(sym)}
          inPosition={holdingsSet.has(sym)}
          compact={compact}
        />
      </CommandItem>
    )
  }

  return (
    <div className={cn('flex items-center gap-1', showPin && 'min-w-0')}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <Input
            id={id}
            value={inputValue}
            disabled={disabled}
            placeholder={placeholder}
            className={cn('h-7 font-mono text-dense-body uppercase', className)}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? `${id ?? 'symbol-picker'}-listbox` : undefined}
            onChange={(e) => {
              setDraft(e.target.value.toUpperCase())
              if (!open) setOpen(true)
            }}
            onFocus={openPickerFromValue}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false)
                setDraft(value)
                return
              }
              if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                setOpen(true)
                e.preventDefault()
                return
              }
              if (!open) {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitSymbol(draft)
                }
                return
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight(stepSymbol(navigableSymbols, resolvedHighlight, 1))
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight(stepSymbol(navigableSymbols, resolvedHighlight, -1))
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                commitSymbol(resolvedHighlight || draft)
              }
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-80 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command
            shouldFilter={false}
            value={resolvedHighlight}
            onValueChange={setHighlight}
          >
            <CommandList id={`${id ?? 'symbol-picker'}-listbox`}>
              {portfolio.isLoading && showPreferred && showPortfolioContext ? (
                <div className="py-2 text-center text-dense-caption text-muted-foreground">
                  Loading watchlist & positions…
                </div>
              ) : null}
              {isFetching && !showPreferred ? (
                <div className="py-2 text-center text-dense-caption text-muted-foreground">
                  Searching…
                </div>
              ) : null}
              <CommandEmpty>No matches.</CommandEmpty>
              {showPreferred && hasPortfolioGroups ? (
                <>
                  {portfolio.positionSymbols.length > 0 ? (
                    <CommandGroup heading="Positions">
                      {portfolio.positionSymbols.map((sym) => renderSymbolItem(sym))}
                    </CommandGroup>
                  ) : null}
                  {portfolio.watchlistOnlySymbols.length > 0 ? (
                    <CommandGroup heading="Watchlist">
                      {portfolio.watchlistOnlySymbols.map((sym) => renderSymbolItem(sym))}
                    </CommandGroup>
                  ) : null}
                  {benchmarkSymbols.length > 0 ? (
                    <CommandGroup heading="Benchmarks">
                      {benchmarkSymbols.map((sym) => renderSymbolItem(sym, true))}
                    </CommandGroup>
                  ) : null}
                </>
              ) : null}
              {showPreferred && !hasPortfolioGroups ? (
                <CommandGroup heading="Suggested">
                  {benchmarkSymbols.map((sym) => renderSymbolItem(sym, true))}
                </CommandGroup>
              ) : null}
              {!showPreferred ? (
                <CommandGroup heading="Matches">
                  {hits.map((hit) => {
                    const sym = hit.symbol.trim().toUpperCase()
                    return (
                      <CommandItem key={sym} value={sym} onSelect={() => commitSymbol(sym)}>
                        <TickerRow
                          hit={hit}
                          inWatchlist={watchlistSet.has(sym)}
                          inPosition={holdingsSet.has(sym)}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showPin && value ? (
        <IconActionButton
          title={pinned ? 'Unpin from Cockpit' : 'Pin to Cockpit'}
          ariaLabel={pinned ? 'Unpin symbol' : 'Pin symbol'}
          onClick={() => {
            if (pinned) pins.unpinSymbol(value)
            else pins.pinSymbol(value)
          }}
          tone={pinned ? 'warn' : 'default'}
        >
          <Pin className={pinned ? 'h-3.5 w-3.5 fill-current' : 'h-3.5 w-3.5'} />
        </IconActionButton>
      ) : null}
    </div>
  )
}
