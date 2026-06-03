import { cn } from '@/lib/utils'
import {
  getStructureDisplayLabel,
  getStructureTypeLabel,
  summarizeConstraints,
  summarizeLegs,
} from '@/utils/strategyFormUtils'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { DenseTag } from '@/components/data-display'
import {
  instanceDetailBlockClass,
  instanceSectionTitleClass,
  instanceStatusClosedClass,
  instanceStatusOpenClass,
  instanceStatusUnknownClass,
  instanceOverviewHeadClass,
} from './instanceDetailUi'
import styles from './instanceOverview.module.css'

interface Props {
  instance: StrategyInstance
  data: InstanceDetailData
  hideSectionTitle?: boolean
}

function statusChipClass(status: InstanceDetailData['positionStatus']): string {
  if (status === 'open') return instanceStatusOpenClass
  if (status === 'closed') return instanceStatusClosedClass
  return instanceStatusUnknownClass
}

function statusLabel(status: InstanceDetailData['positionStatus']): string {
  if (status === 'open') return 'Open'
  if (status === 'closed') return 'Closed'
  return 'No fills'
}

export function InstanceOverviewSection({ instance, data, hideSectionTitle = false }: Props) {
  const { structure, structureLoading, structureError, openEnd, positionStatus } = data
  const structureName =
    structure != null
      ? getStructureDisplayLabel(structure)
      : instance.strategy_structure_name?.trim() || '—'
  const structureId = structure?.strategy_structure_id ?? instance.strategy_structure_id

  const Wrapper = hideSectionTitle ? 'div' : 'section'
  const wrapperProps = hideSectionTitle
    ? { 'aria-label': 'Instance overview' as const }
    : { className: instanceDetailBlockClass, 'aria-label': 'Instance overview' as const }

  return (
    <Wrapper {...wrapperProps}>
      {!hideSectionTitle ? (
        <div className={instanceOverviewHeadClass}>
          <h3 className={instanceSectionTitleClass}>Overview</h3>
          <span className={statusChipClass(positionStatus)}>{statusLabel(positionStatus)}</span>
        </div>
      ) : (
        <div className={styles.chipRow}>
          <span className={statusChipClass(positionStatus)}>{statusLabel(positionStatus)}</span>
          {structure ? (
            <span className={styles.typeChip}>{getStructureTypeLabel(structure.structure_type)}</span>
          ) : null}
          {instance.label?.trim() ? (
            <DenseTag variant="instance" size="pill" title={instance.label}>
              {instance.label}
            </DenseTag>
          ) : null}
        </div>
      )}

      <div className={styles.cardGrid}>
        <div className={inspectorShell.card}>
          <div className={inspectorShell.cardLabel}>Structure</div>
          <div className={styles.kvGrid}>
            <div className={styles.structureName}>{structureName}</div>
            {structureId != null ? (
              <>
                <span className={styles.kvK}>ID</span>
                <span className={styles.kvV}>{structureId}</span>
              </>
            ) : null}
            {structure ? (
              <>
                <span className={styles.kvK}>Type</span>
                <span className={styles.kvV}>{getStructureTypeLabel(structure.structure_type)}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className={inspectorShell.card}>
          <div className={inspectorShell.cardLabel}>Timeline</div>
          <div className={styles.kvGrid} title={openEnd.title}>
            <span className={styles.kvK}>Open</span>
            <span className={styles.kvV}>
              {data.execLoading ? <span className={styles.muted}>…</span> : openEnd.openLabel}
            </span>
            <span className={styles.kvK}>End</span>
            <span className={styles.kvV}>
              {data.execLoading ? <span className={styles.muted}>…</span> : openEnd.endLabel}
            </span>
          </div>
        </div>

        <div className={cn(inspectorShell.card, 'min-w-0')}>
          <div className={inspectorShell.cardLabel}>Configuration</div>
          {structureLoading ? (
            <p className={styles.muted}>Loading structure…</p>
          ) : structureError ? (
            <p className={styles.error}>{structureError}</p>
          ) : structure ? (
            <div className="space-y-2.5">
              <div className={styles.kvBlock}>
                <span className={styles.kvBlockLabel}>Legs</span>
                <span className={styles.kvBlockValue} title={summarizeLegs(structure.legs)}>
                  {summarizeLegs(structure.legs)}
                </span>
              </div>
              <div className={styles.kvBlock}>
                <span className={styles.kvBlockLabel}>Constraints</span>
                <span className={styles.kvBlockValue} title={summarizeConstraints(structure.constraints)}>
                  {summarizeConstraints(structure.constraints)}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>No linked structure details.</p>
          )}
          {!hideSectionTitle && instance.label?.trim() ? (
            <div className={cn(styles.kvGrid, 'mt-2.5 border-t border-border pt-2.5')}>
              <span className={styles.kvK}>Label</span>
              <span className={styles.kvV}>{instance.label}</span>
            </div>
          ) : null}
        </div>
      </div>
    </Wrapper>
  )
}
