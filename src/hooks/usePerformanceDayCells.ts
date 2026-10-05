/**
 * The Performance calendar's cells — one map per asset tab, day → R / U / flow —
 * through the bulk load (`usePerformanceBulk`), falling back to the summary
 * endpoint's per-sec-type calendar while the bulk is absent, exactly as the
 * Performance page has always drawn them.
 *
 * Read by Performance and by the Calendar's P&L layer: one path, so the number
 * on a Calendar day is the number Performance prints for it (§14.2).
 */
import { useMemo } from 'react'
import type { PerformanceResponse } from '@/types/trading'
import { buildDayMapFromApi, buildDayMapFromBulk } from '@/utils/ledger/performanceDayCells'
import { usePerformanceBulk } from './usePerformanceBulk'

export function usePerformanceDayCells(
  params: Parameters<typeof usePerformanceBulk>[0],
  /** The summary endpoint's response, for the fallback; omit to read the bulk alone. */
  fallback?: PerformanceResponse,
) {
  const query = usePerformanceBulk(params)
  const bulk = query.data
  const dayMapByTab = useMemo(() => {
    if (bulk?.calendarDayPnLByAsset && bulk.calendarStkNotionalByBucket) {
      return buildDayMapFromBulk(bulk.calendarDayPnLByAsset, bulk.calendarStkNotionalByBucket)
    }
    return buildDayMapFromApi(fallback)
  }, [bulk, fallback])
  return { query, dayMapByTab }
}
