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
import type { DiscoveryTarget } from '@/components/research/DiscoveryCapture'
import { LANE_ORIGIN } from '@/components/research/discoveryLanes'
import { useQuery } from '@tanstack/react-query'
import { fetchBacktestRuns } from '@/api/research/backtestEvent'
import { fetchSepaDaily, fetchOrderSentiment } from '@/api/researchEngine'
import { fetchScan } from '@/api/research/scan'
import { useHypothesisList } from '@/hooks/useHypotheses'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'
import { useUniverseReach } from '@/hooks/useUniverseReach'
import {
  NOT_A_STATION,
  censusRowFor,
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
   * Products that left, by the station they name as their origin.
   *
   * Both vocabularies, through one table: the Save buttons stamp tokens and
   * the shell's ambient Copilot context stamps addresses, and `censusRowFor`
   * is where the two meet the census's rows. A stamp it cannot place counts
   * nowhere rather than counting somewhere plausible.
   */
  const movedOn = useMemo(() => {
    const m = new Map<string, number>()
    for (const h of hypQ.data?.rows ?? []) {
      const row = censusRowFor(h.origin_page)
      if (row == null) continue
      m.set(row, (m.get(row) ?? 0) + 1)
    }
    return m
  }, [hypQ.data])

  const rows = useMemo(() => censusRows(readings, movedOn), [readings, movedOn])

  /**
   * What each row wrote, for its expand area — the design's "a row opens into
   * what it wrote". Keyed by route so a row and its contents cannot drift.
   *
   * A hit carries the lane it came from as well as its line, because the row
   * that opens into what a page made is also where you capture it: pin, pool,
   * hypothesis. The target is the hit as its engine published it, so the
   * verbs here pre-fill exactly what the lane list's did. A backtest run has
   * no lane and no verbs — it is already an artifact.
   *
   * The four lanes are keyed by `LANE_ORIGIN` rather than by a route written
   * out again here: the row a hit is shown under and the origin its buttons
   * stamp then come from one constant, so they cannot drift into saying a
   * hypothesis came from a station other than the row it was captured on.
   */
  const hits = useMemo(() => {
    const m = new Map<string, { label: string; line: string; target?: DiscoveryTarget }[]>()
    m.set(
      LANE_ORIGIN.sepa,
      home.sepaHits.map((h) => ({
        label: h.symbol,
        line: `${h.path} · grade ${h.grade} · ${h.stage} · ${h.score.toFixed(1)}`,
        target: { lane: 'sepa', hit: h } as const,
      })),
    )
    m.set(
      LANE_ORIGIN.iv,
      home.ivExtremes.map((h) => ({
        label: h.symbol,
        line: `${h.bucket} · IV rank ${h.iv_rank_1y ?? '—'} · ${h.trade_date ?? '—'}`,
        target: { lane: 'iv', hit: h } as const,
      })),
    )
    m.set(
      LANE_ORIGIN.sentiment,
      home.sentimentAnomalies.map((h) => ({
        label: h.symbol,
        line: `${h.sentiment_score.toFixed(1)} · PCR vol ${h.pcr_volume.toFixed(2)} · concentration ${Math.round(h.strike_concentration * 100)}%`,
        target: { lane: 'sentiment', hit: h } as const,
      })),
    )
    m.set(
      LANE_ORIGIN.event,
      home.eventHits.map((h) => ({
        label: h.affected_symbols[0] ?? h.subject.slice(0, 12),
        line: h.summary.slice(0, 120),
        target: { lane: 'event', hit: h } as const,
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
  const left = useMemo(() => {
    const labelOf = new Map(rows.map((r) => [r.to, r.label]))
    return (hypQ.data?.rows ?? [])
      .slice()
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 12)
      .map((h) => {
        const to = censusRowFor(h.origin_page)
        return {
          kind: 'hypothesis' as const,
          id: h.id,
          /** What the row actually carries, kept for the ones that name no station. */
          stamp: h.origin_page ?? 'unrecorded',
          station: to ? (labelOf.get(to) ?? to) : null,
          to,
          /** Why a stamp is not a gap, when the table knows. */
          why: h.origin_page ? (NOT_A_STATION[h.origin_page] ?? null) : null,
          title: h.title,
          at: (h.created_at ?? '').slice(0, 10),
        }
      })
  }, [hypQ.data, rows])

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
