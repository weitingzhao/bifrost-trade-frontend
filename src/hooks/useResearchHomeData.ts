/**
 * Research Home aggregator (Wave RS-A4).
 *
 * Pulls today's snapshot from the four Discovery-tier sources so the
 * ResearchHomePage can render a "Today's Discoveries" strip alongside
 * active Hypotheses without touching each engine's page.
 *
 * Empty/degraded sources return empty arrays instead of surfacing errors —
 * the Home page renders graceful EmptyState per column.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchEventRadarEvents,
  fetchOrderSentiment,
  fetchSepaCandidates,
  type EventRadarRow,
  type OrderSentiment,
  type SepaScoreRow,
} from '@/api/researchEngine'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useIvRadarData } from '@/hooks/useIvRadarData'
import type { IvRadarRow } from '@/types/ivRadar'
import { ivRankDistanceFrom50 } from '@/utils/ivRadar/universe'

export interface SepaDiscoveryHit {
  symbol: string
  trade_date: string
  path: SepaScoreRow['path']
  stage: SepaScoreRow['stage']
  grade: SepaScoreRow['grade']
  score: number
}

export interface EventDiscoveryHit {
  event_id: string
  batch_id: string
  subject: string
  summary: string
  affected_symbols: string[]
  importance: number
  direction: number
  theme: string
  collected_at: string | null
}

export interface IvExtremeHit {
  symbol: string
  trade_date: string | null
  iv_rank_1y: number | null
  iv_current: number | null
  bucket: IvRadarRow['bucket']
}

export interface SentimentAnomalyHit {
  symbol: string
  trade_date: string
  sentiment_score: number
  pcr_volume: number
  strike_concentration: number
  data_source: string
}

export interface ResearchHomeData {
  sepaHits: SepaDiscoveryHit[]
  eventHits: EventDiscoveryHit[]
  ivExtremes: IvExtremeHit[]
  sentimentAnomalies: SentimentAnomalyHit[]
  sepaTradeDate: string | null
  totalDiscoveries: number
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

const HOME_STALE_MS = 60_000

function toEventHit(row: EventRadarRow): EventDiscoveryHit {
  const symbols = (row.affected_symbols ?? '')
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  return {
    event_id: row.event_id,
    batch_id: row.batch_id,
    subject: row.subject ?? '',
    summary: row.event_summary ?? '',
    affected_symbols: symbols,
    importance: row.importance ?? 0,
    direction: row.direction ?? 0,
    theme: row.theme ?? '',
    collected_at: row.collected_at ?? null,
  }
}

function toSepaHit(row: SepaScoreRow): SepaDiscoveryHit {
  return {
    symbol: row.symbol,
    trade_date: row.trade_date,
    path: row.path,
    stage: row.stage,
    grade: row.grade,
    score: row.sepa_score,
  }
}

function toSentimentHit(row: OrderSentiment): SentimentAnomalyHit {
  return {
    symbol: row.symbol,
    trade_date: row.trade_date,
    sentiment_score: row.sentiment_score ?? 0,
    pcr_volume: row.pcr_volume ?? 0,
    strike_concentration: row.strike_concentration ?? 0,
    data_source: row.data_source ?? '',
  }
}

function pickIvExtremes(rows: IvRadarRow[], limit = 3): IvExtremeHit[] {
  const scored = rows
    .filter((r) => r.data && r.data.iv_rank_1y != null)
    .map((r) => ({
      row: r,
      distance: ivRankDistanceFrom50(r.data?.iv_rank_1y),
    }))
    .filter((s) => s.distance >= 0)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, limit)
  return scored.map((s) => ({
    symbol: s.row.symbol,
    trade_date: s.row.data?.trade_date ?? null,
    iv_rank_1y: s.row.data?.iv_rank_1y ?? null,
    iv_current: s.row.data?.iv_current ?? null,
    bucket: s.row.bucket,
  }))
}

function pickSentimentAnomalies(rows: OrderSentiment[], limit = 3): SentimentAnomalyHit[] {
  return [...rows]
    .filter((r) => Number.isFinite(r.sentiment_score))
    .sort((a, b) => Math.abs(b.sentiment_score) - Math.abs(a.sentiment_score))
    .slice(0, limit)
    .map(toSentimentHit)
}

export function useResearchHomeData(): ResearchHomeData {
  const sepaQ = useQuery({
    queryKey: [...QUERY_KEYS.research.home, 'sepa-candidates'],
    queryFn: () => fetchSepaCandidates({ top: 10 }),
    staleTime: HOME_STALE_MS,
    refetchOnWindowFocus: false,
  })

  const eventsQ = useQuery({
    queryKey: [...QUERY_KEYS.research.home, 'events'],
    queryFn: () => fetchEventRadarEvents({ limit: 12 }),
    staleTime: HOME_STALE_MS,
    refetchOnWindowFocus: false,
  })

  const sentimentQ = useQuery({
    queryKey: [...QUERY_KEYS.research.home, 'sentiment'],
    queryFn: () => fetchOrderSentiment(),
    staleTime: HOME_STALE_MS,
    refetchOnWindowFocus: false,
  })

  const iv = useIvRadarData('all')

  const sepaHits = useMemo<SepaDiscoveryHit[]>(() => {
    const rows = sepaQ.data?.candidates ?? []
    return rows.slice(0, 3).map(toSepaHit)
  }, [sepaQ.data?.candidates])

  const eventHits = useMemo<EventDiscoveryHit[]>(() => {
    const rows = eventsQ.data?.rows ?? []
    return [...rows]
      .filter((r) => !r.dropped)
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
      .slice(0, 3)
      .map(toEventHit)
  }, [eventsQ.data?.rows])

  const ivExtremes = useMemo<IvExtremeHit[]>(
    () => pickIvExtremes(iv.rows, 3),
    [iv.rows],
  )

  const sentimentAnomalies = useMemo<SentimentAnomalyHit[]>(() => {
    const rows = sentimentQ.data?.rows ?? []
    return pickSentimentAnomalies(rows, 3)
  }, [sentimentQ.data?.rows])

  const totalDiscoveries =
    sepaHits.length + eventHits.length + ivExtremes.length + sentimentAnomalies.length

  const isLoading =
    sepaQ.isLoading || eventsQ.isLoading || sentimentQ.isLoading || iv.isLoading

  const isError =
    sepaQ.isError && eventsQ.isError && sentimentQ.isError && iv.isError

  return {
    sepaHits,
    eventHits,
    ivExtremes,
    sentimentAnomalies,
    sepaTradeDate: sepaQ.data?.trade_date ?? null,
    totalDiscoveries,
    isLoading,
    isError,
    refetch: () => {
      void sepaQ.refetch()
      void eventsQ.refetch()
      void sentimentQ.refetch()
      void iv.refetch()
    },
  }
}
