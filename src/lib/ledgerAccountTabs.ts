import type { StatusResponse } from '@/types/monitor'
import type { AccountFilter } from '@/utils/positionsGrouping'

export type LedgerAccountTab = { id: string; label: string }

function hostId(status: StatusResponse | null | undefined): string {
  return status?.config?.ib_client?.account?.event_host?.trim() ?? ''
}

function secondaryId(status: StatusResponse | null | undefined): string {
  return status?.config?.ib_client?.account?.event_secondary?.trim() ?? ''
}

/** All + account numbers with a role qualifier. Never Host / Secondary as the chip. */
export function getLedgerAccountTabs(
  status: StatusResponse | null | undefined,
): LedgerAccountTab[] {
  const tabs: LedgerAccountTab[] = []
  const host = hostId(status)
  const secondary = secondaryId(status)
  if (host) tabs.push({ id: host, label: `${host} · host` })
  if (secondary && secondary !== host) tabs.push({ id: secondary, label: `${secondary} · secondary` })
  return tabs
}

export function getLedgerAccountIds(status: StatusResponse | null | undefined): string[] {
  return getLedgerAccountTabs(status).map(t => t.id)
}

export function ledgerAccountIdFromScope(
  accountFilter: AccountFilter,
  status: StatusResponse | null | undefined,
): string {
  const host = hostId(status)
  const secondary = secondaryId(status)
  const { host: hostOn, secondary: secOn } = accountFilter
  if (hostOn && secOn) return 'all'
  if (hostOn && !secOn) return host || 'all'
  if (!hostOn && secOn) return secondary || 'all'
  return 'all'
}

export function ledgerScopeFromAccountId(
  accountId: string,
  status: StatusResponse | null | undefined,
): AccountFilter {
  const host = hostId(status)
  const secondary = secondaryId(status)
  if (accountId === 'all' || !accountId) return { host: true, secondary: true }
  if (host && accountId === host) return { host: true, secondary: false }
  if (secondary && accountId === secondary) return { host: false, secondary: true }
  return { host: true, secondary: true }
}
