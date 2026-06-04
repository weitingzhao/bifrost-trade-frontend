import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fuzzyMatchWatchlistItem } from '@/utils/watchlistFuzzy'
import { watchlistItemLabel } from '@/utils/watchlistHelpers'
import type { WatchlistItem } from '@/types/market'
import { cn } from '@/lib/utils'
import { watchlistWarnLineClass } from './watchlistUi'

interface Props {
  stocks: WatchlistItem[]
  sizingCategoryId: number | null
  addPending: boolean
  onPromote: (contractKey: string) => Promise<void>
  /** Bottom Sizing sheet row — parent supplies section title. */
  inline?: boolean
}

export function PromoteToSizing({
  stocks,
  sizingCategoryId,
  addPending,
  onPromote,
  inline = false,
}: Props) {
  const [contractKey, setContractKey] = useState('')
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const menu = stocks.filter(item => fuzzyMatchWatchlistItem(item, filter))
  const selected = stocks.find(i => i.contract_key.trim() === contractKey.trim())

  useEffect(() => {
    if (!open) return
    const onPointerDown = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="space-y-2">
      {!inline ? <h4 className="text-sm font-semibold">Sizing sheet</h4> : null}
      <div className={inline ? 'flex flex-nowrap items-stretch gap-2' : 'flex items-center gap-2'} ref={rootRef}>
        <div className={inline ? 'relative min-w-0 max-w-[12rem] flex-1' : 'relative flex-1 max-w-xs'}>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-secondary px-3 text-sm shadow-sm transition-colors hover:border-primary/45 hover:bg-secondary/80"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-label="Pick new symbol — choose a watchlist row to move to Sizing"
          >
            <span
              className={
                selected
                  ? 'min-w-0 flex-1 truncate text-left font-mono text-xs'
                  : 'truncate text-left text-muted-foreground'
              }
            >
              {selected ? watchlistItemLabel(selected) : 'pick new symbol'}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')} />
          </button>
          {open && (
            <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md py-1 text-sm">
              <li className="px-2 py-1 sticky top-0 bg-popover border-b">
                <Input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filter symbols…"
                  className="h-7 text-xs"
                  autoFocus
                />
              </li>
              {menu.length === 0 ? (
                <li className="px-3 py-2 text-muted-foreground text-xs">No matches</li>
              ) : (
                menu.map(item => (
                  <li key={item.contract_key}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-1.5 hover:bg-muted font-mono text-xs"
                      onClick={() => {
                        setContractKey(item.contract_key)
                        setOpen(false)
                        setFilter('')
                      }}
                    >
                      {watchlistItemLabel(item)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {inline ? (
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            disabled={!contractKey.trim() || sizingCategoryId == null || addPending}
            onClick={() => void onPromote(contractKey)}
            title="Move to Sizing"
            aria-label="Move to Sizing"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={!contractKey.trim() || sizingCategoryId == null || addPending}
            onClick={() => void onPromote(contractKey)}
            title="Move to Sizing"
          >
            Move to Sizing →
          </Button>
        )}
      </div>
      {sizingCategoryId == null && (
        <p className={watchlistWarnLineClass}>
          The <strong>Sizing</strong> category is missing; you cannot promote rows yet.
        </p>
      )}
    </div>
  )
}
