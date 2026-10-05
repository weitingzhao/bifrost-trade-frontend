/**
 * A fill as the desk reads it — side, quantity, the name it is filed under,
 * what claims it. Built once from the executions read.
 *
 * Shared because the Calendar's Fills layer quotes the same rows on their
 * trade date (§14.2: moved out of `pages/trade/fills` when it became the
 * second reader).
 */
import { underlyingOfContract } from '@/utils/optionTicker'
import type { Execution } from '@/types/positions'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'

/** What claims a fill, in the order a desk would ask. */
export type FillState = 'linked' | 'orphan'

export interface FillRow {
  key: string
  /** The ledger row id the link write needs; null on a row the server sent without one. */
  execId: number | null
  /** Unix seconds; null when the source did not stamp one. */
  time: number | null
  tradeDate: string | null
  symbol: string
  contractKey: string
  secType: string
  accountId: string
  side: string
  qty: number
  price: number
  /** Always a cost, whichever sign the source reported. */
  fees: number
  /** `flex_trades`, `tws_client`, `journal_closed` — the source's own word. */
  source: string
  state: FillState
  tradeId: number | null
  tradeLabel: string | null
  opportunityName: string | null
  /** Why nothing claims it, when nothing does. */
  why: string | null
}

const SELL = /^(s|sell|sld)$/i

function sideWord(e: Execution): string {
  const raw = String(e.side ?? '').trim()
  if (!raw) return '—'
  return SELL.test(raw) ? 'SELL' : 'BUY'
}

function execKey(e: Execution): string {
  return `${e.account_executions_id ?? ''}|${e.exec_id ?? ''}|${e.account_id ?? ''}`
}

/**
 * Why nothing claims this fill.
 *
 * The book's own answer is the only one available: a fill with no strategy
 * instance belongs to no idea. Whether a plan exists on the symbol is worth
 * saying because it is the difference between "nobody wrote this down" and
 * "somebody did, and it never got linked".
 */
export function orphanReason(e: Execution, planSymbols: ReadonlySet<string>): string {
  const symbol = underlyingOfContract(e)
  if (planSymbols.has(symbol)) return `no trade · a plan exists on ${symbol}`
  return `no trade · no plan on ${symbol || 'this symbol'}`
}

export function buildFillRows(
  executions: readonly Execution[],
  plans: readonly StrategyPlan[] = [],
): FillRow[] {
  const planSymbols = new Set(plans.map((p) => (p.symbol ?? '').trim().toUpperCase()).filter(Boolean))
  return executions
    .map((e) => {
      const linked = e.trade_id != null
      return {
        key: execKey(e),
        execId: e.account_executions_id ?? null,
        time: e.time ?? null,
        tradeDate: e.trade_date ?? null,
        // The contract key's root, so a TWS fill and a Flex fill of one option read one name.
        symbol: underlyingOfContract(e),
        contractKey: e.contract_key ?? '',
        secType: (e.sec_type ?? '').toUpperCase(),
        accountId: (e.account_id ?? '').trim(),
        side: sideWord(e),
        qty: Math.abs(Number(e.quantity ?? 0)) || 0,
        price: Number(e.price) || 0,
        // Signed as IB books it: a cost is positive, a rebate negative.
        fees: Number(e.commission) || 0,
        source: (e.source ?? '').trim() || 'unknown',
        state: (linked ? 'linked' : 'orphan') as FillState,
        tradeId: e.trade_id ?? null,
        tradeLabel: e.trade_label ?? null,
        opportunityName: e.strategy_opportunity_name ?? null,
        why: linked ? null : orphanReason(e, planSymbols),
      }
    })
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0) || a.key.localeCompare(b.key))
}
