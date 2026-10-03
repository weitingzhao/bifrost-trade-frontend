import type { Execution, TradeAllGroup, OpenOptionPosition } from '@/types/positions'
import { getPositionExecLists } from '@/utils/buildTradeAllGroups'
import { executionMatchesTradeGroup, mergeExecsUniqueById } from '@/utils/positionsExecutions'
import { sliceExecutionForTradeOptView } from '@/utils/ledger/ledgerOptHelpers'

export function tradeGroupKey(group: Pick<TradeAllGroup, 'trade_id'>): string {
  return group.trade_id != null ? String(group.trade_id) : '__unassigned__'
}

export function tradeDefaultAccountForStockInspect(
  group: Pick<TradeAllGroup, 'trade_id' | 'stock_coverage' | 'options'>,
): string {
  const fromCov = group.stock_coverage[0]?.account_id?.trim()
  if (fromCov) return fromCov
  return (group.options[0]?.account_id ?? '').trim()
}

function execMatchesPositionTrade(
  ex: Execution,
  pos: OpenOptionPosition,
  instId: number | null,
  oppId: number | null,
): boolean {
  if (pos.filtered_exec_lists) return true
  return executionMatchesTradeGroup(ex, instId, oppId)
}

function absExecQty(ex: Execution, instId: number | null): number {
  if (instId != null) {
    const sliced = sliceExecutionForTradeOptView(ex, instId)
    if (!sliced) return 0
    return Math.abs(Number(sliced.quantity) || 0)
  }
  return Math.abs(Number(ex.quantity) || 0)
}

export function scopedExecListsForPosition(
  pos: OpenOptionPosition,
  group: Pick<TradeAllGroup, 'trade_id' | 'strategy_opportunity_id'>,
  finalMap: Map<string, Execution[]>,
  twsMap: Map<string, Execution[]>,
): { final: Execution[]; tws: Execution[]; merged: Execution[] } {
  const instId = group.trade_id
  const oppId = group.strategy_opportunity_id
  const match = (ex: Execution) => execMatchesPositionTrade(ex, pos, instId, oppId)

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

export function formatTradeOptExecQtyCell(
  group: TradeAllGroup,
  finalMap: Map<string, Execution[]>,
  twsMap: Map<string, Execution[]>,
): string {
  const instId = group.trade_id
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
