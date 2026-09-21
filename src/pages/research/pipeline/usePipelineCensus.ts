/**
 * Everything the Pipeline layer reading needs, in one hook.
 *
 * A hook rather than state inside the panel, because two readers want the
 * same numbers: the census itself, and the page header's Ask Copilot
 * snapshot — Design's ruling keeps that button but swaps what it carries to
 * the census figures. Computing them twice is how two places start
 * disagreeing about the same page.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchBacktestRuns } from '@/api/research/backtestEvent'
import { fetchSepaDaily, fetchOrderSentiment } from '@/api/researchEngine'
import { fetchScan } from '@/api/research/scan'
import { useHypothesisList } from '@/hooks/useHypotheses'
import {
  censusRows,
  censusTotals,
  oldestUntouched,
  stationReadings,
  type StoreReading,
} from './pipelineModel'

export function usePipelineCensus() {
  const sepaQ = useQuery({
    queryKey: ['research', 'pipeline', 'sepa'],
    queryFn: () => fetchSepaDaily({ limit: 500 }),
    staleTime: 5 * 60_000,
  })
  const scanQ = useQuery({
    queryKey: ['research', 'pipeline', 'scan'],
    queryFn: () => fetchScan({ limit: 500 }),
    staleTime: 5 * 60_000,
  })
  const sentimentQ = useQuery({
    queryKey: ['research', 'pipeline', 'sentiment'],
    queryFn: () => fetchOrderSentiment(),
    staleTime: 5 * 60_000,
  })
  const runsQ = useQuery({
    queryKey: ['research', 'pipeline', 'backtests'],
    queryFn: () => fetchBacktestRuns({ limit: 200 }),
    staleTime: 5 * 60_000,
  })
  const hypQ = useHypothesisList({ include_retired: true, limit: 200 })

  const error = sepaQ.error ?? scanQ.error ?? sentimentQ.error ?? runsQ.error ?? hypQ.error ?? null
  const loading =
    sepaQ.isLoading || scanQ.isLoading || sentimentQ.isLoading || runsQ.isLoading || hypQ.isLoading

  /** What each station's engine wrote, keyed by the page that reads it. */
  const readings = useMemo(() => {
    const m = new Map<string, StoreReading>()
    if (sepaQ.data) {
      m.set('/research/ratings/stocks', {
        made: sepaQ.data.rows.length,
        newest: sepaQ.data.trade_date ?? null,
      })
    }
    if (scanQ.data) {
      m.set('/research/scan', { made: scanQ.data.rows.length, newest: null })
    }
    if (sentimentQ.data) {
      const stamps = sentimentQ.data.rows
        .map((r) => (r as { computed_at?: string }).computed_at ?? '')
        .filter(Boolean)
        .sort()
      m.set('/research/narrative', {
        made: sentimentQ.data.rows.length,
        newest: stamps.length > 0 ? stamps[stamps.length - 1] : null,
      })
    }
    if (runsQ.data) {
      const stamps = runsQ.data.rows.map((r) => r.created_at ?? '').filter(Boolean).sort()
      m.set('/research/backtest', {
        made: runsQ.data.rows.length,
        newest: stamps.length > 0 ? stamps[stamps.length - 1] : null,
      })
    }
    return m
  }, [sepaQ.data, scanQ.data, sentimentQ.data, runsQ.data])

  /**
   * Products that left, by the page they name as their origin.
   *
   * Zero on every station row today, and the footnote says why: the buttons
   * that write these stamp the page the list is rendered on, not the station
   * that produced the hit.
   */
  const movedOn = useMemo(() => {
    const m = new Map<string, number>()
    for (const h of hypQ.data?.rows ?? []) {
      const page = h.origin_page
      if (!page) continue
      const route = page.startsWith('/') ? page : null
      if (route == null) continue
      m.set(route, (m.get(route) ?? 0) + 1)
    }
    return m
  }, [hypQ.data])

  const rows = useMemo(() => censusRows(readings, movedOn), [readings, movedOn])
  const stations = useMemo(() => stationReadings(rows), [rows])
  const totals = useMemo(() => censusTotals(rows), [rows])
  const oldest = useMemo(() => oldestUntouched(rows), [rows])

  const worst = stations.reduce<(typeof stations)[number] | null>(
    (w, s) => (s.stuck != null && (w == null || s.stuck > (w.stuck ?? -1)) ? s : w),
    null,
  )

  return { rows, stations, totals, oldest, worst, loading, error, hypothesisCount: hypQ.data?.rows.length ?? 0 }
}
