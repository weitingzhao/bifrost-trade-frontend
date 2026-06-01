import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StockInspectorPanel } from './StockInspectorPanel'
import { OptionInspectorPanel } from './OptionInspectorPanel'
import { StrategyInstanceInspectorPanel } from './StrategyInstanceInspectorPanel'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { StockInspectorFundamentalSeed } from '@/types/research'
import { cn } from '@/lib/utils'

export type InspectorType = 'strategy' | 'stock' | 'option' | null

export interface InspectorState {
  type: InspectorType
  id?: number | null
  symbol?: string
  accountId?: string
  contractKey?: string
  livePosition?: LivePositionRow
  optionPosition?: OpenOptionPosition
  fundamentalSeed?: StockInspectorFundamentalSeed
}

interface Props {
  state: InspectorState
  onClose: () => void
}

/**
 * Fixed right-side inspector. Backdrop is pointer-events-none so the page
 * behind (screener table, positions) stays interactive while open.
 */
export function InspectorDrawer({ state, onClose }: Props) {
  if (!state.type) return null

  const isStrategy = state.type === 'strategy'
  const isStock = state.type === 'stock'

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <aside
        className={cn(
          'absolute right-0 top-0 h-full pointer-events-auto border-l shadow-2xl flex flex-col bg-background',
          isStrategy && 'w-[min(960px,100vw)] border-border/80 shadow-[-8px_0_28px_rgba(0,0,0,0.22)]',
          isStock && 'w-[min(72rem,96vw)] border-border',
          !isStrategy && !isStock && 'w-[480px] border-border',
        )}
        role="dialog"
        aria-modal="false"
        aria-label={
          isStrategy ? 'Strategy instance detail' : isStock ? 'Stock detail' : 'Inspector'
        }
      >
        {isStock ? (
          <div className="relative flex-1 overflow-y-auto min-h-0">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 h-8 w-8 shrink-0 bg-background/80 backdrop-blur-sm border border-border"
              onClick={onClose}
              aria-label="Close stock detail"
            >
              <X className="h-4 w-4" />
            </Button>
            {state.symbol && (
              <StockInspectorPanel
                symbol={state.symbol}
                accountId={state.accountId}
                livePosition={state.livePosition}
                fundamentalSeed={state.fundamentalSeed}
              />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-[0.95rem] py-3 border-b border-border shrink-0">
              <span className="text-[1.1rem] font-semibold truncate leading-tight">
                {state.type === 'strategy' && (
                  <>
                    Strategy Instance
                    <span className="text-muted-foreground font-medium"> · #{state.id ?? '—'}</span>
                  </>
                )}
                {state.type === 'option' && (state.contractKey ?? '—')}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {state.type === 'option' && state.optionPosition && (
                <OptionInspectorPanel position={state.optionPosition} />
              )}
              {state.type === 'strategy' && state.id != null && (
                <StrategyInstanceInspectorPanel instanceId={state.id} />
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
