import type { Execution, InstanceAllGroup, OpenOptionPosition } from '@/types/positions'
import { getPositionExecLists } from '@/utils/buildInstanceAllGroups'
import { executionMatchesInstanceGroup, mergeExecsUniqueById } from '@/utils/positionsExecutions'
import { sliceExecutionForInstanceOptView } from '@/utils/ledger/ledgerOptHelpers'

export function instanceGroupKey(group: Pick<InstanceAllGroup, 'strategy_instance_id'>): string {
  return group.strategy_instance_id != null ? String(group.strategy_instance_id) : '__unassigned__'
}

export function instanceDefaultAccountForStockInspect(
  group: Pick<InstanceAllGroup, 'strategy_instance_id' | 'stock_coverage' | 'options'>,
): string {
  const fromCov = group.stock_coverage[0]?.account_id?.trim()
  if (fromCov) return fromCov
  return (group.options[0]?.account_id ?? '').trim()
}

function execMatchesPositionInstance(
  ex: Execution,
  pos: OpenOptionPosition,
  instId: number | null,
  oppId: number | null,
): boolean {
  if (pos.filtered_exec_lists) return true
  return executionMatchesInstanceGroup(ex, instId, oppId)
}

function absExecQty(ex: Execution, instId: number | null): number {
  if (instId != null) {
    const sliced = sliceExecutionForInstanceOptView(ex, instId)
    if (!sliced) return 0
    return Math.abs(Number(sliced.quantity ?? sliced.qty) || 0)
  }
  return Math.abs(Number(ex.quantity ?? ex.qty) || 0)
}

export function scopedExecListsForPosition(
  pos: OpenOptionPosition,
  group: Pick<InstanceAllGroup, 'strategy_instance_id' | 'strategy_opportunity_id'>,
  finalMap: Map<string, Execution[]>,
  twsMap: Map<string, Execution[]>,
): { final: Execution[]; tws: Execution[]; merged: Execution[] } {
  const instId = group.strategy_instance_id
  const oppId = group.strategy_opportunity_id
  const match = (ex: Execution) => execMatchesPositionInstance(ex, pos, instId, oppId)

  if (pos.filtered_exec_lists) {
    const final = pos.filtered_exec_lists.final.filter(match)
    const tws = pos.filtered_exec_lists.tws.filter(match)
    return { final, tws, merged: mergeExecsUniqueById(final, tws) }
  }

  const lists = getPositionExecLists(pos, finalMap, twsMap)
  const final = lists.final.filter(match)
  const tws = lists.tws.filter(match)
  return { final, tws, merged: mergeExecsUniqueById(final, tws) }
}

export function formatInstanceOptExecQtyCell(
  group: InstanceAllGroup,
  finalMap: Map<string, Execution[]>,
  twsMap: Map<string, Execution[]>,
): string {
  const instId = group.strategy_instance_id
  const perOption: string[] = []

  for (const pos of group.options) {
    const { final, tws } = scopedExecListsForPosition(pos, group, finalMap, twsMap)
    const src = final.length > 0 ? final : tws
    const qtyStrs =
      src.length > 0
        ? src.map((ex) => String(absExecQty(ex, instId)))
        : [String(Math.abs(pos.qty))]
    perOption.push(qtyStrs.join(', '))
  }

  return perOption.length > 0 ? perOption.join(' ｜ ') : '—'
}
