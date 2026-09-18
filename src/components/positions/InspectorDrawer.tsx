import { StockInspectorPanel } from './StockInspectorPanel'
import { InstanceDetailSidebar } from '@/components/strategy/InstanceDetailSidebar'
import { useStrategyInstance } from '@/hooks/useStrategies'
import { INSTANCE_COMPARE_MAX_WIDTH_PX } from '@/constants/instanceDetailSidebar'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { RiskProfile } from '@/utils/riskProfile'
import type { StockInspectorFundamentalSeed } from '@/types/research'

export type InspectorType = 'strategy' | 'stock' | 'option' | null

export interface InspectorState {
  type: InspectorType
  id?: number | null
  /** A second instance, held against the first — the sheet draws them side by side. */
  compareId?: number | null
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

/**
 * The compared instance, fetched by id.
 *
 * The sheet takes a record rather than an id for the second one, and an
 * address carries ids — so this hop exists to turn `?vs=` into the record.
 * Its own hook, because a hook cannot be called from inside the branch below.
 */
function StrategyInspector({
  instanceId,
  compareId,
  riskProfile,
  onClose,
}: {
  instanceId: number
  compareId: number | null
  riskProfile?: RiskProfile | null
  onClose: () => void
}) {
  const compare = useStrategyInstance(compareId ?? undefined, compareId != null)
  return (
    <InstanceDetailSidebar
      open
      instanceId={instanceId}
      compareInstance={compare.data ?? null}
      panelWidthPx={compareId == null ? undefined : INSTANCE_COMPARE_MAX_WIDTH_PX}
      riskProfile={riskProfile}
      onClose={onClose}
    />
  )
}

/** Stock inspector shell; strategy instances use shared {@link InstanceDetailSidebar}. */
export function InspectorDrawer({ state, onClose }: Props) {
  if (!state.type || state.type === 'option') return null

  if (state.type === 'strategy' && state.id != null) {
    return (
      <StrategyInspector
        instanceId={state.id}
        compareId={state.compareId ?? null}
        riskProfile={state.riskProfile}
        onClose={onClose}
      />
    )
  }

  return (
    <RightInspectorShell open ariaLabel="Stock detail" onClose={onClose}>
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
