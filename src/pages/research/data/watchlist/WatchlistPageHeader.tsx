import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
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
    <PageHeader
      title="Watchlist"
      // The design's own line. What the page *is* belongs here; how it is
      // worked — Watching → Sizing → Positions — is the tab strip's job and
      // the info tip's, and was saying it twice.
      description="Names with a thesis attached — pinned from the Screener, from Scan, from a Symbol page or from an Inspector."
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
          {/* The design's one header link: this list is fed from the screen. */}
          <Link
            to="/research/screener"
            className="text-dense-caption text-primary hover:underline"
          >
            Screener →
          </Link>
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
