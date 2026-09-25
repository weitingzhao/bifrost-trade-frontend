/**
 * The accounts a plan can be written against, from monitor `/status`.
 *
 * Plans are typed by hand and from Symbol, so both need the same list and the
 * same default. The default is the shell's account scope when it names one
 * (Rev .58: plans go into one account, and the top bar is where you said
 * which); under All it is the host account, the one the desk trades from. No
 * account is invented when `/status` is silent — the caller shows the field
 * empty and the server refuses a plan without one.
 */
import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { scopeAccountId, useAccountScope } from '@/lib/accountScope'

export function usePlanAccounts(): { accounts: string[]; defaultAccount: string } {
  const { data } = useMonitorStatus()
  const scope = useAccountScope()
  return useMemo(() => {
    const host = data?.config?.ib_client?.account?.event_host ?? ''
    const secondary = data?.config?.ib_client?.account?.event_secondary ?? ''
    const ids = (data?.portfolio.accounts ?? [])
      .map((a) => a.account_id ?? '')
      .filter((id) => id.length > 0)
    const accounts = [...new Set(host ? [host, ...ids] : ids)]
    const scoped = scopeAccountId(scope, host, secondary)
    return { accounts, defaultAccount: scoped && accounts.includes(scoped) ? scoped : (accounts[0] ?? '') }
  }, [data, scope])
}
