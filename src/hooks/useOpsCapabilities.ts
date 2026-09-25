import { useQuery } from '@tanstack/react-query'
import { fetchOpsCapabilities } from '@/api/ops'
import { QUERY_KEYS } from '@/constants/queryKeys'

/** What the stored Ops token may do — read-only; the token is set per session. */
export function useOpsCapabilities(token: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ops.capabilities, token],
    queryFn: () => fetchOpsCapabilities(),
    staleTime: 30_000,
    retry: 1,
  })
}
