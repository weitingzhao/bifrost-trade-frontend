import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StockInspectorPanel } from './StockInspectorPanel'
import { OptionInspectorPanel } from './OptionInspectorPanel'
import type { LivePositionRow } from '@/types/positions'
import type { OpenOptionPosition } from '@/types/positions'

export type InspectorType = 'strategy' | 'stock' | 'option' | null

export interface InspectorState {
  type: InspectorType
  id?: number | null
  symbol?: string
  accountId?: string
  contractKey?: string
  livePosition?: LivePositionRow
  optionPosition?: OpenOptionPosition
}

interface Props {
  state: InspectorState
  onClose: () => void
}

/**
 * Fixed right-side inspector panel. backdrop is pointer-events-none so the
 * table/page behind stays fully interactive while the panel is open.
 */
export function InspectorDrawer({ state, onClose }: Props) {
  if (!state.type) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <aside
        className="absolute right-0 top-0 h-full w-[480px] pointer-events-auto bg-background border-l border-border shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="false"
        aria-label="Inspector"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold truncate">
            {state.type === 'strategy' && `Strategy #${state.id ?? '—'}`}
            {state.type === 'stock' && (state.symbol ?? '—')}
            {state.type === 'option' && (state.contractKey ?? '—')}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {state.type === 'stock' && state.symbol && (
            <StockInspectorPanel
              symbol={state.symbol}
              accountId={state.accountId}
              livePosition={state.livePosition}
            />
          )}
          {state.type === 'option' && state.optionPosition && (
            <OptionInspectorPanel position={state.optionPosition} />
          )}
          {state.type === 'strategy' && (
            <div className="p-4 text-sm text-muted-foreground text-center py-12">
              Strategy instance detail — coming soon
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
