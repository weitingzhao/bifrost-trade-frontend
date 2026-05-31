import type { StatusResponse } from '@/types/monitor'

export type LedgerAccountTab = { id: string; label: string }

/** All + Host/Secondary from monitor config (Event Account), not every account in data. */
export function getLedgerAccountTabs(
  status: StatusResponse | null | undefined,
): LedgerAccountTab[] {
  const tabs: LedgerAccountTab[] = []
  const host = status?.config?.ib_client?.account?.event_host?.trim()
  const secondary = status?.config?.ib_client?.account?.event_secondary?.trim()
  if (host) tabs.push({ id: host, label: 'Host' })
  if (secondary && secondary !== host) tabs.push({ id: secondary, label: 'Secondary' })
  return tabs
}

export function getLedgerAccountIds(status: StatusResponse | null | undefined): string[] {
  return getLedgerAccountTabs(status).map(t => t.id)
}
