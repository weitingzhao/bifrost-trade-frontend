import { useQuery } from '@tanstack/react-query'
import { fetchPositionCategories } from '@/api/portfolio'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function usePositionCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.portfolio.positionCategories,
    queryFn: fetchPositionCategories,
    staleTime: 30_000,
  })
}
