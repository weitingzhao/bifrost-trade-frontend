import type { Execution } from '@/types/positions'
import {
  executionStrategyInstanceIds,
  findOppositeLegAttributionSource,
} from '@/utils/ledger/ledgerOptHelpers'

export { findOppositeLegAttributionSource }

/**
 * Opposite-leg sync uses the shared helper: opposite side, same |qty|, same contract,
 * peer has exactly one instance. Fills that already have an instance are skipped.
 * The looser OptGroupRow matcher (qty not required) is retired — copying attribution
 * onto a different size would mis-state K5.
 */
export function oppositeLegSyncPayload(
  trades: Execution[],
  ex: Execution,
): { opportunity_id: number; instance_id: number } | null {
  if (executionStrategyInstanceIds(ex).length > 0) return null
  const peer = findOppositeLegAttributionSource(trades, ex)
  if (!peer) return null
  const opp = peer.strategy_opportunity_id
  const ids = executionStrategyInstanceIds(peer)
  if (opp == null || !Number.isFinite(Number(opp)) || ids.length !== 1) return null
  return { opportunity_id: Number(opp), instance_id: ids[0] }
}
