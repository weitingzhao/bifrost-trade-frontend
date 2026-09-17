import type { Execution } from '@/types/positions'
import { buildOptExecutionGroups, type OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'

/**
 * The option groups a filtered ledger view shows.
 *
 * A group is a contract, and whether it is open is a fact about all of its fills,
 * not about the fills a date or type filter left standing. Grouping the filtered
 * rows turned a February open closed by an undated journal row into an open
 * position under "1 month" — with an expiry close that would have written the
 * contract open again. So the groups are built from every fill that passes the
 * contract-choosing filters (account, symbol, structure, expiry), and a group is
 * shown when at least one of its fills passes the full filter.
 */
export function optGroupsForView(
  bookFills: readonly Execution[],
  passesContractFilters: (e: Execution) => boolean,
  shownFills: ReadonlySet<Execution>,
): OptExecutionGroup[] {
  return buildOptExecutionGroups(bookFills.filter(passesContractFilters)).filter(g =>
    g.trades.some(t => shownFills.has(t)),
  )
}
