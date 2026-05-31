import { useQuery } from '@tanstack/react-query'
import { fetchModelAnalysis } from '@/api/portfolio'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { resolveModelAnalysisAccounts } from '@/utils/modelAnalysisAccounts'

export function useModelAnalysisAccounts() {
  const { data: status } = useMonitorStatus()
  return resolveModelAnalysisAccounts(status)
}

export function useModelAnalysis(accountId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, accountId],
    queryFn: () => fetchModelAnalysis(accountId),
    enabled: Boolean(accountId),
  })
}
