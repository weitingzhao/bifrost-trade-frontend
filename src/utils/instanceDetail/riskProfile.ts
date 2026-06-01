import { parseOptionContractKey } from '@/lib/format'
import type { Execution } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'
import { computeRiskProfile, type RiskPosition, type RiskProfile } from '@/utils/riskProfile'

function pickWorseRiskProfile(a: RiskProfile, b: RiskProfile): RiskProfile {
  if (a.naked_short_call_contracts !== b.naked_short_call_contracts) {
    return a.naked_short_call_contracts > b.naked_short_call_contracts ? a : b
  }
  if (a.max_loss == null && b.max_loss != null) return a
  if (a.max_loss != null && b.max_loss == null) return b
  if (a.max_loss != null && b.max_loss != null && a.max_loss !== b.max_loss) {
    return a.max_loss < b.max_loss ? a : b
  }
  return a
}

export function computeInstanceRiskProfile(
  executions: Execution[],
  structure: StrategyStructure | null,
  portfolioAccounts: IbAccountSnapshot[] | undefined,
): RiskProfile | null {
  if (!executions.length) return null

  const hasUnderlying = structure?.legs?.some(
    (l) => (l.role ?? '').toLowerCase() === 'underlying',
  )

  const byAcct = new Map<string, Execution[]>()
  for (const e of executions) {
    if ((e.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const aid = (e.account_id ?? '').trim()
    if (!byAcct.has(aid)) byAcct.set(aid, [])
    byAcct.get(aid)!.push(e)
  }

  let merged: RiskProfile | null = null

  for (const exs of byAcct.values()) {
    const netByKey = new Map<string, { strike: number; right: 'C' | 'P'; qty: number; totalCost: number }>()
    for (const e of exs) {
      const parsed = parseOptionContractKey(e.contract_key)
      const r = parsed.right === 'C' || parsed.right === 'P' ? parsed.right : null
      if (!r) continue
      const strike = Number(parsed.strike) || 0
      if (strike <= 0) continue
      const key = `${strike}|${r}`
      const side = (e.side ?? '').toUpperCase()
      const qty = Math.abs(Number(e.quantity ?? e.qty) || 0)
      const price = Number(e.price) || 0
      const signedQty = side === 'BUY' || side === 'BOT' || side === 'B' ? qty : -qty
      const prev = netByKey.get(key) ?? { strike, right: r, qty: 0, totalCost: 0 }
      prev.qty += signedQty
      prev.totalCost += price * qty * (signedQty > 0 ? 1 : -1)
      netByKey.set(key, prev)
    }

    const positions: RiskPosition[] = []
    for (const [, v] of netByKey) {
      if (v.qty === 0) continue
      positions.push({
        strike: v.strike,
        right: v.right,
        qty: v.qty,
        avg_cost: Math.abs(v.totalCost / v.qty),
      })
    }
    if (positions.length === 0) continue

    let covShares = 0
    let covAvgCost: number | null = null
    if (hasUnderlying && portfolioAccounts) {
      const sym = (exs[0]?.symbol ?? '').toUpperCase().split(/\s+/)[0]
      const acct = (exs[0]?.account_id ?? '').trim()
      if (sym && acct) {
        const accRow = portfolioAccounts.find((a) => (a.account_id ?? '').trim() === acct)
        const stk = accRow?.positions?.find(
          (p) =>
            (p.secType ?? '').toUpperCase() !== 'OPT' &&
            (p.symbol ?? '').toUpperCase() === sym,
        )
        if (stk) {
          covShares = Math.abs(Number(stk.position) || 0)
          covAvgCost = stk.avgCost != null ? Number(stk.avgCost) : null
        }
      }
    }

    const rp = computeRiskProfile(positions, covShares, covAvgCost)
    merged = merged == null ? rp : pickWorseRiskProfile(merged, rp)
  }

  return merged
}
