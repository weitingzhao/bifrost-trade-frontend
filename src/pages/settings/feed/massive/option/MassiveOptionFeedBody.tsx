import type { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useOpsWorkers } from '@/hooks/useOpsWorkers'
import {
  MassiveCapabilityChipNav,
  MassiveQueueSummaryLine,
} from '@/pages/settings/feed/massive/components/MassiveCapabilityChipNav'
import { MassiveDeliveryChannelTabs } from '@/pages/settings/feed/massive/components/MassiveDeliveryChannelTabs'
import { MassiveOptionsCoverageBanner } from '@/pages/settings/feed/massive/components/MassiveOptionsCoverageBanner'
import {
  MassiveSectionSegmentControl,
  segmentOptionWithStatus,
} from '@/pages/settings/feed/massive/components/MassiveSectionSegmentControl'
import { groupedOptionFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import { useMassiveOptionJobs } from '@/pages/settings/feed/massive/hooks/useMassiveOptionJobs'
import { OPTION_PROJECT_IDS } from '@/pages/settings/feed/massive/option/optionNavUtils'
import {
  OPTION_REST_SECTION_LABELS,
  OPTION_REST_SECTION_ORDER,
  type OptionRestSectionId,
} from '@/pages/settings/feed/massive/option/optionRestSections'
import { optionRowById, optionRowEffective } from '@/pages/settings/feed/massive/option/optionRowStatus'
import { useMassiveOptionPageNav } from '@/pages/settings/feed/massive/option/useMassiveOptionPageNav'
import { OptionAggregatesSection } from '@/pages/settings/feed/massive/option/sections/OptionAggregatesSection'
import { OptionContractsSection } from '@/pages/settings/feed/massive/option/sections/OptionContractsSection'
import { OptionCorporateActionsSection } from '@/pages/settings/feed/massive/option/sections/OptionCorporateActionsSection'
import { OptionDailyOiSection } from '@/pages/settings/feed/massive/option/sections/OptionDailyOiSection'
import { OptionPlaceholderSection } from '@/pages/settings/feed/massive/option/sections/OptionPlaceholderSection'
import { OptionReferenceSection } from '@/pages/settings/feed/massive/option/sections/OptionReferenceSection'
import { OptionSnapshotsSection } from '@/pages/settings/feed/massive/option/sections/OptionSnapshotsSection'
import { OptionTradesQuotesSection } from '@/pages/settings/feed/massive/option/sections/OptionTradesQuotesSection'
import { OptionWsSection } from '@/pages/settings/feed/massive/option/sections/OptionWsSection'
import type { ChecklistRow } from '@/pages/settings/feed/massive/checklist/types'
import { optionFeedChecklistRows } from '@/pages/settings/feed/massive/checklist/optionStatus'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'

const JOB_KIND_BY_REST_SECTION: Partial<Record<OptionRestSectionId, string>> = {
  contracts: 'feed_option_contracts',
  feed_options_aggregate: 'feed_options_aggregate',
  feed_option_snapshots: 'feed_option_snapshots',
}

const JOB_KIND_BY_PROJECT_ID: Partial<Record<string, string>> = {
  'daily-oi': 'oi',
  'corporate-actions': 'feed_stocks_corporate_action',
}

function RestSectionPanel({
  sectionId,
  massiveStatus,
  configured,
  nav,
  evidenceForKind,
  onJobComplete,
}: {
  sectionId: OptionRestSectionId
  massiveStatus: MassiveStatusResponse | null | undefined
  configured: boolean
  nav: ReturnType<typeof useMassiveOptionPageNav>
  evidenceForKind: (kind: string) => string
  onJobComplete: () => void
}) {
  const row = optionRowById(sectionId)
  if (!row) return null
  const eff = optionRowEffective(row, massiveStatus)
  const kind = JOB_KIND_BY_REST_SECTION[sectionId]
  const evidence = kind ? <span>{evidenceForKind(kind)}</span> : undefined
  const common = {
    row,
    effectiveStatus: eff,
    expanded: nav.capExpanded[sectionId] === true,
    highlighted: nav.highlightedId === sectionId,
    onToggle: () => nav.toggleCap(sectionId),
    configured,
    evidence,
    onJobComplete,
  }

  switch (sectionId) {
    case 'contracts':
      return <OptionContractsSection {...common} />
    case 'feed_options_aggregate':
      return <OptionAggregatesSection {...common} />
    case 'feed_option_snapshots':
      return <OptionSnapshotsSection {...common} />
    case 'trades-quotes':
      return <OptionTradesQuotesSection {...common} massiveStatus={massiveStatus} />
    default:
      return null
  }
}

function ChannelPanel({
  rows,
  activeId,
  renderRow,
}: {
  rows: ChecklistRow[]
  activeId: string
  renderRow: (row: ChecklistRow) => ReactNode
}) {
  const row = rows.find(r => r.id === activeId) ?? rows[0]
  if (!row) return null
  return <>{renderRow(row)}</>
}

function ProjectSectionPanel({
  projectId,
  massiveStatus,
  configured,
  nav,
  evidenceForKind,
  onJobComplete,
}: {
  projectId: string
  massiveStatus: MassiveStatusResponse | null | undefined
  configured: boolean
  nav: ReturnType<typeof useMassiveOptionPageNav>
  evidenceForKind: (kind: string) => string
  onJobComplete: () => void
}) {
  const row = optionRowById(projectId)
  if (!row) return null
  const eff = optionRowEffective(row, massiveStatus)
  const kind = JOB_KIND_BY_PROJECT_ID[projectId]
  const evidence = kind ? <span>{evidenceForKind(kind)}</span> : undefined
  const common = {
    row,
    effectiveStatus: eff,
    expanded: nav.capExpanded[projectId] === true,
    highlighted: nav.highlightedId === projectId,
    onToggle: () => nav.toggleCap(projectId),
    configured,
    evidence,
    onJobComplete,
  }

  switch (projectId) {
    case 'reference':
      return <OptionReferenceSection {...common} />
    case 'daily-oi':
      return <OptionDailyOiSection {...common} />
    case 'corporate-actions':
      return <OptionCorporateActionsSection {...common} />
    default:
      return null
  }
}

export function MassiveOptionFeedBody({
  massiveStatus,
}: {
  massiveStatus: MassiveStatusResponse | null | undefined
}) {
  const configured = Boolean(massiveStatus?.configured)
  const nav = useMassiveOptionPageNav()
  const optionJobs = useMassiveOptionJobs()
  const { data: workersData } = useOpsWorkers()
  const workerCount = workersData?.workers?.length ?? workersData?.count ?? 0

  const allRows = optionFeedChecklistRows()
  const wsRows = allRows.filter(r => r.group === 'ws')
  const flatRows = allRows.filter(r => r.group === 'flat')

  const rowEff = (id: string) => {
    const row = optionRowById(id)
    return row ? optionRowEffective(row, massiveStatus) : ('not-implemented' as const)
  }

  const restOptions = OPTION_REST_SECTION_ORDER.map(id =>
    segmentOptionWithStatus(id, OPTION_REST_SECTION_LABELS[id], rowEff(id)),
  )

  const onJobComplete = () => {
    void optionJobs.refetch()
  }

  const panelCommon = (row: ChecklistRow, evidence?: React.ReactNode) => {
    if (row.group === 'ws') {
      return (
        <OptionWsSection
          row={row}
          effectiveStatus={optionRowEffective(row, massiveStatus)}
          expanded={nav.capExpanded[row.id] === true}
          highlighted={nav.highlightedId === row.id}
          onToggle={() => nav.toggleCap(row.id)}
          configured={configured}
          evidence={evidence}
        />
      )
    }
    return (
      <OptionPlaceholderSection
        row={row}
        effectiveStatus={optionRowEffective(row, massiveStatus)}
        expanded={nav.capExpanded[row.id] === true}
        highlighted={nav.highlightedId === row.id}
        onToggle={() => nav.toggleCap(row.id)}
        evidence={evidence}
      />
    )
  }

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

      <MassiveOptionsCoverageBanner />

      <MassiveCapabilityChipNav
        groupedRows={groupedOptionFeedChecklistRows()}
        rowEffective={row => optionRowEffective(row, massiveStatus)}
        onChipClick={nav.navigateToCap}
        queueSummary={
          <MassiveQueueSummaryLine workerCount={workerCount} activeJobCount={optionJobs.activeJobCount} />
        }
      />

      <MassiveDeliveryChannelTabs value={nav.channelTab} onChange={nav.setChannelTab} />

      {nav.channelTab === 'rest' ? (
        <div className="space-y-4">
          <MassiveSectionSegmentControl
            ariaLabel="REST sections"
            options={restOptions}
            value={nav.restSection}
            onChange={v => {
              const id = v as OptionRestSectionId
              nav.setRestSection(id)
              nav.navigateToCap(id)
            }}
          />
          <RestSectionPanel
            sectionId={nav.restSection}
            massiveStatus={massiveStatus}
            configured={configured}
            nav={nav}
            evidenceForKind={optionJobs.evidenceForKind}
            onJobComplete={onJobComplete}
          />
        </div>
      ) : null}

      {nav.channelTab === 'ws' ? (
        <div className="space-y-4">
          <MassiveSectionSegmentControl
            ariaLabel="WebSocket sections"
            options={wsRows.map(r => segmentOptionWithStatus(r.id, r.service, optionRowEffective(r, massiveStatus)))}
            value={nav.wsSection}
            onChange={v => {
              nav.setWsSection(v)
              nav.navigateToCap(v)
            }}
          />
          <ChannelPanel rows={wsRows} activeId={nav.wsSection} renderRow={row => panelCommon(row)} />
        </div>
      ) : null}

      {nav.channelTab === 'flat' ? (
        <div className="space-y-4">
          <MassiveSectionSegmentControl
            ariaLabel="Flat file sections"
            options={flatRows.map(r => segmentOptionWithStatus(r.id, r.service, optionRowEffective(r, massiveStatus)))}
            value={nav.flatSection}
            onChange={v => {
              nav.setFlatSection(v)
              nav.navigateToCap(v)
            }}
          />
          <ChannelPanel rows={flatRows} activeId={nav.flatSection} renderRow={row => panelCommon(row)} />
        </div>
      ) : null}

      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground" id="feed-massive-group-project">
          Project
        </h3>
        {OPTION_PROJECT_IDS.map(projectId => (
          <ProjectSectionPanel
            key={projectId}
            projectId={projectId}
            massiveStatus={massiveStatus}
            configured={configured}
            nav={nav}
            evidenceForKind={optionJobs.evidenceForKind}
            onJobComplete={onJobComplete}
          />
        ))}
      </div>
    </div>
  )
}
