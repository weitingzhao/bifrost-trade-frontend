/**
 * A strategy instance, read from its own fills.
 *
 * The record the server returns carries an opportunity, an account, an
 * opened-at and a fill count — **no state and no P&L**. Both are derived here,
 * with the Ledger's grouping and cash convention so an instance that reads
 * closed is closed by the same rule the Trade Ledger uses (§14.2).
 *
 * Shared because two pages ask the same question of it: Trade › Rules draws the
 * Instances column, and Risk › Limits counts the open ones against the
 * allocation's own ceiling.
 */
import { buildOptExecutionGroups, isBuySide } from '@/utils/ledger/optExecutionGroups'
import type { Execution } from '@/types/positions'
import type { StrategyInstance } from '@/types/strategy'

/** One instance, as the chain reads it. */
export interface InstanceReading {
  id: number
  label: string
  symbolish: string
  opportunityId: number
  opportunityName: string
  structureId: number | null
  structureName: string
  openedOn: string | null
  fills: number
  closed: boolean
  /** Signed cash over the instance's own fills. Null while it is still open. */
  realised: number | null
}

/**
 * An instance's own fills, read into open/closed and a realised figure.
 *
 * Grouping is `buildOptExecutionGroups`, the Ledger's own, so an instance that
 * reads closed here is closed by the same rule the Trade Ledger uses.
 */
export function readInstances(
  instances: readonly StrategyInstance[],
  executions: readonly Execution[],
): InstanceReading[] {
  const byInstance = new Map<number, Execution[]>()
  for (const e of executions) {
    const id = e.strategy_instance_id
    if (id == null) continue
    byInstance.set(id, [...(byInstance.get(id) ?? []), e])
  }

  return instances.map((i) => {
    const own = byInstance.get(i.strategy_instance_id) ?? []
    const groups = buildOptExecutionGroups([...own])
    // An instance with no fill at all is not closed — nothing has happened to
    // it yet, which is a different fact from having been taken flat.
    const closed = groups.length > 0 && groups.every((g) => g.status === 'realized')
    const realised = closed
      ? own.reduce((a, e) => {
          const qty = Math.abs(Number(e.quantity ?? e.qty) || 0)
          const price = Number(e.price) || 0
          const commission = Number(e.commission) || 0
          return a + (isBuySide(e.side) ? -(price * qty * 100 + commission) : price * qty * 100 - commission)
        }, 0)
      : null

    const symbols = [...new Set(own.map((e) => (e.symbol ?? '').split(' ')[0]).filter(Boolean))]
    return {
      id: i.strategy_instance_id,
      label: i.label?.trim() || `#${i.strategy_instance_id}`,
      symbolish: symbols.length === 0 ? '—' : symbols.length === 1 ? symbols[0] : `${symbols[0]} +${symbols.length - 1}`,
      opportunityId: i.strategy_opportunity_id,
      opportunityName: i.strategy_opportunity_name ?? '—',
      structureId: i.strategy_structure_id,
      structureName: i.strategy_structure_name ?? '—',
      openedOn: i.opened_at ? i.opened_at.slice(0, 10) : null,
      fills: own.length,
      closed,
      realised,
    }
  })
}
