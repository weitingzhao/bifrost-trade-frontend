import type { IbPositionRow } from '@/types/monitor'
import type { LivePositionRow, OpenOptionPosition, InstanceAllGroup, PositionInstanceAttribution } from '@/types/positions'
import { isLedgerFixedIncomeCategory, isLedgerCashLikeCategory } from './stockCategories'

export interface AccountFilter {
  host: boolean
  secondary: boolean
}

export function positionMatchesAccountFilter(
  accountId: string,
  filter: AccountFilter,
  hostId: string,
  secondaryId: string,
): boolean {
  if (!hostId && !secondaryId) return true
  const trimmed = accountId.trim()
  const hOn = filter.host
  const sOn = filter.secondary
  if (!hOn && !sOn) return false
  const isHost = !!hostId && trimmed === hostId
  const isSec = !!secondaryId && trimmed === secondaryId
  if (isHost) return hOn
  if (isSec) return sOn
  return hOn && sOn
}

export type StockBucket = 'core' | 'fixed_income' | 'cash_like'

export function classifyStockBucket(category: string | null | undefined): StockBucket {
  const cat = String(category ?? '').trim()
  if (isLedgerFixedIncomeCategory(cat)) return 'fixed_income'
  if (isLedgerCashLikeCategory(cat)) return 'cash_like'
  return 'core'
}

export function flattenPositions(accounts: { account_id?: string; positions?: IbPositionRow[] }[]): LivePositionRow[] {
  const out: LivePositionRow[] = []
  for (const acc of accounts) {
    const aid = acc.account_id ?? ''
    for (const pos of acc.positions ?? []) {
      out.push({ ...pos, account_id: aid })
    }
  }
  return out
}

export function splitBySecType(positions: LivePositionRow[]): {
  stocks: LivePositionRow[]
  options: LivePositionRow[]
} {
  const stocks: LivePositionRow[] = []
  const options: LivePositionRow[] = []
  for (const pos of positions) {
    const st = (pos.secType ?? '').toUpperCase()
    if (st === 'OPT') options.push(pos)
    else stocks.push(pos)
  }
  return { stocks, options }
}

export function filterStocksByBucket(stocks: LivePositionRow[], bucket: StockBucket): LivePositionRow[] {
  return stocks.filter((p) => classifyStockBucket(p.category) === bucket)
}

export function buildOpenOptionPositions(
  optionPositions: LivePositionRow[],
  attributions: PositionInstanceAttribution[],
): OpenOptionPosition[] {
  const attrMap = new Map<string, PositionInstanceAttribution>()
  for (const a of attributions) {
    attrMap.set(`${a.account_id}|${a.contract_key}`, a)
  }

  return optionPositions.map((pos) => {
    const ck = pos.contract_key ?? ''
    const key = `${pos.account_id}|${ck}`
    const attr = attrMap.get(key)

    return {
      kind: 'live' as const,
      contract_key: ck,
      symbol: (pos.symbol ?? '').toUpperCase(),
      strike: pos.strike ?? 0,
      expiry: pos.expiry ?? pos.lastTradeDateOrContractMonth ?? '',
      right: pos.right ?? '',
      qty: pos.position ?? 0,
      avg_cost: pos.avgCost ?? null,
      mark_price: pos.price ?? null,
      unrealized_pnl: pos.unrealized_pnl ?? 0,
      pool_label: 'On' as const,
      account_id: pos.account_id,
      position: pos,
      attribution_type: attr
        ? attr.strategy_instance_id == null
          ? 'unassigned'
          : attr.is_mixed
            ? 'mixed'
            : 'single'
        : undefined,
      attribution_ratio: attr?.attribution_ratio,
      strategy_instance_id: attr?.strategy_instance_id,
      strategy_instance_label: attr?.strategy_instance_label,
      strategy_opportunity_name: attr?.strategy_opportunity_name,
    }
  })
}

export function groupByInstance(positions: OpenOptionPosition[]): InstanceAllGroup[] {
  // Positions with a real instance ID → group by instance
  const linked = new Map<number, OpenOptionPosition[]>()
  const unlinked: OpenOptionPosition[] = []

  for (const pos of positions) {
    const instId = pos.strategy_instance_id ?? null
    if (instId != null) {
      const arr = linked.get(instId)
      if (arr) arr.push(pos)
      else linked.set(instId, [pos])
    } else {
      unlinked.push(pos)
    }
  }

  const result: InstanceAllGroup[] = []

  // Linked instance groups
  for (const [instId, opts] of linked) {
    const first = opts[0]
    const totalPnl = opts.reduce((sum, o) => sum + o.unrealized_pnl, 0)
    result.push({
      strategy_instance_id: instId,
      strategy_instance_label: first?.strategy_instance_label ?? null,
      strategy_opportunity_name: first?.strategy_opportunity_name ?? null,
      strategy_opportunity_id: null,
      strategy_instance_opened_at_epoch: null,
      options: opts,
      stock_coverage: [],
      options_unrealized_pnl: totalPnl,
      structure_type: null,
      scope_type: null,
      risk_profile: null,
    })
  }

  // Unlinked positions: each contract becomes its own row (not all merged under "Uncategorized")
  for (const pos of unlinked) {
    result.push({
      strategy_instance_id: null,
      strategy_instance_label: null,
      strategy_opportunity_name: null,
      strategy_opportunity_id: null,
      strategy_instance_opened_at_epoch: null,
      options: [pos],
      stock_coverage: [],
      options_unrealized_pnl: pos.unrealized_pnl,
      structure_type: null,
      scope_type: null,
      risk_profile: null,
    })
  }

  result.sort((a, b) => {
    if (a.strategy_instance_id == null && b.strategy_instance_id != null) return 1
    if (a.strategy_instance_id != null && b.strategy_instance_id == null) return -1
    return (a.strategy_instance_label ?? '').localeCompare(b.strategy_instance_label ?? '')
  })

  return result
}
