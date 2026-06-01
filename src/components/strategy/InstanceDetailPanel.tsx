/**
 * Strategy Instance detail — embedded in DetailSidebar, Positions inspector, or compare panes.
 * Visual layout aligned with Legacy StrategyInstanceDetailPage (embedded).
 */
import { RiskProfileDetail } from '@/components/positions/RiskProfileDetail'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useInstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import { InstanceOverviewSection } from './instanceDetail/InstanceOverviewSection'
import { InstancePnLSection } from './instanceDetail/InstancePnLSection'
import { InstanceExecutionsSection } from './instanceDetail/InstanceExecutionsSection'
import { InstanceKlinePlaceholder } from './instanceDetail/InstanceKlinePlaceholder'
import {
  instanceDetailBlockClass,
  instanceDetailPageClass,
  instanceMainGridClass,
  instanceRiskSectionBodyClass,
  instanceSectionTitleClass,
} from './instanceDetail/instanceDetailUi'

interface Props {
  instance: StrategyInstance
}

export function InstanceDetailPanel({ instance }: Props) {
  const { data: status } = useMonitorStatus()
  const portfolioAccounts = status?.portfolio?.accounts ?? undefined
  const detail = useInstanceDetailData(instance, portfolioAccounts, true)

  if (!detail) return null

  return (
    <div className={instanceDetailPageClass}>
      <div className={instanceMainGridClass}>
        <InstanceOverviewSection instance={instance} data={detail} />
        <InstancePnLSection data={detail} />
      </div>

      <InstanceKlinePlaceholder executions={detail.executionsFinal} />

      {detail.riskProfile ? (
        <section className={instanceDetailBlockClass} aria-label="Risk profile">
          <h3 className={instanceSectionTitleClass}>Risk profile (at expiration)</h3>
          <div className={instanceRiskSectionBodyClass}>
            <RiskProfileDetail profile={detail.riskProfile} hideHeading variant="instanceDetail" />
          </div>
        </section>
      ) : null}

      <InstanceExecutionsSection data={detail} />
    </div>
  )
}
