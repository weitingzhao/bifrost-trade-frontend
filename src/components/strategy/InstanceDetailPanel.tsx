/**
 * Strategy instance detail body — same sections/nav as Stock/Option inspectors; shell is {@link InstanceDetailSidebar}.
 */
import { useCallback, useState } from 'react'
import { RiskProfileDetail } from '@/components/positions/RiskProfileDetail'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useInstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import { InspectorSectionNav } from '@/components/layout/InspectorSectionNav'
import { RightInspectorCollapsibleSection } from '@/components/layout/RightInspectorCollapsibleSection'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { InstanceOverviewSection } from './instanceDetail/InstanceOverviewSection'
import { InstancePnLSection } from './instanceDetail/InstancePnLSection'
import { InstanceExecutionsSection } from './instanceDetail/InstanceExecutionsSection'
import { InstanceKlineSection } from './instanceDetail/InstanceKlineSection'
import {
  defaultInstanceExpandedSections,
  focusInstanceSection,
  INSTANCE_INSPECTOR_NAV,
  INSTANCE_INSPECTOR_NAV_BY_ID,
  INSTANCE_INSPECTOR_SECTION_DOM_ID,
  soleInstanceExpandedSection,
  type InstanceInspectorSectionId,
} from './instanceDetail/instanceInspectorSections'
interface Props {
  instance: StrategyInstance
}

export function InstanceDetailPanel({ instance }: Props) {
  const { data: status } = useMonitorStatus()
  const portfolioAccounts = status?.portfolio?.accounts ?? undefined
  const detail = useInstanceDetailData(instance, portfolioAccounts, true)
  const [expandedSections, setExpandedSections] = useState(defaultInstanceExpandedSections)

  const toggleSection = useCallback((id: InstanceInspectorSectionId) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const focusSection = useCallback((id: InstanceInspectorSectionId) => {
    setExpandedSections(focusInstanceSection(id))
    requestAnimationFrame(() => {
      document.getElementById(INSTANCE_INSPECTOR_SECTION_DOM_ID[id])?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  if (!detail) return null

  const showChart = detail.executionsFinal.some((e) => (e.symbol ?? '').trim())
  const showRisk = Boolean(detail.riskProfile)

  const navItems = INSTANCE_INSPECTOR_NAV.filter((item) => {
    if (item.id === 'chart') return showChart
    if (item.id === 'risk') return showRisk
    return true
  })

  const chartSymbol = detail.executionsFinal
    .map((e) => (e.symbol ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? '')
    .find(Boolean)

  return (
    <div className={inspectorShell.stack}>
      <InspectorSectionNav
        items={navItems}
        activeId={soleInstanceExpandedSection(expandedSections)}
        onFocus={focusSection}
      />

        <RightInspectorCollapsibleSection
          sectionId={INSTANCE_INSPECTOR_SECTION_DOM_ID.overview}
          navItem={INSTANCE_INSPECTOR_NAV_BY_ID.overview}
          expanded={expandedSections.overview}
          onToggle={() => toggleSection('overview')}
        >
          <InstanceOverviewSection instance={instance} data={detail} hideSectionTitle />
        </RightInspectorCollapsibleSection>

        <RightInspectorCollapsibleSection
          sectionId={INSTANCE_INSPECTOR_SECTION_DOM_ID.pnl}
          navItem={INSTANCE_INSPECTOR_NAV_BY_ID.pnl}
          expanded={expandedSections.pnl}
          onToggle={() => toggleSection('pnl')}
        >
          <InstancePnLSection data={detail} hideSectionTitle />
        </RightInspectorCollapsibleSection>

        {showChart ? (
          <RightInspectorCollapsibleSection
            sectionId={INSTANCE_INSPECTOR_SECTION_DOM_ID.chart}
            navItem={INSTANCE_INSPECTOR_NAV_BY_ID.chart}
            expanded={expandedSections.chart}
            onToggle={() => toggleSection('chart')}
          >
            <InstanceKlineSection
              symbol={chartSymbol ?? ''}
              executions={detail.executionsFinal}
              strategyInstanceId={instance.strategy_instance_id}
            />
          </RightInspectorCollapsibleSection>
        ) : null}

        {showRisk && detail.riskProfile ? (
          <RightInspectorCollapsibleSection
            sectionId={INSTANCE_INSPECTOR_SECTION_DOM_ID.risk}
            navItem={INSTANCE_INSPECTOR_NAV_BY_ID.risk}
            expanded={expandedSections.risk}
            onToggle={() => toggleSection('risk')}
          >
            <RiskProfileDetail profile={detail.riskProfile} hideHeading variant="instanceDetail" />
          </RightInspectorCollapsibleSection>
        ) : null}

        <RightInspectorCollapsibleSection
          sectionId={INSTANCE_INSPECTOR_SECTION_DOM_ID.executions}
          navItem={INSTANCE_INSPECTOR_NAV_BY_ID.executions}
          expanded={expandedSections.executions}
          onToggle={() => toggleSection('executions')}
        >
          <InstanceExecutionsSection data={detail} hideSectionTitle />
        </RightInspectorCollapsibleSection>
    </div>
  )
}
