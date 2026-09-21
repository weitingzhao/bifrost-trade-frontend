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
import { useResearchHomeData } from '@/hooks/useResearchHomeData'
import { useUniverseReach } from '@/hooks/useUniverseReach'
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
  /**
   * The four discovery lanes and the universe funnel, which used to be blocks
   * of their own on this page. Design folds them in (Rev 2026-09-21.5): a
   * lane is the *product of the page that wrote it*, so it belongs in that
   * row rather than in a list of its own, and the funnel belongs to Discover
   * rather than to the page.
   */
  const home = useResearchHomeData()
  const reachQ = useUniverseReach()

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
   * Route-shaped stamps only, which is the contract as of 2026-09-21: the
   * discovery lanes now write the station's route, and a stamp that is still
   * a token names either a container page (the old defect) or the loop's or
   * Copilot's own path, neither of which is a station on this bench.
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

  /**
   * What each row wrote, for its expand area — the design's "a row opens into
   * what it wrote". Keyed by route so a row and its contents cannot drift.
   */
  const hits = useMemo(() => {
    const m = new Map<string, { label: string; line: string }[]>()
    m.set(
      '/research/ratings/stocks',
      home.sepaHits.map((h) => ({
        label: h.symbol,
        line: `${h.path} · grade ${h.grade} · ${h.stage} · ${h.score.toFixed(1)}`,
      })),
    )
    m.set(
      '/research/scan',
      home.ivExtremes.map((h) => ({
        label: h.symbol,
        line: `${h.bucket} · IV rank ${h.iv_rank_1y ?? '—'} · ${h.trade_date ?? '—'}`,
      })),
    )
    m.set(
      '/research/narrative',
      home.sentimentAnomalies.map((h) => ({
        label: h.symbol,
        line: `${h.sentiment_score.toFixed(1)} · PCR vol ${h.pcr_volume.toFixed(2)} · concentration ${Math.round(h.strike_concentration * 100)}%`,
      })),
    )
    m.set(
      '/research/event-radar',
      home.eventHits.map((h) => ({
        label: h.affected_symbols[0] ?? h.subject.slice(0, 12),
        line: h.summary.slice(0, 120),
      })),
    )
    m.set(
      '/research/backtest',
      (runsQ.data?.rows ?? []).slice(0, 6).map((r) => ({
        label: r.id.slice(0, 10),
        line: `${r.strategy_template} · ${r.event_def?.kind ?? '—'} · ${(r.created_at ?? '').slice(0, 10)}`,
      })),
    )
    return m
  }, [home.sepaHits, home.ivExtremes, home.sentimentAnomalies, home.eventHits, runsQ.data])

  /**
   * The design's **Left the pipeline**: what came out of the stations, by the
   * page each names as its origin. It is also the numerator of `moved on`.
   */
  const left = useMemo(
    () =>
      (hypQ.data?.rows ?? [])
        .slice()
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
        .slice(0, 12)
        .map((h) => ({
          kind: 'hypothesis' as const,
          id: h.id,
          origin: h.origin_page ?? 'unrecorded',
          title: h.title,
          at: (h.created_at ?? '').slice(0, 10),
        })),
    [hypQ.data],
  )

  /** The widest layer the universe funnel measured, for Discover's heading. */
  const universeScanned = useMemo(() => {
    const measured = (reachQ.data?.layers ?? []).filter((l) => l.symbols != null)
    return measured.length > 0 ? Math.max(...measured.map((l) => l.symbols as number)) : null
  }, [reachQ.data])
  const stations = useMemo(() => stationReadings(rows), [rows])
  const totals = useMemo(() => censusTotals(rows), [rows])
  const oldest = useMemo(() => oldestUntouched(rows), [rows])

  const worst = stations.reduce<(typeof stations)[number] | null>(
    (w, s) => (s.stuck != null && (w == null || s.stuck > (w.stuck ?? -1)) ? s : w),
    null,
  )

  return {
    rows,
    stations,
    totals,
    oldest,
    worst,
    hits,
    left,
    universeScanned,
    loading,
    error,
    hypothesisCount: hypQ.data?.rows.length ?? 0,
  }
}
