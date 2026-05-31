import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchExecutionsRange } from '@/api/trading'
import type { Execution } from '@/types/positions'
import {
  computeOptionLiveAvgPerShareFromExecutions,
  type OptionLiveBasis,
} from '@/utils/optionLiveBasis'
import { optBasisKey, type OptPositionRow } from '@/utils/marketStreamsRows'

export function useOptionLiveBasis(optPositionRows: OptPositionRow[]) {
  const accountIds = useMemo(
    () => [...new Set(optPositionRows.map(r => r.account_id).filter(Boolean))],
    [optPositionRows],
  )

  const queries = useQueries({
    queries: accountIds.map(accountId => ({
      queryKey: ['trading', 'executions', 'live-basis', accountId],
      queryFn: async () => {
        const res = await fetchExecutionsRange({ account_id: accountId, limit: 10000 })
        return res.items
      },
      staleTime: 60_000,
      enabled: Boolean(accountId),
    })),
  })

  const optionAccountExecutions = useMemo(() => {
    const all: Execution[] = []
    for (const q of queries) {
      if (q.data) all.push(...q.data)
    }
    return all
  }, [queries])

  const isLoading = queries.some(q => q.isLoading)

  const optionLiveBasisByRow = useMemo(() => {
    const m = new Map<string, OptionLiveBasis>()
    for (const row of optPositionRows) {
      const k = optBasisKey(row)
      m.set(
        k,
        computeOptionLiveAvgPerShareFromExecutions(
          optionAccountExecutions,
          row.account_id,
          row.contract_key,
          row.qty,
        ),
      )
    }
    return m
  }, [optPositionRows, optionAccountExecutions])

  return { optionLiveBasisByRow, isLoading }
}
