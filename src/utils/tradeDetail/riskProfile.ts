import { parseOptionContractKey } from '@/lib/format'
import type {
  Execution,
  TradeAllGroup,
  PositionTradeAttribution,
} from '@/types/positions'
import type { StrategyOpportunity, StrategyStructure } from '@/types/strategy'
import type { IbAccountSnapshot } from '@/types/monitor'
import { sliceExecutionForTradeOptView } from '@/utils/ledger/ledgerOptHelpers'
import { computeRiskProfile, type RiskPosition, type RiskProfile } from '@/utils/riskProfile'

/** Same merge rule as Legacy `StrategyInstanceDetailPage` risk profile. */
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

/**
 * Instance inspector risk — mirrors Legacy `StrategyInstanceDetailPage`:
 * execution net legs + stock only when instance structure has an `underlying` leg
 * (full account stock position, not Positions-table min(held, required)).
 */
/** "NVDA" from "NVDA", "NVDA 261120C00250000" or "NVDA  ..." — the root the stock row is keyed by. */
function rootSymbol(raw: string | null | undefined): string {
  return (raw ?? '').trim().split(/\s+/)[0]?.toUpperCase() ?? ''
}

export function computeTradeRiskProfile(
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
      const qty = Math.abs(Number(e.quantity) || 0)
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
    if (portfolioAccounts) {
      const sym = rootSymbol(exs[0]?.symbol)
      const acct = (exs[0]?.account_id ?? '').trim()
      if (sym && acct) {
        const accRow = portfolioAccounts.find((a) => (a.account_id ?? '').trim() === acct)
        const stk = accRow?.positions?.find(
          (p) =>
            (p.secType ?? '').toUpperCase() !== 'OPT' &&
            (p.symbol ?? '').toUpperCase() === sym &&
            Number(p.position) > 0,
        )
        if (stk) {
          const held = Math.floor(Math.abs(Number(stk.position) || 0))
          if (hasUnderlying) {
            covShares = held
          } else {
            // The template names no underlying leg (most covered-call templates
            // do not). The shares held in this account still cover this
            // account's short calls — the same arithmetic the Covered badge and
            // the Backing gauge use. Modelling them as naked printed
            // "+ unlimited" beside a badge that said Covered.
            const shortCallContracts = positions
              .filter((p) => p.right === 'C' && p.qty < 0)
              .reduce((n, p) => n + Math.abs(p.qty), 0)
            covShares = Math.min(held, shortCallContracts * 100)
          }
          covAvgCost = covShares > 0 && stk.avgCost != null ? Number(stk.avgCost) : null
        }
      }
    }

    const rp = computeRiskProfile(positions, covShares, covAvgCost)
    merged = merged == null ? rp : pickWorseRiskProfile(merged, rp)
  }

  return merged
}

export function sliceExecutionsForTrade(
  executions: Execution[],
  tradeId: number,
): Execution[] {
  return executions
    .map((ex) => sliceExecutionForTradeOptView(ex, tradeId))
    .filter((row): row is Execution => row != null)
}

/** Prefer instance.strategy_structure_id (Strategy sidebar), same as useTradeDetailData. */
export function resolveStructureForTrade(
  tradeId: number | null,
  opportunityId: number | null,
  tradeStructureById: ReadonlyMap<number, number | null | undefined>,
  attributions: PositionTradeAttribution[],
  opportunities: StrategyOpportunity[],
  structureMap: ReadonlyMap<number, StrategyStructure>,
): StrategyStructure | null {
  let strId: number | null = null
  if (tradeId != null) {
    const fromTrade = tradeStructureById.get(tradeId)
    if (fromTrade != null) strId = fromTrade
  }
  if (strId == null && tradeId != null) {
    const attr = attributions.find((a) => a.trade_id === tradeId)
    strId = attr?.strategy_structure_id ?? null
  }
  if (strId == null && opportunityId != null) {
    strId =
      opportunities.find((o) => o.strategy_opportunity_id === opportunityId)?.strategy_structure_id ??
      null
  }
  return strId != null ? (structureMap.get(strId) ?? null) : null
}

/** Positions instance expand + Strategy sidebar — execution book + instance structure. */
export function computeTradeDetailRiskProfileForGroup(
  group: Pick<TradeAllGroup, 'trade_id' | 'strategy_opportunity_id'>,
  executionsFinal: Execution[],
  tradeStructureById: ReadonlyMap<number, number | null | undefined>,
  attributions: PositionTradeAttribution[],
  opportunities: StrategyOpportunity[],
  structureMap: ReadonlyMap<number, StrategyStructure>,
  portfolioAccounts: IbAccountSnapshot[] | undefined,
): RiskProfile | null {
  const tradeId = group.trade_id
  if (tradeId == null) return null
  const execs = sliceExecutionsForTrade(executionsFinal, tradeId)
  const structure = resolveStructureForTrade(
    tradeId,
    group.strategy_opportunity_id,
    tradeStructureById,
    attributions,
    opportunities,
    structureMap,
  )
  return computeTradeRiskProfile(execs, structure, portfolioAccounts)
}
