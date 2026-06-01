import { useQuery } from '@tanstack/react-query'
import type { Execution } from '@/types/positions'
import type { BackendOptPair, PerformanceResponse } from '@/types/trading'
import { fetchPerformance } from '@/api/trading'
import { fetchPerformanceExecutionsMerged } from '@/utils/ledger/performanceBulk'
import {
  computeBackendOptPairsFromExecutions,
  computeDayRealizedUnrealized,
  computeDayRealizedUnrealizedStock,
  getChicagoDayRange,
  getTimeRangeDates,
  sortExecByExecutionDateThenTime,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'

export interface OnTheFlyData {
  perf: PerformanceResponse
  executions: Execution[]
  optPairs: BackendOptPair[] | null
  computed: {
    opt: { realized: number; unrealized: number }
    stk: { realized: number; unrealized: number }
  } | null
}

export function usePerformanceOnTheFly(params: {
  enabled: boolean
  timeRange: PerformanceTimeRange
  calendarMonth: string
  strategyOpportunityId: number | null
  strategyInstanceId: number | null
}) {
  const { enabled, timeRange, calendarMonth, strategyOpportunityId, strategyInstanceId } = params

  const { sinceStr, untilStr } = getTimeRangeDates(timeRange, calendarMonth)
  const { since_ts } = getChicagoDayRange(sinceStr)
  const { until_ts } = getChicagoDayRange(untilStr)

  return useQuery<OnTheFlyData>({
    queryKey: [
      'performance',
      'on-the-fly',
      sinceStr,
      untilStr,
      strategyOpportunityId,
      strategyInstanceId,
    ],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const [perf, executions] = await Promise.all([
        fetchPerformance({
          since_ts,
          until_ts,
          granularity: 'day',
          strategy_opportunity_id: strategyOpportunityId ?? undefined,
          strategy_instance_id: strategyInstanceId ?? undefined,
          source_scope: 'on_the_fly',
        }),
        fetchPerformanceExecutionsMerged(
          sinceStr,
          untilStr,
          strategyOpportunityId,
          strategyInstanceId,
          'on_the_fly',
        ),
      ])

      const sorted = [...executions].sort(sortExecByExecutionDateThenTime).reverse()
      const optPairs = computeBackendOptPairsFromExecutions(sorted)
      const optAg = computeDayRealizedUnrealized(sorted, optPairs.length > 0 ? optPairs : null)
      const stkAg = computeDayRealizedUnrealizedStock(sorted)

      return {
        perf,
        executions: sorted,
        optPairs: optPairs.length > 0 ? optPairs : null,
        computed: { opt: optAg, stk: stkAg },
      }
    },
  })
}
