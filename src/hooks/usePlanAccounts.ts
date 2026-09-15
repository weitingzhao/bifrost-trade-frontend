/**
 * The accounts a plan can be written against, from monitor `/status`.
 *
 * Plans are typed by hand and from Symbol, so both need the same list and the
 * same default; the host account is the default because it is the one the desk
 * trades from. No account is invented when `/status` is silent — the caller
 * shows the field empty and the server refuses a plan without one.
 */
import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'

export function usePlanAccounts(): { accounts: string[]; defaultAccount: string } {
  const { data } = useMonitorStatus()
  return useMemo(() => {
    const host = data?.config?.ib_client?.account?.event_host ?? ''
    const ids = (data?.portfolio.accounts ?? [])
      .map((a) => a.account_id ?? '')
      .filter((id) => id.length > 0)
    const accounts = [...new Set(host ? [host, ...ids] : ids)]
    return { accounts, defaultAccount: accounts[0] ?? '' }
  }, [data])
}
