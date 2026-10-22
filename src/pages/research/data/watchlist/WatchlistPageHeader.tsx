import { Plus } from 'lucide-react'
import { PageHead, PageHeadLink } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { SymbolListEditor } from '@/components/symbol/SymbolListEditor'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { ReactNode } from 'react'
import type { PrimaryWorkflowTab } from '@/utils/watchlistHelpers'

const INFO_TEXT =
  'Stock watchlist workflow: Watching (ideas) → Sizing (pre-trade sizing) → Positions (live IB holdings). Categories Watching / Sizing match Portfolio → Accounts. Quotes use IB / Redis.'

interface Props {
  itemCount: number
  primaryTab: PrimaryWorkflowTab
  symbols: string[]
  isAdding: boolean
  positionsNotInWatchlistCount: number
  showPositionPicker: boolean
  onAdd: (symbol: string) => void
  onTogglePositionPicker: () => void
  extraActions?: ReactNode
}

export function WatchlistPageHeader({
  itemCount,
  primaryTab,
  symbols,
  isAdding,
  positionsNotInWatchlistCount,
  showPositionPicker,
  onAdd,
  onTogglePositionPicker,
  extraActions,
}: Props) {
  const showPosBtn =
    (primaryTab === 'watching' || primaryTab === 'positions') && positionsNotInWatchlistCount > 0

  return (
    // §16.10: the design's line and the workflow note together behind ⓘ, the
    // count as the head's meta, the Screener as its door.
    <PageHead
      title="Watchlist"
      info={`Names with a thesis attached — pinned from the Screener, from Scan, from a Symbol page or from an Inspector. ${INFO_TEXT}`}
      meta={`${itemCount} ${itemCount === 1 ? 'name' : 'names'}`}
      actions={
        <>
          {/* The design's one header link: this list is fed from the screen. */}
          <PageHeadLink to="/research/screener" title="This list is fed from the screen">
            Screener →
          </PageHeadLink>
          {extraActions}
          {/* The list's keeping (pin from positions, add a ticker) is a
              builder: compact leaves it to a larger screen (§18.2) — on a
              393 head the add box pushed the row past the screen. */}
          {showPosBtn && (
            <Button data-sr-build="" type="button" variant="outline" size="sm" onClick={onTogglePositionPicker}>
              Pos ({positionsNotInWatchlistCount})
            </Button>
          )}
          {primaryTab === 'watching' && (
            <span data-sr-build="" className="contents">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" size="sm"><Plus className="size-4" /> Add symbol</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <SymbolListEditor symbols={symbols} disabled={isAdding} addOnly onChange={(next) => {
                    const added = next.find((symbol) => !symbols.includes(symbol))
                    if (added) onAdd(added)
                  }} />
                </PopoverContent>
              </Popover>
            </span>
          )}
          {showPositionPicker && positionsNotInWatchlistCount > 0 && (
            <span className="sr-only">Position picker open</span>
          )}
        </>
      }
    />
  )
}
