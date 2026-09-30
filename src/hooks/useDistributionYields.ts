import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchCorporateActions } from '@/api/marketData/corporateActions'
import { ttmDistributionYield } from '@/utils/sharesBook'

/**
 * TTM distribution yield per symbol (Positions › Shares, Rev .115): the
 * dividends the corporate-action store holds for the last year over the mark.
 * Read only for the fixed-income and cash-like names; the same cache entry
 * Trade review's adjustment row reads.
 *
 * `undefined` while a name is read, `null` when it has no distributions on file.
 */
export function useDistributionYields(
  marks: ReadonlyMap<string, number | null>,
  today: string,
): ReadonlyMap<string, number | null | undefined> {
  const symbols = [...marks.keys()].sort()
  const symbolKey = symbols.join(',')
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['market-data', 'corporate-actions', symbol, 400],
      queryFn: () => fetchCorporateActions(symbol, 400),
      staleTime: 60 * 60_000,
    })),
  })
  const stamp = queries.map((q) => q.dataUpdatedAt).join(',')
  return useMemo(() => {
    const out = new Map<string, number | null | undefined>()
    symbols.forEach((symbol, i) => {
      const q = queries[i]
      if (!q?.data) {
        out.set(symbol, q?.isError ? null : undefined)
        return
      }
      const divs = q.data.rows.filter((r) => r.action_type === 'dividend')
      out.set(symbol, ttmDistributionYield(divs, marks.get(symbol) ?? null, today))
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, symbolKey, today, marks])
}
