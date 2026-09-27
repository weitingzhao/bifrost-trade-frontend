import { Plus } from 'lucide-react'
import { PageHead, PageHeadLink } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReactNode } from 'react'
import type { PrimaryWorkflowTab } from '@/utils/watchlistHelpers'

const INFO_TEXT =
  'Stock watchlist workflow: Watching (ideas) → Sizing (pre-trade sizing) → Positions (live IB holdings). Categories Watching / Sizing match Portfolio → Accounts. Quotes use IB / Redis.'

interface Props {
  itemCount: number
  primaryTab: PrimaryWorkflowTab
  addInput: string
  isAdding: boolean
  positionsNotInWatchlistCount: number
  showPositionPicker: boolean
  onAddInputChange: (v: string) => void
  onAdd: () => void
  onTogglePositionPicker: () => void
  extraActions?: ReactNode
}

export function WatchlistPageHeader({
  itemCount,
  primaryTab,
  addInput,
  isAdding,
  positionsNotInWatchlistCount,
  showPositionPicker,
  onAddInputChange,
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
          {showPosBtn && (
            <Button type="button" variant="outline" size="sm" onClick={onTogglePositionPicker}>
              Pos ({positionsNotInWatchlistCount})
            </Button>
          )}
          {primaryTab === 'watching' && (
            <>
              <Input
                value={addInput}
                onChange={e => onAddInputChange(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter') onAdd()
                }}
                placeholder="Add symbol → Watching…"
                className="h-8 w-28 font-mono uppercase text-sm"
                aria-label="Enter symbol to add as Watching"
              />
              <Button
                type="button"
                size="sm"
                disabled={isAdding || !addInput.trim()}
                onClick={onAdd}
                aria-label="Add to Watching"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
          {showPositionPicker && positionsNotInWatchlistCount > 0 && (
            <span className="sr-only">Position picker open</span>
          )}
        </>
      }
    />
  )
}
