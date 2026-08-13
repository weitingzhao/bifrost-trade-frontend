import { useMemo } from 'react'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import type { IbAccountSnapshot } from '@/types/monitor'

/** Underlying symbols from live IB holdings (STK + OPT underlyings). */
export function extractHoldingUnderlyingSymbols(accounts: IbAccountSnapshot[]): string[] {
  const set = new Set<string>()
  for (const acc of accounts) {
    for (const pos of acc.positions ?? []) {
      const st = (pos.secType ?? '').trim().toUpperCase()
      const sym = (pos.symbol ?? '').trim().toUpperCase()
      if (!sym) continue
      if (st === 'STK' || st === 'OPT') set.add(sym)
    }
  }
  return [...set].sort()
}

/** Holdings underlyings from monitor portfolio snapshot. */
export function useHoldingSymbols() {
  const { data, isLoading, isError } = useMonitorStatus()
  const symbols = useMemo(
    () => extractHoldingUnderlyingSymbols(data?.portfolio?.accounts ?? []),
    [data?.portfolio?.accounts],
  )
  return { symbols, isLoading, isError }
}
