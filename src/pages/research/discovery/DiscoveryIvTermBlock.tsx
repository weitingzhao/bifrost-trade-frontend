import { OdLayerSection } from '@/components/optionDiscovery/OdLayerSection'
import { OptionDiscoveryIvTermSection } from '@/components/optionDiscovery/OptionDiscoveryIvTermSection'
import type { IvTermPoint, IvVolConePoint } from '@/components/optionDiscovery/OptionDiscoveryAnalytics'
import {
  IV_TERM_DEFAULT_EXPIRATIONS,
  IV_TERM_MAX_EXPIRATIONS,
} from '@/utils/optionDiscovery/strikePresets'
import type { ExpirationKind } from '@/utils/optionDiscovery/expirationMeta'

type Props = {
  selectedSymbol: string
  visibleExpirations: string[]
  expirationFilterKind: ExpirationKind
  onExpirationFilterKindChange: (k: ExpirationKind) => void
  ivTermExpKeys: string[]
  onToggleExpiration: (exp: string, checked: boolean) => void
  onResetExpirationsToDefault: () => void
  onSelectAllExpirations: () => void
  onUncheckAllExpirations: () => void
  massiveBackfillAvailable: boolean
  onBackfillMassiveSnapshots: () => void | Promise<void>
  snapshotSyncLoading: boolean
  snapshotSyncStatus: string | null
  onLoad: () => void | Promise<void>
  termPoints: IvTermPoint[]
  termLoading: boolean
  termError: string | null
  conePoints: IvVolConePoint[]
  coneError: string | null
  expirationsLoading: boolean
  expirationsError: string | null
}

export function DiscoveryIvTermBlock(props: Props) {
  const sym = props.selectedSymbol.trim()
  return (
    <OdLayerSection
      id="od-layer-1"
      step={1}
      title="Underlying & IV term structure"
      subtitle="ATM IV across listed expirations (not limited to the selected expiry)."
      enabled={sym !== ''}
      lockedHint="Select an underlying symbol above."
    >
      <OptionDiscoveryIvTermSection
        symbol={props.selectedSymbol}
        filteredExpirations={props.visibleExpirations}
        expirationFilterKind={props.expirationFilterKind}
        onExpirationFilterKindChange={props.onExpirationFilterKindChange}
        selectedExpirations={props.ivTermExpKeys}
        onToggleExpiration={props.onToggleExpiration}
        onResetExpirationsToDefault={props.onResetExpirationsToDefault}
        onSelectAllExpirations={props.onSelectAllExpirations}
        onUncheckAllExpirations={props.onUncheckAllExpirations}
        maxExpirations={IV_TERM_MAX_EXPIRATIONS}
        defaultExpirationCount={IV_TERM_DEFAULT_EXPIRATIONS}
        massiveBackfillAvailable={props.massiveBackfillAvailable}
        onBackfillMassiveSnapshots={async () => {
          await props.onBackfillMassiveSnapshots()
        }}
        snapshotSyncLoading={props.snapshotSyncLoading}
        snapshotSyncStatus={props.snapshotSyncStatus}
        onLoad={async () => {
          await props.onLoad()
        }}
        termPoints={props.termPoints}
        termLoading={props.termLoading}
        termError={props.termError}
        conePoints={props.conePoints}
        coneError={props.coneError}
        expirationsLoading={props.expirationsLoading}
        expirationsError={props.expirationsError}
      />
    </OdLayerSection>
  )
}
