/**
 * Option position simulator hooks (research 0.170.0).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSimDetail, postSim, type SimInput } from '@/api/research/backtestSim'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useSimDetail(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: runId
      ? QUERY_KEYS.researchEngine.backtest.simDetail(runId)
      : ['research-engine', 'backtest', 'sim', 'idle'],
    queryFn: () => (runId ? fetchSimDetail(runId) : Promise.reject(new Error('missing run id'))),
    enabled: Boolean(runId) && enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useRunSim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SimInput) => postSim(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.researchEngine.backtest.runs })
    },
  })
}
