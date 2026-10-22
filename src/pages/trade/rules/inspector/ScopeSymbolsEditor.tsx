import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { CloseButton, DenseTag } from '@/components/data-display'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { SymbolSourceBadges } from '@/components/symbol/SymbolSourceBadges'
import { useSymbolSearch } from '@/hooks/useSymbolSearch'
import { useSymbolPickerUniverse } from '@/hooks/useSymbolPickerUniverse'

/** Search selects an addition; existing scope is never replaced by the search text. */
export function ScopeSymbolsEditor({
  symbols,
  onChange,
}: {
  symbols: string[]
  onChange: (symbols: string[]) => void
}) {
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const query = text.trim().toUpperCase()
  const universe = useSymbolPickerUniverse()
  const search = useSymbolSearch(query, expanded)
  const existing = new Set(symbols.map((s) => s.toUpperCase()))
  const knownSymbols = [...new Set([...symbols, ...universe.allSuggestedSymbols])]
  const localResults = knownSymbols
    .filter((symbol) => !query || symbol.toUpperCase().includes(query))
    .map((symbol) => ({ symbol, name: null as string | null }))
  const remoteResults = query
    ? (search.data ?? []).filter(
        (hit) => hit.symbol.toUpperCase().includes(query) || hit.name?.toUpperCase().includes(query)
      )
    : []
  const results = query
    ? [
        ...new Map(
          [...localResults, ...remoteResults].map((hit) => [hit.symbol.toUpperCase(), hit])
        ).values(),
      ].sort(
        (a, b) =>
          Number(b.symbol.toUpperCase() === query) - Number(a.symbol.toUpperCase() === query)
      )
    : localResults.filter((hit) => !existing.has(hit.symbol.toUpperCase())).slice(0, 8)
  const searching = Boolean(query && (search.isFetching || search.isPlaceholderData))
  const add = (raw: string) => {
    const symbol = raw.trim().toUpperCase()
    if (existing.has(symbol)) return
    onChange([...symbols, symbol])
    setText('')
  }
  return (
    <span className="flex flex-col gap-2">
      <span className="text-dense-meta text-muted-foreground">In scope · {symbols.length}</span>
      <span className="flex flex-wrap gap-1" aria-label="Scope symbols">
        {symbols.map((symbol) => (
          <DenseTag key={symbol} variant="symbol" size="pill">
            {symbol}
            <CloseButton
              size="sm"
              label={`Remove ${symbol} from scope`}
              onClick={() => onChange(symbols.filter((s) => s !== symbol))}
            />
          </DenseTag>
        ))}
      </span>
      <Command
        shouldFilter={false}
        className="h-auto"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false)
        }}
      >
        <CommandInput
          aria-label="Add symbols"
          placeholder="Add symbol — ticker or company"
          value={text}
          onValueChange={(value) => {
            setText(value)
            setExpanded(true)
          }}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(false)
              setText('')
            }
            if (e.nativeEvent.isComposing) e.stopPropagation()
          }}
        />
        <CommandList className="max-h-44" aria-label="Symbol matches">
          {expanded ? (
            <>
              {searching ? (
                <div className="p-2 text-dense-meta text-muted-foreground">Searching…</div>
              ) : null}
              {query && search.error ? (
                <div role="alert" className="p-2 text-dense-meta text-destructive">
                  Search unavailable. Your scope is unchanged.
                </div>
              ) : null}
              {query && !searching && !search.error && results.length === 0 ? (
                <div className="p-2 text-dense-meta text-muted-foreground">
                  No matches. Try a ticker or company name.
                </div>
              ) : null}
              <CommandGroup heading={query ? 'Matches' : 'From your lists & benchmarks'}>
                {results.map((hit) => {
                  const symbol = hit.symbol.trim().toUpperCase()
                  const included = existing.has(symbol)
                  return (
                    <CommandItem
                      key={symbol}
                      value={symbol}
                      disabled={included || (searching && !knownSymbols.includes(symbol))}
                      onSelect={() => add(symbol)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-entity-symbol">
                            {symbol}
                          </span>
                          <SymbolSourceBadges
                            inWatchlist={universe.watchlistSet.has(symbol)}
                            inPosition={universe.holdingsSet.has(symbol)}
                          />
                        </span>
                        {hit.name ? (
                          <span className="text-dense-caption text-muted-foreground">
                            {hit.name}
                          </span>
                        ) : null}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-dense-meta">
                        {included ? (
                          <>
                            <Check className="size-3" aria-hidden />
                            In scope
                          </>
                        ) : (
                          <>
                            <Plus className="size-3" aria-hidden />
                            Add
                          </>
                        )}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
      <span className="text-dense-meta text-muted-foreground">
        Choose a match to add it. Existing symbols stay; × removes one. ↑ ↓ to choose, Enter to add.
      </span>
    </span>
  )
}
