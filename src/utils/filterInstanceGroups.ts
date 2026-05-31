import type { InstanceAllGroup } from '@/types/positions'

export interface InstanceFilterValues {
  structureType: string
  oppName: string
  scopeType: string
  attributionType: string
}

export interface FilterInstanceGroupsInput {
  groups: InstanceAllGroup[]
  filterSymbol: string
  filters: InstanceFilterValues
}

/** Aligns with Legacy PositionsPage filteredInstanceAllGroups (L3073–3097). */
export function filterInstanceGroups({
  groups,
  filterSymbol,
  filters,
}: FilterInstanceGroupsInput): InstanceAllGroup[] {
  const upper = filterSymbol.trim().toUpperCase()
  let list = groups

  if (upper) {
    list = list.filter((g) => g.options.some((o) => (o.symbol ?? '').toUpperCase().includes(upper)))
  }
  if (filters.structureType !== 'all') {
    list = list.filter((g) => (g.structure_type ?? '') === filters.structureType)
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
      if (filters.attributionType === 'unassigned') return g.strategy_instance_id == null
      return true
    })
  }

  return list
}
