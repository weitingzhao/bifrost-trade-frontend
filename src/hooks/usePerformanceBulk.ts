import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { PerformanceDayPnLBulkResult } from '@/types/trading'
import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'
import { getTimeRangeDates } from '@/utils/ledger/performanceUtils'
import { loadPerformanceDayPnLBulk } from '@/utils/ledger/performanceBulk'
import {
  buildPositionCategoryByAccountContract,
  serializePositionCategoryKey,
} from '@/utils/ledger/stkBuckets'
import { useMonitorStatus } from './useMonitorStatus'

const OPT_PAIR_LOOK_BACK_DAYS = 180

export function usePerformanceBulk(params: {
  timeRange: PerformanceTimeRange
  calendarMonth: string
  strategyOpportunityId: number | null
  strategyInstanceId: number | null
}) {
  const { timeRange, calendarMonth, strategyOpportunityId, strategyInstanceId } = params

  const { data: status } = useMonitorStatus()

  const positionCategoryKey = useMemo(
    () => serializePositionCategoryKey(status),
    [status],
  )

  const positionCategoryByAccountContract = useMemo(
    () => buildPositionCategoryByAccountContract(status),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionCategoryKey],
  )

  const { sinceStr, untilStr } = useMemo(
    () => getTimeRangeDates(timeRange, calendarMonth),
    [timeRange, calendarMonth],
  )

  return useQuery<PerformanceDayPnLBulkResult>({
    queryKey: [
      'performance',
      'bulk',
      sinceStr,
      untilStr,
      calendarMonth,
      strategyOpportunityId,
      strategyInstanceId,
      positionCategoryKey,
    ],
    queryFn: () =>
      loadPerformanceDayPnLBulk({
        sinceStr,
        untilStr,
        calendarMonth,
        strategyOpportunityId,
        strategyInstanceId,
        lookBackDays: OPT_PAIR_LOOK_BACK_DAYS,
        positionCategoryByAccountContract,
      }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
