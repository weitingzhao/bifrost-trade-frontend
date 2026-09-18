/**
 * The instance list, filtered and grouped — one derivation, two readers.
 *
 * Strategy › Instances built this inline. Trade › Rules needs the same thing
 * (design 2026-09-18 makes instances a column of the chain, and the Owner asked
 * for the list's metrics, filters and compare to come with it), so it moved
 * here rather than being written twice. Two lists that disagreed about which
 * symbol an instance belongs to, or about what `open` means, would be worse
 * than one list in the wrong place.
 *
 * The per-instance metrics come from `useInstanceMetrics`, which loads in
 * chunks: everything below tolerates an entry that is still `loading`, and a
 * filter that depends on one (status, right, expiry) simply does not match
 * until it is ready rather than guessing.
 */
import { useMemo } from 'react'
import { useInstanceMetrics, type InstanceListMetricsEntry } from '@/hooks/useInstanceMetrics'
import { computeInstancePositionStatus } from '@/utils/instanceListMetrics'
import { primaryUnderlyingFromExecutions } from '@/components/positions/linkExecutionModalHelpers'
import type { InstanceFilterOptions, InstanceListFilterValues } from '@/components/strategy/InstanceListFilters'
import type { StrategyInstance } from '@/types/positions'

/** An opportunity, as this derivation needs to read it. */
export interface BookOpportunity {
  strategy_opportunity_id: number
  scope_type: string | null
  symbols: string[]
}

export interface InstanceGroup {
  key: string
  label: string
  rows: StrategyInstance[]
}

function ymdUtcMonthsAgo(months: number): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate())).toISOString().slice(0, 10)
}

export function sinceThresholdYmd(v: InstanceListFilterValues['since']): string | null {
  if (v === '1m') return ymdUtcMonthsAgo(1)
  if (v === 'q') return ymdUtcMonthsAgo(3)
  if (v === 'half') return ymdUtcMonthsAgo(6)
  if (v === '1y') return ymdUtcMonthsAgo(12)
  if (v === 'ytd') return `${new Date().getUTCFullYear()}-01-01`
  return null
}

/**
 * Which symbol an instance belongs to — from its own executions.
 *
 * A multi-symbol opportunity book must not fall back to `symbols[0]`: that
 * collapses every instance in the book under the first ticker in it.
 */
export function instanceSymbol(
  inst: StrategyInstance,
  opportunities: readonly BookOpportunity[],
  metricsMap: Map<number, InstanceListMetricsEntry>,
): string {
  const entry = metricsMap.get(inst.strategy_instance_id)
  if (entry?.status === 'ready') {
    const fromExec = primaryUnderlyingFromExecutions(entry.sliced)
    if (fromExec) return fromExec
  }
  const opp = opportunities.find((o) => o.strategy_opportunity_id === inst.strategy_opportunity_id)
  if (!opp) return '—'
  const st = (opp.scope_type ?? '').trim()
  if (st !== 'explicit_symbols' && st !== 'watchlist_stk') return '—'
  const sym = opp.symbols?.filter((s) => s?.trim()) ?? []
  return sym.length === 1 ? sym[0].trim().toUpperCase() : '—'
}

export interface InstanceBook {
  metricsMap: Map<number, InstanceListMetricsEntry>
  filterOptions: InstanceFilterOptions
  filtered: StrategyInstance[]
  groups: InstanceGroup[]
  /** `2026-06-18 ~ 2026-09-18`, or null when the window is All. */
  sinceRangeText: string | null
}

export function useInstanceBook(args: {
  instances: StrategyInstance[]
  opportunities: readonly BookOpportunity[]
  values: InstanceListFilterValues
  /** A single instance picked by id, which overrides every other filter. */
  instanceId?: number | ''
  metricsRefreshKey?: number
}): InstanceBook {
  const { instances, opportunities, values, instanceId = '', metricsRefreshKey = 0 } = args
  const metricsMap = useInstanceMetrics(instances, metricsRefreshKey)

  /** Rights and expiry months an instance actually holds, from its own fills. */
  const positionMeta = useMemo(() => {
    const map = new Map<number, { rights: Set<'C' | 'P'>; expiryMonths: Set<string> }>()
    for (const inst of instances) {
      const entry = metricsMap.get(inst.strategy_instance_id)
      if (!entry || entry.status !== 'ready') continue
      map.set(inst.strategy_instance_id, { rights: new Set(), expiryMonths: new Set() })
      const meta = map.get(inst.strategy_instance_id)!
      for (const e of entry.sliced) {
        const right = (e.option_right ?? e.right ?? '').toUpperCase().charAt(0)
        if (right === 'C' || right === 'P') meta.rights.add(right)
        const exp = (e.expiry ?? '').replace(/\D/g, '')
        if (exp.length >= 6) meta.expiryMonths.add(`${exp.slice(0, 4)}-${exp.slice(4, 6)}`)
      }
    }
    return map
  }, [instances, metricsMap])

  const filterOptions = useMemo<InstanceFilterOptions>(() => {
    const structures = new Set<string>()
    const symbols = new Set<string>()
    const rights = new Set<'C' | 'P'>()
    const expiryMonths = new Set<string>()
    for (const inst of instances) {
      const sn = (inst.strategy_structure_name ?? '').trim()
      if (sn) structures.add(sn)
      const sym = instanceSymbol(inst, opportunities, metricsMap)
      if (sym !== '—') symbols.add(sym)
      const meta = positionMeta.get(inst.strategy_instance_id)
      if (meta) {
        for (const r of meta.rights) rights.add(r)
        for (const m of meta.expiryMonths) expiryMonths.add(m)
      }
    }
    return {
      structures: [...structures].sort(),
      symbols: [...symbols].sort(),
      rights: [...rights].sort(),
      expiryMonths: [...expiryMonths].sort(),
    }
  }, [instances, opportunities, positionMeta, metricsMap])

  const filtered = useMemo(() => {
    let list = instances
    if (instanceId !== '') list = list.filter((i) => i.strategy_instance_id === instanceId)
    if (values.structure) {
      list = list.filter((i) => (i.strategy_structure_name ?? '').trim() === values.structure)
    }
    if (values.symbol) {
      list = list.filter((i) => instanceSymbol(i, opportunities, metricsMap) === values.symbol)
    }
    if (values.right) {
      list = list.filter((i) => positionMeta.get(i.strategy_instance_id)?.rights.has(values.right as 'C' | 'P') ?? false)
    }
    if (values.expiry) {
      list = list.filter((i) => positionMeta.get(i.strategy_instance_id)?.expiryMonths.has(values.expiry) ?? false)
    }
    if (values.status) {
      list = list.filter((i) => {
        const entry = metricsMap.get(i.strategy_instance_id)
        if (!entry || entry.status !== 'ready') return false
        const ps = computeInstancePositionStatus(entry.sliced)
        return values.status === 'open' ? ps === 'open' : ps === 'closed'
      })
    }
    if (values.since) {
      const threshold = sinceThresholdYmd(values.since)
      if (threshold) {
        const ts = new Date(threshold).getTime() / 1000
        list = list.filter((i) => i.opened_at_epoch != null && i.opened_at_epoch >= ts)
      }
    }
    return list
  }, [instances, instanceId, values, metricsMap, opportunities, positionMeta])

  const groups = useMemo(() => {
    const out: InstanceGroup[] = []
    const indexByKey = new Map<string, number>()
    for (const inst of filtered) {
      const sym = instanceSymbol(inst, opportunities, metricsMap)
      const idx = indexByKey.get(sym)
      if (idx == null) {
        indexByKey.set(sym, out.length)
        out.push({ key: sym, label: sym, rows: [inst] })
      } else {
        out[idx].rows.push(inst)
      }
    }
    return out
  }, [filtered, opportunities, metricsMap])

  const sinceRangeText = useMemo(() => {
    const start = values.since ? sinceThresholdYmd(values.since) : null
    return start == null ? null : `${start} ~ ${new Date().toISOString().slice(0, 10)}`
  }, [values.since])

  return { metricsMap, filterOptions, filtered, groups, sinceRangeText }
}
