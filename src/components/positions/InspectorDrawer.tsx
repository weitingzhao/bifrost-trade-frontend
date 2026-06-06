import { StockInspectorPanel } from './StockInspectorPanel'
import { InstanceDetailSidebar } from '@/components/strategy/InstanceDetailSidebar'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { RiskProfile } from '@/utils/riskProfile'
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
  /** Optional override; instance inspector normally derives risk from executions + instance structure. */
  riskProfile?: RiskProfile | null
}

interface Props {
  state: InspectorState
  onClose: () => void
}

/** Stock inspector shell; strategy instances use shared {@link InstanceDetailSidebar}. */
export function InspectorDrawer({ state, onClose }: Props) {
  if (!state.type || state.type === 'option') return null

  if (state.type === 'strategy' && state.id != null) {
    return (
      <InstanceDetailSidebar
        open
        instanceId={state.id}
        riskProfile={state.riskProfile}
        onClose={onClose}
      />
    )
  }

  return (
    <RightInspectorShell
      open
      ariaLabel="Stock detail"
    >
      {state.type === 'stock' && state.symbol ? (
        <StockInspectorPanel
          symbol={state.symbol}
          accountId={state.accountId}
          livePosition={state.livePosition}
          fundamentalSeed={state.fundamentalSeed}
          onClose={onClose}
        />
      ) : null}
    </RightInspectorShell>
  )
}
