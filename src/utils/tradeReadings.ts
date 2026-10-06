/**
 * A trade, read with its own fills.
 *
 * Open or closed is the server's answer (core 0.41.0, TD-43): the list carries
 * `state` — `no_fills` · `open` · `expired` · `closed` — derived from the
 * instance's option fills by the Ledger's rule, the one Review applies. Expired
 * (every open leg past expiry, no closing fill) counts as closed, so it no
 * longer holds room under an allocation's ceiling. This module used to derive
 * its own answer and called those instances open while Review called them
 * closed; it no longer decides. The realised figure is still summed here over
 * the instance's own fills, with the Ledger's cash convention (§14.2).
 *
 * Shared because several pages ask the same question of it: Trading › Rules
 * draws the Instances column, Risk › Limits and Risk › Sizing count the open
 * ones against the allocation's own ceiling, and Positions names a risk face.
 */
import { isBuySide } from '@/utils/ledger/optExecutionGroups'
import type { Execution } from '@/types/positions'
import type { Trade } from '@/types/strategy'

export type TradeState = NonNullable<Trade['state']>

/** `expired` and `closed` are over; `open` and `no_fills` (nothing has happened yet) are not. */
export function isClosedState(state: Trade['state'] | null | undefined): boolean {
  return state === 'closed' || state === 'expired'
}

/** One instance, as the chain reads it. */
export interface TradeReading {
  id: number
  label: string
  symbolish: string
  opportunityId: number
  opportunityName: string
  structureId: number | null
  structureName: string
  openedOn: string | null
  fills: number
  /** The server's state; null when the record came without one (an api older than 0.6.12). */
  state: TradeState | null
  closed: boolean
  /** Signed cash over the instance's own fills. Null while it is still open. */
  realised: number | null
}

/**
 * Each instance with its fills: closed from the server's `state`, and a
 * realised figure over its own fills once closed.
 */
export function readTrades(
  trades: readonly Trade[],
  executions: readonly Execution[],
): TradeReading[] {
  const byTrade = new Map<number, Execution[]>()
  for (const e of executions) {
    const id = e.trade_id
    if (id == null) continue
    byTrade.set(id, [...(byTrade.get(id) ?? []), e])
  }

  return trades.map((i) => {
    const own = byTrade.get(i.trade_id) ?? []
    // No fill at all is `no_fills`, not closed — nothing has happened to it yet,
    // which is a different fact from having been taken flat.
    const closed = isClosedState(i.state)
    const realised = closed
      ? own.reduce((a, e) => {
          const qty = Math.abs(Number(e.quantity) || 0)
          const price = Number(e.price) || 0
          const commission = Number(e.commission) || 0
          return a + (isBuySide(e.side) ? -(price * qty * 100 + commission) : price * qty * 100 - commission)
        }, 0)
      : null

    const symbols = [...new Set(own.map((e) => (e.symbol ?? '').split(' ')[0]).filter(Boolean))]
    return {
      id: i.trade_id,
      label: i.label?.trim() || `#${i.trade_id}`,
      symbolish: symbols.length === 0 ? '—' : symbols.length === 1 ? symbols[0] : `${symbols[0]} +${symbols.length - 1}`,
      opportunityId: i.strategy_opportunity_id,
      opportunityName: i.strategy_opportunity_name ?? '—',
      structureId: i.strategy_structure_id,
      structureName: i.strategy_structure_name ?? '—',
      openedOn: i.opened_at ? i.opened_at.slice(0, 10) : null,
      fills: own.length,
      state: i.state ?? null,
      closed,
      realised,
    }
  })
}
