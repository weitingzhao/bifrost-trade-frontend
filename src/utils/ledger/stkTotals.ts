import type { Execution } from '@/types/positions'

export type StkTotals = {
  count: number
  notional: number
  realized: number
  unrealized: number | null
}

/**
 * The share totals of the Summary: fill count, notional and realized over the Flex-confirmed
 * fills only (a pending TWS fill is listed, never added — the same rule as the options figures);
 * unrealized from IB's position snapshot for each account and contract the fills touch.
 */
export function buildStkTotals(
  execs: readonly Execution[],
  unrealizedByKey: ReadonlyMap<string, number | null>,
): StkTotals {
  const confirmed = execs.filter(e => !e.pending)
  let notional = 0
  let realized = 0
  for (const e of confirmed) {
    notional += Math.abs(Number(e.quantity) || 0) * (Number(e.price) || 0)
    realized += Number(e.realized_pnl) || 0
  }
  const seen = new Set<string>()
  let unrealized: number | null = 0
  let anyU = false
  for (const e of execs) {
    const ck = e.contract_key?.trim() ?? `${(e.symbol ?? '').toUpperCase()}|STK|||`
    const key = `${e.account_id}|${ck}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!unrealizedByKey.has(key)) continue
    anyU = true
    const u = unrealizedByKey.get(key)
    if (u != null && Number.isFinite(u)) unrealized = (unrealized ?? 0) + u
  }
  return {
    count: confirmed.length,
    notional,
    realized,
    unrealized: anyU ? unrealized : null,
  }
}
