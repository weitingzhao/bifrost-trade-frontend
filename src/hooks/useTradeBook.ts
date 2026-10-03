/**
 * The instance list, filtered and grouped — one derivation, two readers.
 *
 * Strategy › Instances built this inline. Trading › Rules needs the same thing
 * (design 2026-09-18 makes instances a column of the chain, and the Owner asked
 * for the list's metrics, filters and compare to come with it), so it moved
 * here rather than being written twice. Two lists that disagreed about which
 * symbol an instance belongs to, or about what `open` means, would be worse
 * than one list in the wrong place.
 *
 * The per-instance metrics come from `useTradeMetrics`, which loads in
 * chunks: everything below tolerates an entry that is still `loading`, and a
 * filter that depends on one (status, right, expiry) simply does not match
 * until it is ready rather than guessing.
 */
import { useMemo } from 'react'
import { useTradeMetrics, type TradeListMetricsEntry } from '@/hooks/useTradeMetrics'
import { computeTradePositionStatus } from '@/utils/tradeListMetrics'
import { primaryUnderlyingFromExecutions } from '@/components/positions/linkExecutionModalHelpers'
import type { TradeFilterOptions, TradeListFilterValues } from '@/components/strategy/TradeListFilters'
import type { Trade } from '@/types/positions'

/** An opportunity, as this derivation needs to read it. */
export interface BookOpportunity {
  strategy_opportunity_id: number
  scope_type: string | null
  /** Null in the opportunity list when it has none (api 0.3.1 `OpportunityRow`). */
  symbols: string[] | null
}

export interface TradeGroup {
  key: string
  label: string
  rows: Trade[]
}

function ymdUtcMonthsAgo(months: number): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate())).toISOString().slice(0, 10)
}

export function sinceThresholdYmd(v: TradeListFilterValues['since']): string | null {
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
export function tradeSymbol(
  inst: Trade,
  opportunities: readonly BookOpportunity[],
  metricsMap: Map<number, TradeListMetricsEntry>,
): string {
  const entry = metricsMap.get(inst.trade_id)
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

/**
 * The loading group's key (PROD 2026-09-28): a multi-symbol book can only
 * name an instance from its own fills, and those load five instances at a
 * time — so for tens of seconds most rows have no symbol *yet*. Grouping
 * them under "—" rendered the wait as a reading ("36 instances with no
 * symbol", every one of which measured as having fills). Rows whose metrics
 * are still loading go under this key instead; "—" is reserved for the real
 * reading — metrics arrived and still no underlying resolves.
 */
export const TRADE_GROUP_LOADING = '__loading__'
/** Fills that failed to load — named as a failure, never folded into loading. */
export const TRADE_GROUP_FAILED = '__failed__'

export function tradeGroupKey(
  inst: Trade,
  opportunities: readonly BookOpportunity[],
  metricsMap: Map<number, TradeListMetricsEntry>,
): string {
  const sym = tradeSymbol(inst, opportunities, metricsMap)
  if (sym !== '—') return sym
  const entry = metricsMap.get(inst.trade_id)
  if (entry?.status === 'ready') return '—'
  if (entry?.status === 'error') return TRADE_GROUP_FAILED
  return TRADE_GROUP_LOADING
}

export interface TradeBook {
  metricsMap: Map<number, TradeListMetricsEntry>
  filterOptions: TradeFilterOptions
  filtered: Trade[]
  groups: TradeGroup[]
  /** `2026-06-18 ~ 2026-09-18`, or null when the window is All. */
  sinceRangeText: string | null
}

export function useTradeBook(args: {
  trades: Trade[]
  opportunities: readonly BookOpportunity[]
  values: TradeListFilterValues
  /** A single instance picked by id, which overrides every other filter. */
  tradeId?: number | ''
  metricsRefreshKey?: number
}): TradeBook {
  const { trades, opportunities, values, tradeId = '', metricsRefreshKey = 0 } = args
  const metricsMap = useTradeMetrics(trades, metricsRefreshKey)

  /** Rights and expiry months an instance actually holds, from its own fills. */
  const positionMeta = useMemo(() => {
    const map = new Map<number, { rights: Set<'C' | 'P'>; expiryMonths: Set<string> }>()
    for (const inst of trades) {
      const entry = metricsMap.get(inst.trade_id)
      if (!entry || entry.status !== 'ready') continue
      map.set(inst.trade_id, { rights: new Set(), expiryMonths: new Set() })
      const meta = map.get(inst.trade_id)!
      for (const e of entry.sliced) {
        const right = (e.option_right ?? '').toUpperCase().charAt(0)
        if (right === 'C' || right === 'P') meta.rights.add(right)
        const exp = (e.expiry ?? '').replace(/\D/g, '')
        if (exp.length >= 6) meta.expiryMonths.add(`${exp.slice(0, 4)}-${exp.slice(4, 6)}`)
      }
    }
    return map
  }, [trades, metricsMap])

  const filterOptions = useMemo<TradeFilterOptions>(() => {
    const structures = new Set<string>()
    const symbols = new Set<string>()
    const rights = new Set<'C' | 'P'>()
    const expiryMonths = new Set<string>()
    for (const inst of trades) {
      const sn = (inst.strategy_structure_name ?? '').trim()
      if (sn) structures.add(sn)
      const sym = tradeSymbol(inst, opportunities, metricsMap)
      if (sym !== '—') symbols.add(sym)
      const meta = positionMeta.get(inst.trade_id)
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
  }, [trades, opportunities, positionMeta, metricsMap])

  const filtered = useMemo(() => {
    let list = trades
    if (tradeId !== '') list = list.filter((i) => i.trade_id === tradeId)
    if (values.structure) {
      list = list.filter((i) => (i.strategy_structure_name ?? '').trim() === values.structure)
    }
    if (values.symbol) {
      list = list.filter((i) => tradeSymbol(i, opportunities, metricsMap) === values.symbol)
    }
    if (values.right) {
      list = list.filter((i) => positionMeta.get(i.trade_id)?.rights.has(values.right as 'C' | 'P') ?? false)
    }
    if (values.expiry) {
      list = list.filter((i) => positionMeta.get(i.trade_id)?.expiryMonths.has(values.expiry) ?? false)
    }
    if (values.status) {
      list = list.filter((i) => {
        const entry = metricsMap.get(i.trade_id)
        if (!entry || entry.status !== 'ready') return false
        const ps = computeTradePositionStatus(entry.sliced)
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
  }, [trades, tradeId, values, metricsMap, opportunities, positionMeta])

  const groups = useMemo(() => {
    const out: TradeGroup[] = []
    const indexByKey = new Map<string, number>()
    for (const inst of filtered) {
      const key = tradeGroupKey(inst, opportunities, metricsMap)
      const idx = indexByKey.get(key)
      if (idx == null) {
        indexByKey.set(key, out.length)
        out.push({ key, label: key, rows: [inst] })
      } else {
        out[idx].rows.push(inst)
      }
    }
    // The loading group sits last, whatever order the rows arrived in.
    const tail = (k: string) => (k === TRADE_GROUP_FAILED ? 2 : k === TRADE_GROUP_LOADING ? 1 : 0)
    out.sort((a, b) => tail(a.key) - tail(b.key))
    return out
  }, [filtered, opportunities, metricsMap])

  const sinceRangeText = useMemo(() => {
    const start = values.since ? sinceThresholdYmd(values.since) : null
    return start == null ? null : `${start} ~ ${new Date().toISOString().slice(0, 10)}`
  }, [values.since])

  return { metricsMap, filterOptions, filtered, groups, sinceRangeText }
}
