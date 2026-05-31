import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSymbolsReadinessSnapshot } from '@/api/research/dataReadiness'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ReadinessSnapshotRow, SortColumn, SortDirection } from '@/types/stockScreener'
import { computeReadinessSummary, parseSymbols, sortReadinessRows } from '@/utils/stockScreener'

export function useSymbolsReadinessSnapshot(symbolText: string) {
  const symbols = useMemo(() => parseSymbols(symbolText), [symbolText])
  const symbolsKey = symbols.join(',')

  const [debouncedKey, setDebouncedKey] = useState(symbolsKey)

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedKey(symbolsKey), 200)
    return () => window.clearTimeout(handle)
  }, [symbolsKey])

  const query = useQuery({
    queryKey: QUERY_KEYS.research.stockScreener.readinessSnapshot(debouncedKey),
    queryFn: async () => {
      const syms = debouncedKey ? debouncedKey.split(',').filter(Boolean) : []
      const res = await fetchSymbolsReadinessSnapshot(syms)
      if (!res.ok) throw new Error(res.error ?? 'Failed to load readiness snapshot')
      return res
    },
    enabled: debouncedKey.length > 0,
    staleTime: 30_000,
  })

  const rows = useMemo(() => query.data?.symbols ?? [], [query.data?.symbols])
  const asOf = query.data?.as_of_date ?? null
  const summary = useMemo(() => computeReadinessSummary(rows), [rows])

  return {
    symbols,
    rows,
    asOf,
    summary,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useReadinessSort(rows: ReadinessSnapshotRow[]) {
  const [sortCol, setSortCol] = useState<SortColumn>(null)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const toggleSort = (col: 'tech' | 'fund') => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
        return col
      }
      setSortDir('desc')
      return col
    })
  }

  const sortedRows = useMemo(
    () => sortReadinessRows(rows, sortCol, sortDir),
    [rows, sortCol, sortDir],
  )

  return { sortCol, sortDir, toggleSort, sortedRows }
}
