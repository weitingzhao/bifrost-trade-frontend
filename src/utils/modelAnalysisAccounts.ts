import type { AccountFilter } from '@/utils/positionsGrouping'
import type { StatusResponse } from '@/types/monitor'

export interface ModelAnalysisAccountChoice {
  hostId: string
  secondaryId: string
  hostSelectable: boolean
  secondarySelectable: boolean
  hasSnapshotAccounts: boolean
  initialAccountId: string
}

/** Host / Secondary from monitor config; selectable only when present in status snapshot. */
export function resolveModelAnalysisAccounts(
  status: StatusResponse | null | undefined,
): ModelAnalysisAccountChoice {
  const accounts = status?.portfolio?.accounts ?? []
  const ib = status?.config?.ib_client?.account
  const hostId = (ib?.event_host ?? ib?.trading ?? '').trim()
  const secondaryId = (ib?.event_secondary ?? '').trim()
  const ids = new Set(accounts.map(a => (a.account_id ?? '').trim()).filter(Boolean))
  const hostSelectable = Boolean(hostId && ids.has(hostId))
  const secondarySelectable = Boolean(secondaryId && ids.has(secondaryId))
  const initialAccountId = hostSelectable ? hostId : secondarySelectable ? secondaryId : ''

  return {
    hostId,
    secondaryId,
    hostSelectable,
    secondarySelectable,
    hasSnapshotAccounts: accounts.length > 0,
    initialAccountId,
  }
}

export type ModelBandSide = 'host' | 'secondary'

export interface ModelBandAccount {
  /** The account the band reads; '' issues no request. */
  accountId: string
  side: ModelBandSide | null
  /** The page scope names one account: the band follows it and its control is a read-only tag. */
  locked: boolean
  /** Both accounts are in the page scope, so the band is reading one of two and must say so. */
  scopeHasBoth: boolean
}

/**
 * Which account the model band reads. Core's endpoint takes one account, so
 * the band follows the page scope when the scope names exactly one, and when
 * the scope has both it reads the side the reader chose — Host by default —
 * and says so. A side the snapshot does not carry cannot be read; with both
 * in scope the other side stands in, with one in scope nothing does.
 */
export function resolveModelBandAccount(
  choice: Pick<ModelAnalysisAccountChoice, 'hostId' | 'secondaryId' | 'hostSelectable' | 'secondarySelectable'>,
  filter: AccountFilter,
  override: ModelBandSide | null,
): ModelBandAccount {
  const idOf = (side: ModelBandSide) => (side === 'host' ? choice.hostId : choice.secondaryId)
  const selectable = (side: ModelBandSide) => (side === 'host' ? choice.hostSelectable : choice.secondarySelectable)

  if (filter.host !== filter.secondary) {
    const side: ModelBandSide = filter.host ? 'host' : 'secondary'
    return { accountId: selectable(side) ? idOf(side) : '', side, locked: true, scopeHasBoth: false }
  }
  if (!filter.host) return { accountId: '', side: null, locked: true, scopeHasBoth: false }

  const wanted: ModelBandSide = override ?? 'host'
  const other: ModelBandSide = wanted === 'host' ? 'secondary' : 'host'
  const side = selectable(wanted) ? wanted : selectable(other) ? other : null
  return { accountId: side ? idOf(side) : '', side, locked: false, scopeHasBoth: true }
}
