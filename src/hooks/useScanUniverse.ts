import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchScan,
  type FetchScanParams,
  type ScanLensFilters,
  type ScanPreset,
  type ScanRow,
  type ScanSortBy,
} from '@/api/research/scan'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { usePortfolioSymbols } from '@/hooks/usePortfolioSymbols'

export type ScanUniverseFilter = 'watchlist' | 'holdings' | 'both'

function uniqSymbols(list: readonly string[]): string[] {
  return [...new Set(list.map((s) => s.trim().toUpperCase()).filter(Boolean))].sort()
}

export function useScanUniverse(filter: ScanUniverseFilter) {
  const portfolio = usePortfolioSymbols()

  const symbols = useMemo(() => {
    if (filter === 'watchlist') return uniqSymbols(portfolio.watchlistSymbols)
    if (filter === 'holdings') return uniqSymbols(portfolio.holdingsSymbols)
    return uniqSymbols([...portfolio.watchlistSymbols, ...portfolio.holdingsSymbols])
  }, [filter, portfolio.watchlistSymbols, portfolio.holdingsSymbols])

  return {
    symbols,
    watchlistSymbols: portfolio.watchlistSymbols,
    holdingsSymbols: portfolio.holdingsSymbols,
    holdingsSet: portfolio.holdingsSet,
    watchlistSet: portfolio.watchlistSet,
    isLoadingSources: portfolio.isLoading,
    isErrorSources: portfolio.isError,
  }
}

export function useScanData(opts: {
  filter: ScanUniverseFilter
  sortBy: ScanSortBy
  sortDir?: 'asc' | 'desc'
  flagFilter?: string
  lensFilters?: ScanLensFilters
  preset?: ScanPreset
  minComposite?: number
  symbolSearch?: string
}) {
  const universe = useScanUniverse(opts.filter)
  const symbolKey = universe.symbols.join(',')
  const lensKey = JSON.stringify(opts.lensFilters ?? {})

  const query = useQuery({
    queryKey: [
      ...QUERY_KEYS.research.scan,
      opts.filter,
      symbolKey,
      opts.sortBy,
      opts.sortDir ?? 'desc',
      opts.flagFilter ?? '',
      lensKey,
      opts.preset ?? 'neutral',
      opts.minComposite ?? '',
    ],
    queryFn: async () => {
      const params: FetchScanParams = {
        symbols: universe.symbols.length ? universe.symbols : undefined,
        sortBy: opts.sortBy,
        sortDir: opts.sortDir ?? 'desc',
        flagFilter: opts.flagFilter || undefined,
        lensFilters: opts.lensFilters,
        preset: opts.preset ?? 'neutral',
        minComposite: opts.minComposite,
        limit: 200,
      }
      return fetchScan(params)
    },
    enabled: !universe.isLoadingSources && universe.symbols.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const rows = useMemo(() => {
    const raw = query.data?.rows ?? []
    const q = (opts.symbolSearch || '').trim().toUpperCase()
    if (!q) return raw
    return raw.filter((r) => r.symbol.includes(q))
  }, [query.data?.rows, opts.symbolSearch])

  const flagCounts = useMemo(() => {
    let hot = 0
    let cold = 0
    for (const row of rows) {
      const flags = Object.values(row.lens_flags || {})
      if (flags.includes('hot')) hot += 1
      if (flags.includes('cold')) cold += 1
    }
    return { hot, cold, total: rows.length }
  }, [rows])

  return {
    ...query,
    rows: rows as ScanRow[],
    asOf: query.data?.as_of ?? null,
    universeSize: query.data?.universe_size ?? 0,
    preset: query.data?.preset ?? opts.preset ?? 'neutral',
    weights: query.data?.weights ?? null,
    flagCounts,
    ...universe,
    isLoading: universe.isLoadingSources || query.isLoading,
  }
}
