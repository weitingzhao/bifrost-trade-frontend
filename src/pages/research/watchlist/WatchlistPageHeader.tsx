import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
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
}: Props) {
  const showPosBtn =
    (primaryTab === 'watching' || primaryTab === 'positions') && positionsNotInWatchlistCount > 0

  return (
    <PageHeader
      title="Stock Watchlist"
      description="Watching → Sizing → Positions. Use the inspector on symbol click for fundamentals and technicals."
      className="max-w-none [&>div:last-child]:items-start"
      actions={
        <>
          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
            {itemCount}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Page info">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm text-xs">
              {INFO_TEXT}
            </TooltipContent>
          </Tooltip>
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
