import { useQuery } from '@tanstack/react-query'
import { fetchSavedSearches } from '@/api/savedSearches'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** Every saved search (Rev .139) — the sidebar and the page read one list. */
export function useSavedSearches() {
  return useQuery({
    queryKey: QUERY_KEYS.savedSearches,
    queryFn: fetchSavedSearches,
    staleTime: 60_000,
  })
}
