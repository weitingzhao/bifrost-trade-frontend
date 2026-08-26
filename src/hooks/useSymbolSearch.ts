import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchTickerSearch } from '@/api/marketData'

const DEBOUNCE_MS = 250
const STALE_TIME_MS = 5 * 60 * 1000

export function useSymbolSearch(query: string, enabled = true) {
  const [debounced, setDebounced] = useState(query.trim())

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  return useQuery({
    queryKey: ['ticker-search', debounced],
    queryFn: () => fetchTickerSearch(debounced, 20),
    enabled: enabled && debounced.length >= 1,
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  })
}
