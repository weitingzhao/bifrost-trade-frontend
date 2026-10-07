/**
 * One reviewed contract's share of the snapshot attribution (api 0.12.0,
 * TD-138): the attribution rows of its trade on its own contract, summed over
 * the sessions the snapshot could read. Review quotes P&L Explain's figures;
 * it does not recompute them.
 */
import type { AttributionRow } from '@/lib/schemas/snapshots'
import type { ReviewContract } from '@/utils/reviewContracts'

export interface ContractAttribution {
  delta: number
  gamma: number
  vega: number
  theta: number
  unexplained: number
  held: number
  /** Sessions with a fully read row for this contract. */
  sessions: string[]
  /** Rows on this contract that could not be read (opened / closed in a session, no Greeks, no mark). */
  unread: number
  degraded: number
  missing: number
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toUpperCase()

export function contractAttribution(
  rows: readonly AttributionRow[],
  trade: Pick<ReviewContract, 'tradeId' | 'underlying' | 'expiry' | 'strike' | 'right' | 'accountId'>,
): ContractAttribution | null {
  const mine = rows.filter(
    (r) =>
      r.trade_id === trade.tradeId &&
      norm(r.symbol) === norm(trade.underlying) &&
      (r.expiry ?? '').slice(0, 10) === (trade.expiry ?? '').slice(0, 10) &&
      r.strike != null &&
      Math.abs(r.strike - trade.strike) < 1e-6 &&
      norm(r.option_right).slice(0, 1) === norm(trade.right).slice(0, 1) &&
      (!trade.accountId || r.account_id === trade.accountId),
  )
  if (mine.length === 0) return null
  const out: ContractAttribution = {
    delta: 0, gamma: 0, vega: 0, theta: 0, unexplained: 0, held: 0, sessions: [], unread: 0, degraded: 0, missing: 0,
  }
  for (const r of mine) {
    if (r.greeks_quality === 'degraded') out.degraded += 1
    if (r.greeks_quality === 'missing') out.missing += 1
    if (r.unexplained == null) {
      out.unread += 1
      continue
    }
    out.delta += r.delta_pnl ?? 0
    out.gamma += r.gamma_pnl ?? 0
    out.vega += r.vega_pnl ?? 0
    out.theta += r.theta_pnl ?? 0
    out.unexplained += r.unexplained
    out.held += r.held_pnl ?? 0
    out.sessions.push(r.snapshot_date)
  }
  return out
}

/** The range to ask for: the trade's life, inside the API's 800-day cap. */
export function tradeLifeRange(openedOn: string | null, closedOn: string | null): { from: string | null; to: string | null } {
  if (!openedOn) return { from: null, to: closedOn }
  if (!closedOn) return { from: openedOn, to: null }
  const cap = new Date(Date.parse(`${closedOn}T00:00:00Z`) - 790 * 86_400_000).toISOString().slice(0, 10)
  return { from: openedOn > cap ? openedOn : cap, to: closedOn }
}
