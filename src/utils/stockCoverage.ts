import type { LivePositionRow, OpenOptionPosition, InstanceAllGroup, InstanceStockCoverage, StockCoverageItem, StrategyStructure } from '@/types/positions'

export function computeInstanceStockCoverage(
  options: OpenOptionPosition[],
  structure: StrategyStructure | undefined,
): InstanceStockCoverage[] {
  if (!structure?.legs?.length) return []
  const underlyingLeg = structure.legs.find((l) => l.role?.toLowerCase() === 'underlying')
  if (!underlyingLeg) return []

  const legQty = underlyingLeg.quantity ?? 1
  const legDir = (underlyingLeg.direction ?? 'long').toLowerCase().includes('short') ? 'short' : 'long'

  const bySymbolAccount = new Map<string, { symbol: string; account_id: string; contracts: number }>()

  for (const opt of options) {
    const key = `${opt.symbol}|${opt.account_id}`
    const entry = bySymbolAccount.get(key)
    const absQty = Math.abs(opt.qty)
    if (entry) {
      entry.contracts += absQty
    } else {
      bySymbolAccount.set(key, { symbol: opt.symbol, account_id: opt.account_id, contracts: absQty })
    }
  }

  const result: InstanceStockCoverage[] = []
  for (const { symbol, account_id, contracts } of bySymbolAccount.values()) {
    result.push({
      symbol,
      account_id,
      required_shares: contracts * 100 * legQty,
      direction: legDir as 'long' | 'short',
    })
  }
  return result
}

function covKey(sym: string, accountId: string): string {
  return `${(sym ?? '').toUpperCase().trim()}\x1f${(accountId ?? '').trim()}`
}

export function buildStockCoverageItems(
  instanceGroups: InstanceAllGroup[],
  liveStocks: LivePositionRow[],
): StockCoverageItem[] {
  type DemandMeta = {
    required: number
    requiredWatchlist: number
    instances: number
    oppNames: Set<string>
    watchlistScopeInstances: number
  }
  const demandMap = new Map<string, DemandMeta>()

  for (const g of instanceGroups) {
    const oppName = (g.strategy_opportunity_name ?? '').trim()
    const isWl = (g.scope_type ?? '').trim() === 'watchlist_stk'
    for (const sc of g.stock_coverage) {
      const sym = (sc.symbol ?? '').toUpperCase().trim()
      if (!sym) continue
      const k = covKey(sym, sc.account_id)
      const prev = demandMap.get(k) ?? {
        required: 0,
        requiredWatchlist: 0,
        instances: 0,
        oppNames: new Set<string>(),
        watchlistScopeInstances: 0,
      }
      prev.required += sc.required_shares
      if (isWl) prev.requiredWatchlist += sc.required_shares
      prev.instances += 1
      if (oppName) prev.oppNames.add(oppName)
      if (isWl) prev.watchlistScopeInstances += 1
      demandMap.set(k, prev)
    }
  }

  type HeldMeta = {
    held: number
    heldAbs: number
    costBasisAbs: number
    lastWeightedSum: number
    lastWeight: number
    dailyPnl: number
    dailyBaseAbs: number
    totalPnl: number
    optionableTrue: number
    optionableFalse: number
    optionableUnknown: number
  }
  const heldMap = new Map<string, HeldMeta>()

  for (const s of liveStocks) {
    const sym = (s.symbol ?? '').toUpperCase().trim()
    if (!sym) continue
    const k = covKey(sym, (s.account_id ?? '').trim())
    const qty = Number(s.position)
    if (!Number.isFinite(qty) || qty === 0) continue
    const absQty = Math.abs(qty)
    const avgCost = s.avgCost != null && Number.isFinite(Number(s.avgCost)) ? Number(s.avgCost) : null
    const lastPrice = s.price != null && Number.isFinite(Number(s.price)) ? Number(s.price) : null
    const dailyPrevClose =
      s.daily_prev_close != null && Number.isFinite(Number(s.daily_prev_close))
        ? Number(s.daily_prev_close)
        : null
    const unrealizedPnl =
      s.unrealized_pnl != null && Number.isFinite(Number(s.unrealized_pnl))
        ? Number(s.unrealized_pnl)
        : lastPrice != null && avgCost != null
          ? (lastPrice - avgCost) * qty
          : 0

    const prev = heldMap.get(k) ?? {
      held: 0,
      heldAbs: 0,
      costBasisAbs: 0,
      lastWeightedSum: 0,
      lastWeight: 0,
      dailyPnl: 0,
      dailyBaseAbs: 0,
      totalPnl: 0,
      optionableTrue: 0,
      optionableFalse: 0,
      optionableUnknown: 0,
    }
    prev.held += qty
    prev.heldAbs += absQty
    if (avgCost != null) prev.costBasisAbs += absQty * avgCost
    if (lastPrice != null) {
      prev.lastWeightedSum += absQty * lastPrice
      prev.lastWeight += absQty
    }
    if (dailyPrevClose != null && lastPrice != null) {
      prev.dailyPnl += (lastPrice - dailyPrevClose) * qty
      prev.dailyBaseAbs += Math.abs(dailyPrevClose * qty)
    }
    prev.totalPnl += unrealizedPnl
    if (s.optionable === true) prev.optionableTrue += 1
    else if (s.optionable === false) prev.optionableFalse += 1
    else prev.optionableUnknown += 1
    heldMap.set(k, prev)
  }

  const allKeys = new Set([...demandMap.keys(), ...heldMap.keys()])
  const result: StockCoverageItem[] = []

  for (const key of allKeys) {
    const sep = key.indexOf('\x1f')
    const symbol = sep >= 0 ? key.slice(0, sep) : key
    const account_id = sep >= 0 ? key.slice(sep + 1) : ''
    const demand = demandMap.get(key)
    const heldMeta = heldMap.get(key)
    const required = demand?.required ?? 0
    const held = heldMeta?.held ?? 0
    if (required === 0 && held === 0) continue

    const costBasis = heldMeta != null && heldMeta.costBasisAbs > 0 ? heldMeta.costBasisAbs : null
    const totalPnl = heldMeta != null && Number.isFinite(heldMeta.totalPnl) ? heldMeta.totalPnl : null
    const totalPct =
      costBasis != null && costBasis > 0 && totalPnl != null ? (totalPnl / costBasis) * 100 : null
    const dailyPct =
      heldMeta != null && heldMeta.dailyBaseAbs > 0
        ? (heldMeta.dailyPnl / heldMeta.dailyBaseAbs) * 100
        : null

    let optionableSupported: boolean | null = null
    if (heldMeta != null) {
      if (heldMeta.optionableTrue > 0 && heldMeta.optionableFalse === 0) optionableSupported = true
      else if (heldMeta.optionableFalse > 0 && heldMeta.optionableTrue === 0) optionableSupported = false
    }

    result.push({
      symbol,
      account_id,
      required_shares: required,
      required_watchlist_shares: demand?.requiredWatchlist ?? 0,
      held_shares: held,
      surplus_or_gap: held - required,
      instances_needing: demand?.instances ?? 0,
      backing_opportunities:
        demand != null ? [...demand.oppNames].sort() : [],
      watchlist_scope_instances: demand?.watchlistScopeInstances ?? 0,
      optionable_supported: optionableSupported,
      avg_cost_per_share:
        heldMeta != null && heldMeta.heldAbs > 0 ? heldMeta.costBasisAbs / heldMeta.heldAbs : null,
      live_last_price:
        heldMeta != null && heldMeta.lastWeight > 0
          ? heldMeta.lastWeightedSum / heldMeta.lastWeight
          : null,
      cost_basis_total: costBasis,
      daily_pnl: heldMeta != null ? heldMeta.dailyPnl : null,
      daily_pct: dailyPct,
      total_pnl: totalPnl,
      total_pct: totalPct,
    })
  }

  result.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.account_id.localeCompare(b.account_id))
  return result
}

export function coverageStatus(item: StockCoverageItem): 'Covered' | 'Partial' | 'Naked' {
  if (item.held_shares >= item.required_shares) return 'Covered'
  if (item.held_shares > 0) return 'Partial'
  return 'Naked'
}
