/**
 * Event-driven backtest hooks (Wave RS-C4).
 *
 * TanStack Query wrappers for the `/research/backtest/*` endpoints.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchBacktestRun,
  fetchBacktestRuns,
  postEventQuery,
  type EventQueryInput,
  type ListBacktestRunsQuery,
} from '@/api/research/backtestEvent'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function useBacktestRuns(opts: ListBacktestRunsQuery = {}, enabled = true) {
  const key = opts.hypothesis_id
    ? [...QUERY_KEYS.research.backtest.runsByHypothesis(opts.hypothesis_id), opts]
    : [...QUERY_KEYS.research.backtest.runs, opts]
  return useQuery({
    queryKey: key,
    queryFn: () => fetchBacktestRuns(opts),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useBacktestRun(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: runId
      ? QUERY_KEYS.research.backtest.run(runId)
      : ['research', 'backtest', 'run', 'idle'],
    queryFn: () =>
      runId
        ? fetchBacktestRun(runId)
        : Promise.reject(new Error('missing run id')),
    enabled: Boolean(runId) && enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useRunEventQuery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: EventQueryInput) => postEventQuery(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.research.backtest.runs })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.research.home })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.list })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.research.hypothesis.summaryActive })
    },
  })
}
