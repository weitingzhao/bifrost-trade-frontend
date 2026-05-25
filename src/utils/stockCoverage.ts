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

export function buildStockCoverageItems(
  instanceGroups: InstanceAllGroup[],
  liveStocks: LivePositionRow[],
): StockCoverageItem[] {
  const demandMap = new Map<string, {
    required: number
    instances_needing: number
    backing_opportunities: string[]
  }>()

  for (const group of instanceGroups) {
    for (const sc of group.stock_coverage) {
      const key = `${sc.symbol}|${sc.account_id}`
      const entry = demandMap.get(key)
      if (entry) {
        entry.required += sc.required_shares
        entry.instances_needing += 1
        if (group.strategy_opportunity_name && !entry.backing_opportunities.includes(group.strategy_opportunity_name)) {
          entry.backing_opportunities.push(group.strategy_opportunity_name)
        }
      } else {
        demandMap.set(key, {
          required: sc.required_shares,
          instances_needing: 1,
          backing_opportunities: group.strategy_opportunity_name ? [group.strategy_opportunity_name] : [],
        })
      }
    }
  }

  const heldMap = new Map<string, { shares: number; costSum: number; lastPrice: number | null }>()
  for (const stk of liveStocks) {
    const sym = (stk.symbol ?? '').toUpperCase()
    if (!sym) continue
    const key = `${sym}|${stk.account_id}`
    const qty = stk.position ?? 0
    const entry = heldMap.get(key)
    if (entry) {
      entry.shares += qty
      if (stk.avgCost != null) entry.costSum += Math.abs(qty) * stk.avgCost
      if (stk.price != null) entry.lastPrice = stk.price
    } else {
      heldMap.set(key, {
        shares: qty,
        costSum: stk.avgCost != null ? Math.abs(qty) * stk.avgCost : 0,
        lastPrice: stk.price ?? null,
      })
    }
  }

  const allKeys = new Set([...demandMap.keys(), ...heldMap.keys()])
  const items: StockCoverageItem[] = []

  for (const key of allKeys) {
    const [symbol, account_id] = key.split('|')
    const demand = demandMap.get(key)
    const held = heldMap.get(key)

    const required = demand?.required ?? 0
    const heldShares = held?.shares ?? 0

    if (required === 0 && heldShares === 0) continue

    const costBasis = held?.costSum ?? null
    const avgCost = heldShares !== 0 && costBasis != null ? costBasis / Math.abs(heldShares) : null
    const lastPrice = held?.lastPrice ?? null
    const totalPnl = avgCost != null && lastPrice != null && heldShares !== 0
      ? (lastPrice - avgCost) * heldShares
      : null
    const totalPct = avgCost != null && avgCost !== 0 && lastPrice != null
      ? ((lastPrice - avgCost) / avgCost) * 100
      : null

    items.push({
      symbol,
      account_id,
      required_shares: required,
      held_shares: heldShares,
      surplus_or_gap: heldShares - required,
      instances_needing: demand?.instances_needing ?? 0,
      backing_opportunities: demand?.backing_opportunities,
      avg_cost_per_share: avgCost,
      live_last_price: lastPrice,
      cost_basis_total: costBasis,
      total_pnl: totalPnl,
      total_pct: totalPct,
    })
  }

  items.sort((a, b) => Math.abs(b.required_shares) - Math.abs(a.required_shares))
  return items
}

export function coverageStatus(item: StockCoverageItem): 'Covered' | 'Partial' | 'Naked' {
  if (item.held_shares >= item.required_shares) return 'Covered'
  if (item.held_shares > 0) return 'Partial'
  return 'Naked'
}
