import { parseOptionContractKey } from '@/lib/format'
import type { LivePositionRow, OpenOptionPosition } from '@/types/positions'
import type { StrategyStructure } from '@/types/strategy'
import { computeRiskProfile, type RiskPosition, type RiskProfile } from '@/utils/riskProfile'
import { computeInstanceStockCoverage } from '@/utils/stockCoverage'

export function pickWorseRiskProfile(a: RiskProfile, b: RiskProfile): RiskProfile {
  if (a.risk_type === 'unlimited' || b.risk_type !== 'unlimited') {
    if (b.risk_type === 'unlimited' && a.risk_type !== 'unlimited') return b
  }
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

/** "NVDA" from "NVDA", "NVDA 261120C00250000" or "NVDA  ..." — the root the stock row is keyed by. */
function rootSymbol(raw: string | null | undefined): string {
  return (raw ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
}

/** Same risk inputs as Positions `buildInstanceAllGroups` (live option qty + capped stock hedge). */
export function computeInstanceRiskProfileFromOpenOptions(
  optionsForRisk: OpenOptionPosition[],
  structure: StrategyStructure | undefined,
  liveStocks: LivePositionRow[],
): RiskProfile | null {
  if (optionsForRisk.length === 0) return null

  const byAcct = new Map<string, OpenOptionPosition[]>()
  for (const p of optionsForRisk) {
    const aid = (p.account_id ?? '').trim()
    if (!byAcct.has(aid)) byAcct.set(aid, [])
    byAcct.get(aid)!.push(p)
  }

  let merged: RiskProfile | null = null
  for (const optsInAcct of byAcct.values()) {
    const riskPositions: RiskPosition[] = []
    for (const p of optsInAcct) {
      const parsed = parseOptionContractKey(p.contract_key)
      const r = parsed.right === 'C' || parsed.right === 'P' ? parsed.right : null
      if (r && p.avg_cost != null) {
        riskPositions.push({
          strike: p.strike,
          right: r,
          qty: p.qty,
          avg_cost: p.avg_cost,
        })
      }
    }
    if (riskPositions.length === 0) continue

    let covShares = 0
    let covAvgCost = 0
    const covRows = computeInstanceStockCoverage(optsInAcct, structure)
    if (covRows.length === 0) {
      // The template names no underlying leg (most covered-call templates do
      // not), so the shares actually held in this account are set against the
      // instance's short calls — the same arithmetic the Backing gauge and the
      // Covered badge use. Without this the payoff modelled a covered call as
      // naked and printed "+ unlimited" beside a badge that said Covered.
      const shortCallContracts = riskPositions
        .filter((r) => r.right === 'C' && r.qty < 0)
        .reduce((n, r) => n + Math.abs(r.qty), 0)
      const acct = (optsInAcct[0]?.account_id ?? '').trim()
      const sym = rootSymbol(optsInAcct[0]?.symbol)
      if (shortCallContracts > 0 && sym) {
        const heldPos = liveStocks.find(
          (st) =>
            (st.symbol ?? '').toUpperCase() === sym &&
            (st.account_id ?? '').trim() === acct &&
            Number(st.position) > 0,
        )
        const held = heldPos ? Math.floor(Number(heldPos.position) || 0) : 0
        covShares = Math.min(held, shortCallContracts * 100)
        covAvgCost = heldPos?.avgCost != null ? Number(heldPos.avgCost) : 0
      }
    }
    if (covRows.length > 0) {
      const optSym = (optsInAcct[0]?.symbol ?? '').toUpperCase()
      const row = covRows.find((c) => c.symbol.toUpperCase() === optSym) ?? covRows[0]
      const sym = row.symbol
      const acct = row.account_id
      const heldPos = liveStocks.find(
        (s) =>
          (s.symbol ?? '').toUpperCase() === sym.toUpperCase() &&
          (s.account_id ?? '').trim() === acct,
      )
      const held = heldPos ? Math.abs(Number(heldPos.position) || 0) : 0
      covShares = Math.min(held, row.required_shares)
      covAvgCost = heldPos?.avgCost != null ? Number(heldPos.avgCost) : 0
    }

    const rp = computeRiskProfile(riskPositions, covShares, covAvgCost)
    merged = merged == null ? rp : pickWorseRiskProfile(merged, rp)
  }

  return merged
}
