import { StockInspectorPanel } from './StockInspectorPanel'
import { StrategyInstanceInspectorPanel } from './StrategyInstanceInspectorPanel'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { StockInspectorFundamentalSeed } from '@/types/research'

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

/** Stock and strategy instance inspectors. Option contracts use {@link OptionContractDrawer}. */
export function InspectorDrawer({ state, onClose }: Props) {
  if (!state.type || state.type === 'option') return null

  const isStrategy = state.type === 'strategy'

  return (
    <RightInspectorShell
      open
      ariaLabel={isStrategy ? 'Strategy instance detail' : 'Stock detail'}
    >
      {state.type === 'stock' && state.symbol ? (
        <StockInspectorPanel
          symbol={state.symbol}
          accountId={state.accountId}
          livePosition={state.livePosition}
          fundamentalSeed={state.fundamentalSeed}
          onClose={onClose}
        />
      ) : state.id != null ? (
        <StrategyInstanceInspectorPanel instanceId={state.id} onClose={onClose} />
      ) : null}
    </RightInspectorShell>
  )
}
