import type { TradeAllGroup } from '@/types/positions'

export interface TradeFilterValues {
  structureType: string
  oppName: string
  scopeType: string
  attributionType: string
}

export interface FilterTradeGroupsInput {
  groups: TradeAllGroup[]
  filterSymbol: string
  filters: TradeFilterValues
}

/** Aligns with Legacy PositionsPage filteredInstanceAllGroups (L3073–3097). */
export function filterTradeGroups({
  groups,
  filterSymbol,
  filters,
}: FilterTradeGroupsInput): TradeAllGroup[] {
  const upper = filterSymbol.trim().toUpperCase()
  let list = groups

  if (upper) {
    list = list.filter((g) => g.options.some((o) => (o.symbol ?? '').toUpperCase().includes(upper)))
  }
  if (filters.structureType !== 'all') {
    list = list.filter((g) => (g.template_code ?? '') === filters.structureType)
  }
  if (filters.oppName !== 'all') {
    list = list.filter((g) => (g.strategy_opportunity_name ?? '') === filters.oppName)
  }
  if (filters.scopeType !== 'all') {
    if (filters.scopeType === '__none__') {
      list = list.filter((g) => !g.scope_type)
    } else {
      list = list.filter((g) => g.scope_type === filters.scopeType)
    }
  }
  if (filters.attributionType !== 'all') {
    list = list.filter((g) => {
      const types = new Set(g.options.map((p) => p.attribution_type ?? 'unassigned'))
      if (filters.attributionType === 'mixed') return types.has('mixed')
      if (filters.attributionType === 'single') return types.has('single') && !types.has('mixed')
      if (filters.attributionType === 'unassigned') return g.trade_id == null
      return true
    })
  }

  return list
}
