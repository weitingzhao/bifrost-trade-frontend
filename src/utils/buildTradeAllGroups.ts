import type {
  Execution,
  TradeAllGroup,
  TradePositionGroup,
  LivePositionRow,
  OpenOptionPosition,
  PositionTradeAttribution,
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/positions'
import { computeTradeRiskProfileFromOpenOptions } from '@/utils/tradeRiskProfileFromOpenOptions'
import { computeTradeStockCoverage } from '@/utils/stockCoverage'
import {
  buildLiveOptExecutionMap,
  execPremiumPnl,
  executionMatchesTradeGroup,
  mergeExecsUniqueById,
  optExecutionMatchKey,
  positionExecsForAttribution,
} from '@/utils/positionsExecutions'

export interface BuildTradeAllGroupsInput {
  tradeGroups: TradePositionGroup[]
  attributions: PositionTradeAttribution[]
  executionsFinal: Execution[]
  executionsTws: Execution[]
  opportunities: StrategyOpportunity[]
  structures: StrategyStructure[]
  liveStocks: LivePositionRow[]
}

export function getPositionExecLists(
  pos: OpenOptionPosition,
  finalMap: Map<string, Execution[]>,
  twsMap: Map<string, Execution[]>,
): { final: Execution[]; tws: Execution[]; merged: Execution[] } {
  if (pos.filtered_exec_lists) {
    const { final, tws } = pos.filtered_exec_lists
    return { final, tws, merged: mergeExecsUniqueById(final, tws) }
  }
  if (pos.kind === 'live') {
    const key = optExecutionMatchKey(pos.account_id ?? '', pos.contract_key ?? '')
    const final = finalMap.get(key) ?? []
    const tws = twsMap.get(key) ?? []
    return { final, tws, merged: mergeExecsUniqueById(final, tws) }
  }
  return { final: [], tws: [], merged: [] }
}

export function buildTradeAllGroups(input: BuildTradeAllGroupsInput): TradeAllGroup[] {
  const {
    tradeGroups,
    attributions,
    executionsFinal,
    executionsTws,
    opportunities,
    structures,
    liveStocks,
  } = input

  const oppMap = new Map(opportunities.map((o) => [o.strategy_opportunity_id, o]))
  const structureMap = new Map(structures.map((s) => [s.strategy_structure_id, s]))
  const finalMap = buildLiveOptExecutionMap(executionsFinal)
  const twsMap = buildLiveOptExecutionMap(executionsTws)

  type Bucket = {
    id: number | null
    label: string | null
    oppName: string | null
    oppId: number | null
    openedAt: number | null
    options: OpenOptionPosition[]
  }

  const map = new Map<string, Bucket>()

  for (const g of tradeGroups) {
    const key = g.trade_id != null ? String(g.trade_id) : '__unassigned__'
    const existing = map.get(key)
    if (existing) {
      existing.options.push(...g.positions)
      if (!existing.label && g.trade_label) existing.label = g.trade_label
      if (!existing.oppName && g.strategy_opportunity_name) existing.oppName = g.strategy_opportunity_name
      if (existing.oppId == null && g.strategy_opportunity_id != null) {
        existing.oppId = g.strategy_opportunity_id
      }
      if (existing.openedAt == null && g.trade_opened_at_epoch != null) {
        existing.openedAt = g.trade_opened_at_epoch
      }
    } else {
      map.set(key, {
        id: g.trade_id,
        label: g.trade_label,
        oppName: g.strategy_opportunity_name,
        oppId: g.strategy_opportunity_id ?? null,
        openedAt: g.trade_opened_at_epoch,
        options: [...g.positions],
      })
    }
  }

  const resolveOppId = (bucket: Bucket): number | null => {
    if (bucket.id == null) return null
    if (bucket.oppId != null) return bucket.oppId
    for (const a of attributions) {
      if (a.trade_id === bucket.id && a.strategy_opportunity_id != null) {
        return a.strategy_opportunity_id
      }
    }
    for (const p of bucket.options) {
      if (p.filtered_exec_lists) continue
      const execs = positionExecsForAttribution(getPositionExecLists(p, finalMap, twsMap))
      for (const e of execs) {
        if (e.strategy_opportunity_id != null) return e.strategy_opportunity_id
      }
    }
    return null
  }

  const unassignedKey = '__unassigned__'
  for (const [, b] of map) {
    if (b.id == null) continue
    const oppIdForMatch = resolveOppId(b)
    for (const p of b.options) {
      if (p.filtered_exec_lists) continue
      if (p.attribution_type === 'single' || p.attribution_type === 'mixed') continue
      const full = getPositionExecLists(p, finalMap, twsMap)
      const unscopedFinal = full.final.filter(
        (ex) => !executionMatchesTradeGroup(ex, b.id, oppIdForMatch),
      )
      const unscopedTws = full.tws.filter(
        (ex) => !executionMatchesTradeGroup(ex, b.id, oppIdForMatch),
      )
      if (unscopedFinal.length === 0 && unscopedTws.length === 0) continue
      let u = map.get(unassignedKey)
      if (!u) {
        u = { id: null, label: null, oppName: null, oppId: null, openedAt: null, options: [] }
        map.set(unassignedKey, u)
      }
      u.options.push({
        ...p,
        filtered_exec_lists: { final: unscopedFinal, tws: unscopedTws },
        attribution_type: 'unassigned',
      })
    }
  }

  const result: TradeAllGroup[] = []

  for (const [, b] of map) {
    const oppId = resolveOppId(b)
    let optPnl = 0
    for (const p of b.options) {
      if (p.filtered_exec_lists) {
        const matched = getPositionExecLists(p, finalMap, twsMap).merged
        optPnl += matched.length > 0 ? execPremiumPnl(matched) : p.unrealized_pnl
        continue
      }
      const matched = positionExecsForAttribution(getPositionExecLists(p, finalMap, twsMap)).filter((ex) =>
        executionMatchesTradeGroup(ex, b.id, oppId),
      )
      optPnl += matched.length > 0 ? execPremiumPnl(matched) : p.unrealized_pnl
    }

    const opp = oppId != null ? oppMap.get(oppId) : undefined
    const attrForTrade =
      b.id != null ? attributions.find((a) => a.trade_id === b.id) : undefined
    const strId = opp?.strategy_structure_id ?? attrForTrade?.strategy_structure_id ?? null
    const str = strId != null ? structureMap.get(strId) : undefined
    const resolvedScopeType = opp?.scope_type ?? attrForTrade?.scope_type ?? null
    const optionsForRisk = b.options.filter((p) => !p.filtered_exec_lists)
    const coverage = computeTradeStockCoverage(optionsForRisk, str)

    const riskProfile = computeTradeRiskProfileFromOpenOptions(optionsForRisk, str, liveStocks)

    result.push({
      trade_id: b.id,
      trade_label: b.label,
      strategy_opportunity_name: b.oppName ?? opp?.name ?? null,
      strategy_opportunity_id: oppId,
      trade_opened_at_epoch: b.openedAt,
      options: b.options,
      stock_coverage: coverage,
      options_unrealized_pnl: optPnl,
      // One meaning per key (TD-41): the structures list and attribution used to fill
      // structure_type with a template code and a structure name respectively.
      template_code: str?.template_code ?? attrForTrade?.template_code ?? null,
      template_label: str?.template_display_name ?? null,
      structure_name:
        str?.name ?? attrForTrade?.strategy_structure_name ?? attrForTrade?.structure_type ?? null,
      scope_type: resolvedScopeType,
      risk_profile: riskProfile,
    })
  }

  result.sort((a, b) => {
    if (a.trade_id == null && b.trade_id != null) return 1
    if (a.trade_id != null && b.trade_id == null) return -1
    return (a.trade_label ?? '').localeCompare(b.trade_label ?? '')
  })

  return result
}
