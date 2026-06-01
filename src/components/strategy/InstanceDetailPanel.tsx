/**
 * Strategy Instance detail — embedded in DetailSidebar, Positions inspector, or compare panes.
 * Visual layout aligned with Legacy StrategyInstanceDetailPage (embedded).
 */
import { RiskProfileDetail } from '@/components/positions/RiskProfileDetail'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useInstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import { InstanceOverviewSection } from './instanceDetail/InstanceOverviewSection'
import { InstancePnLSection } from './instanceDetail/InstancePnLSection'
import { InstanceExecutionsSection } from './instanceDetail/InstanceExecutionsSection'
import { InstanceKlinePlaceholder } from './instanceDetail/InstanceKlinePlaceholder'
import styles from './instanceDetail/InstanceDetail.module.css'

interface Props {
  instance: StrategyInstance
}

export function InstanceDetailPanel({ instance }: Props) {
  const { data: status } = useMonitorStatus()
  const portfolioAccounts = status?.portfolio?.accounts ?? undefined
  const detail = useInstanceDetailData(instance, portfolioAccounts, true)

  if (!detail) return null

  return (
    <div className={styles.page}>
      <div className={styles.mainGrid}>
        <InstanceOverviewSection instance={instance} data={detail} />
        <InstancePnLSection data={detail} />
      </div>

      <InstanceKlinePlaceholder executions={detail.executionsFinal} />

      {detail.riskProfile ? (
        <section className={cn(styles.detailBlock, styles.riskSection)} aria-label="Risk profile">
          <h3 className={styles.sectionTitle}>Risk profile (at expiration)</h3>
          <div className={styles.riskSectionBody}>
            <RiskProfileDetail profile={detail.riskProfile} hideHeading variant="instanceDetail" />
          </div>
        </section>
      ) : null}

      <InstanceExecutionsSection data={detail} />
    </div>
  )
}
