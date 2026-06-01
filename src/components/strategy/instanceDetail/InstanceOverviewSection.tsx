import { cn } from '@/lib/utils'
import {
  getStructureDisplayLabel,
  getStructureTypeLabel,
  summarizeConstraints,
  summarizeLegs,
} from '@/utils/strategyFormUtils'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import styles from './InstanceDetail.module.css'

interface Props {
  instance: StrategyInstance
  data: InstanceDetailData
}

function statusChipClass(status: InstanceDetailData['positionStatus']): string {
  if (status === 'open') return cn(styles.statusChip, styles.statusOpen)
  if (status === 'closed') return cn(styles.statusChip, styles.statusClosed)
  return cn(styles.statusChip, styles.statusUnknown)
}

export function InstanceOverviewSection({ instance, data }: Props) {
  const { structure, structureLoading, structureError, openEnd, positionStatus } = data
  const structureName =
    structure != null
      ? `${getStructureDisplayLabel(structure)} (${structure.strategy_structure_id})`
      : instance.strategy_structure_name
        ? `${instance.strategy_structure_name}${instance.strategy_structure_id ? ` (${instance.strategy_structure_id})` : ''}`
        : '—'

  return (
    <section className={cn(styles.detailBlock, styles.summaryCard)} aria-label="Instance overview">
      <div className={styles.overviewHead}>
        <h3 className={styles.sectionTitle}>Overview</h3>
        <span className={statusChipClass(positionStatus)}>
          {positionStatus === 'open' ? 'Open' : positionStatus === 'closed' ? 'Closed' : 'No fills'}
        </span>
      </div>

      <dl className={styles.infoDl}>
        <dt>Structure</dt>
        <dd>{structureName}</dd>

        <dt>Open → End</dt>
        <dd title={openEnd.title}>
          {data.execLoading ? (
            <span className={styles.muted}>…</span>
          ) : (
            <>
              {openEnd.openLabel}
              <span className={styles.muted}> → </span>
              {openEnd.endLabel}
            </>
          )}
        </dd>

        {instance.label?.trim() ? (
          <>
            <dt>Label</dt>
            <dd>{instance.label}</dd>
          </>
        ) : null}

        {structureLoading ? (
          <>
            <dt>Details</dt>
            <dd className={styles.muted}>Loading structure…</dd>
          </>
        ) : structureError ? (
          <>
            <dt>Details</dt>
            <dd className={styles.error}>{structureError}</dd>
          </>
        ) : structure ? (
          <>
            <dt>Type</dt>
            <dd>{getStructureTypeLabel(structure.structure_type)}</dd>
            <dt>Legs</dt>
            <dd title={summarizeLegs(structure.legs)}>{summarizeLegs(structure.legs)}</dd>
            <dt>Constraints</dt>
            <dd title={summarizeConstraints(structure.constraints)}>
              {summarizeConstraints(structure.constraints)}
            </dd>
          </>
        ) : (
          <>
            <dt>Details</dt>
            <dd className={styles.muted}>No linked structure details.</dd>
          </>
        )}
      </dl>
    </section>
  )
}
