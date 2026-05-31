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
