import { fmtTs } from '@/lib/format'
import type { StrategyInstance, Execution } from '@/types/positions'
import {
  computeInstancePositionStatus,
  instanceListEndDateColumn,
  type InstancePositionStatus,
} from '@/utils/instanceListMetrics'

export function computeOpenEndDisplay(
  instance: StrategyInstance | null,
  executions: Execution[],
  positionStatus?: InstancePositionStatus,
) {
  const status = positionStatus ?? computeInstancePositionStatus(executions)
  const endCol = instanceListEndDateColumn(executions, status)
  const openSec = instance?.opened_at_epoch ?? null
  const openLabel =
    openSec != null
      ? fmtTs(openSec)
      : instance?.opened_at
        ? fmtTs(Math.floor(new Date(instance.opened_at).getTime() / 1000))
        : '—'

  return {
    openLabel,
    endLabel: endCol.display ?? '—',
    title: endCol.cellTitle,
    status,
  }
}
