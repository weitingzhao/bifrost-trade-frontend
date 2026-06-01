import {
  getStructureDisplayLabel,
  getStructureTypeLabel,
  summarizeConstraints,
  summarizeLegs,
} from '@/utils/strategyFormUtils'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import type { StrategyInstance } from '@/types/positions'
import {
  instanceDetailBlockClass,
  instanceErrorClass,
  instanceInfoDlClass,
  instanceMutedClass,
  instanceOverviewHeadClass,
  instanceSectionTitleClass,
  instanceStatusClosedClass,
  instanceStatusOpenClass,
  instanceStatusUnknownClass,
} from './instanceDetailUi'

interface Props {
  instance: StrategyInstance
  data: InstanceDetailData
}

function statusChipClass(status: InstanceDetailData['positionStatus']): string {
  if (status === 'open') return instanceStatusOpenClass
  if (status === 'closed') return instanceStatusClosedClass
  return instanceStatusUnknownClass
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
    <section className={instanceDetailBlockClass} aria-label="Instance overview">
      <div className={instanceOverviewHeadClass}>
        <h3 className={instanceSectionTitleClass}>Overview</h3>
        <span className={statusChipClass(positionStatus)}>
          {positionStatus === 'open' ? 'Open' : positionStatus === 'closed' ? 'Closed' : 'No fills'}
        </span>
      </div>

      <dl className={instanceInfoDlClass}>
        <dt>Structure</dt>
        <dd>{structureName}</dd>

        <dt>Open → End</dt>
        <dd title={openEnd.title}>
          {data.execLoading ? (
            <span className={instanceMutedClass}>…</span>
          ) : (
            <>
              {openEnd.openLabel}
              <span className={instanceMutedClass}> → </span>
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
            <dd className={instanceMutedClass}>Loading structure…</dd>
          </>
        ) : structureError ? (
          <>
            <dt>Details</dt>
            <dd className={instanceErrorClass}>{structureError}</dd>
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
            <dd className={instanceMutedClass}>No linked structure details.</dd>
          </>
        )}
      </dl>
    </section>
  )
}
