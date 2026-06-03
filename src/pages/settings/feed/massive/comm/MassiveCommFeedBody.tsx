import { Alert, AlertDescription } from '@/components/ui/alert'
import { MassiveCapabilityChipNav } from '@/pages/settings/feed/massive/components/MassiveCapabilityChipNav'
import { groupedCommonFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import { commRowById, commRowEffective } from '@/pages/settings/feed/massive/comm/commRowStatus'
import { useMassiveCommPageNav } from '@/pages/settings/feed/massive/comm/useMassiveCommPageNav'
import { CommTechnicalIndicatorsSection } from '@/pages/settings/feed/massive/comm/sections/CommTechnicalIndicatorsSection'
import { CommMarketOpsSection } from '@/pages/settings/feed/massive/comm/sections/CommMarketOpsSection'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

const TI_ID = 'technical-indicators'
const MO_ID = 'market-ops'

export function MassiveCommFeedBody({
  massiveStatus,
}: {
  massiveStatus: MassiveStatusResponse | null | undefined
}) {
  const configured = Boolean(massiveStatus?.configured)
  const nav = useMassiveCommPageNav()
  const rTi = commRowById(TI_ID)
  const rMo = commRowById(MO_ID)

  return (
    <div className="space-y-4">
      {!configured ? (
        <Alert variant="destructive">
          <AlertDescription>
            Massive API is not configured. Set server.massive_port and API keys in config, then restart the Massive
            server.
          </AlertDescription>
        </Alert>
      ) : null}

      <MassiveCapabilityChipNav
        groupedRows={groupedCommonFeedChecklistRows()}
        rowEffective={row => commRowEffective(row, massiveStatus)}
        onChipClick={nav.navigateToCap}
      />

      <div className="space-y-4">
        <h3
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          id="feed-massive-common-section-tech-indicators"
        >
          Technical Indicators
        </h3>
        {rTi ? (
          <CommTechnicalIndicatorsSection
            row={rTi}
            effectiveStatus={commRowEffective(rTi, massiveStatus)}
            expanded={nav.capExpanded[TI_ID] === true}
            highlighted={nav.highlightedId === TI_ID}
            onToggle={() => nav.toggleCap(TI_ID)}
            configured={configured}
          />
        ) : null}

        <h3
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
          id="feed-massive-common-section-market-ops"
        >
          Market Operations
        </h3>
        {rMo ? (
          <CommMarketOpsSection
            row={rMo}
            effectiveStatus={commRowEffective(rMo, massiveStatus)}
            expanded={nav.capExpanded[MO_ID] === true}
            highlighted={nav.highlightedId === MO_ID}
            onToggle={() => nav.toggleCap(MO_ID)}
            configured={configured}
          />
        ) : null}
      </div>
    </div>
  )
}
