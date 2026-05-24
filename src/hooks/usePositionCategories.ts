import { useQuery } from '@tanstack/react-query'
import { fetchPositionCategories } from '@/api/portfolio'

export function usePositionCategories() {
  return useQuery({
    queryKey: ['portfolio', 'position-categories'],
    queryFn: fetchPositionCategories,
    staleTime: 30_000,
  })
}
