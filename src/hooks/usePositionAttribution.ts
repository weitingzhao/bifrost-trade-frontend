import { useQuery } from '@tanstack/react-query'
import { fetchPositionAttribution } from '@/api/trading'

export function usePositionAttribution() {
  return useQuery({
    queryKey: ['trading', 'position-attribution'],
    queryFn: () => fetchPositionAttribution(),
    staleTime: 30_000,
  })
}
