import type {
  Execution,
  InstanceAllGroup,
  InstancePositionGroup,
  LivePositionRow,
  OpenOptionPosition,
  PositionInstanceAttribution,
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/positions'
import { computeInstanceRiskProfileFromOpenOptions } from '@/utils/instanceRiskProfileFromOpenOptions'
import { computeInstanceStockCoverage } from '@/utils/stockCoverage'
import {
  buildLiveOptExecutionMap,
  execPremiumPnl,
  executionMatchesInstanceGroup,
  mergeExecsUniqueById,
  optExecutionMatchKey,
  positionExecsForAttribution,
} from '@/utils/positionsExecutions'

export interface BuildInstanceAllGroupsInput {
  instanceGroups: InstancePositionGroup[]
  attributions: PositionInstanceAttribution[]
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

export function buildInstanceAllGroups(input: BuildInstanceAllGroupsInput): InstanceAllGroup[] {
  const {
    instanceGroups,
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

  for (const g of instanceGroups) {
    const key = g.strategy_instance_id != null ? String(g.strategy_instance_id) : '__unassigned__'
    const existing = map.get(key)
    if (existing) {
      existing.options.push(...g.positions)
      if (!existing.label && g.strategy_instance_label) existing.label = g.strategy_instance_label
      if (!existing.oppName && g.strategy_opportunity_name) existing.oppName = g.strategy_opportunity_name
      if (existing.oppId == null && g.strategy_opportunity_id != null) {
        existing.oppId = g.strategy_opportunity_id
      }
      if (existing.openedAt == null && g.strategy_instance_opened_at_epoch != null) {
        existing.openedAt = g.strategy_instance_opened_at_epoch
      }
    } else {
      map.set(key, {
        id: g.strategy_instance_id,
        label: g.strategy_instance_label,
        oppName: g.strategy_opportunity_name,
        oppId: g.strategy_opportunity_id ?? null,
        openedAt: g.strategy_instance_opened_at_epoch,
        options: [...g.positions],
      })
    }
  }

  const resolveOppId = (bucket: Bucket): number | null => {
    if (bucket.id == null) return null
    if (bucket.oppId != null) return bucket.oppId
    for (const a of attributions) {
      if (a.strategy_instance_id === bucket.id && a.strategy_opportunity_id != null) {
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
        (ex) => !executionMatchesInstanceGroup(ex, b.id, oppIdForMatch),
      )
      const unscopedTws = full.tws.filter(
        (ex) => !executionMatchesInstanceGroup(ex, b.id, oppIdForMatch),
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

  const result: InstanceAllGroup[] = []

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
        executionMatchesInstanceGroup(ex, b.id, oppId),
      )
      optPnl += matched.length > 0 ? execPremiumPnl(matched) : p.unrealized_pnl
    }

    const opp = oppId != null ? oppMap.get(oppId) : undefined
    const attrForInstance =
      b.id != null ? attributions.find((a) => a.strategy_instance_id === b.id) : undefined
    const strId = opp?.strategy_structure_id ?? attrForInstance?.strategy_structure_id ?? null
    const str = strId != null ? structureMap.get(strId) : undefined
    const resolvedScopeType = opp?.scope_type ?? attrForInstance?.scope_type ?? null
    const optionsForRisk = b.options.filter((p) => !p.filtered_exec_lists)
    const coverage = computeInstanceStockCoverage(optionsForRisk, str)

    const riskProfile = computeInstanceRiskProfileFromOpenOptions(optionsForRisk, str, liveStocks)

    result.push({
      strategy_instance_id: b.id,
      strategy_instance_label: b.label,
      strategy_opportunity_name: b.oppName ?? opp?.name ?? null,
      strategy_opportunity_id: oppId,
      strategy_instance_opened_at_epoch: b.openedAt,
      options: b.options,
      stock_coverage: coverage,
      options_unrealized_pnl: optPnl,
      structure_type: str?.structure_type ?? attrForInstance?.structure_type ?? null,
      scope_type: resolvedScopeType,
      risk_profile: riskProfile,
    })
  }

  result.sort((a, b) => {
    if (a.strategy_instance_id == null && b.strategy_instance_id != null) return 1
    if (a.strategy_instance_id != null && b.strategy_instance_id == null) return -1
    return (a.strategy_instance_label ?? '').localeCompare(b.strategy_instance_label ?? '')
  })

  return result
}
