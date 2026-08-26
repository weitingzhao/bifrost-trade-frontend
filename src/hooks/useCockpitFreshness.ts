/**
 * Cockpit freshness lamps — Hypothesis / Backtest / Discovery (Wave RS-E1.4).
 * Polls ~60s via TanStack Query refetchInterval.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchActiveSummary } from '@/api/researchHypothesis'
import { fetchBacktestRuns } from '@/api/research/backtestEvent'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { LampColor } from '@/lib/researchFreshness'

const POLL_MS = 60_000

function ageLamp(iso: string | null | undefined, hasError: boolean, hasData: boolean): LampColor {
  if (hasError) return 'red'
  if (!hasData || !iso) return 'gray'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'yellow'
  const ageH = (Date.now() - t) / (60 * 60 * 1000)
  if (ageH <= 24) return 'green'
  if (ageH <= 72) return 'yellow'
  return 'red'
}

export function useCockpitFreshness() {
  const hypQ = useQuery({
    queryKey: [...QUERY_KEYS.research.hypothesis.summaryActive, 1, 'cockpit-freshness'],
    queryFn: () => fetchActiveSummary(1),
    staleTime: 15_000,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
  })
  const btQ = useQuery({
    queryKey: [...QUERY_KEYS.research.backtest.runs, { limit: 1 }, 'cockpit-freshness'],
    queryFn: () => fetchBacktestRuns({ limit: 1 }),
    staleTime: 15_000,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: false,
  })
  const home = useResearchHomeData()

  const lastHyp = hypQ.data?.recent_active?.[0]
  const lastHypTs = lastHyp?.updated_at ?? lastHyp?.created_at ?? null
  const lastBt = btQ.data?.rows?.[0]
  const lastBtTs = lastBt?.created_at ?? null

  const discoveryTs =
    home.sepaTradeDate != null
      ? `${home.sepaTradeDate}T16:00:00Z`
      : home.totalDiscoveries > 0
        ? new Date().toISOString()
        : null

  return {
    hypothesis: {
      lamp: ageLamp(lastHypTs, hypQ.isError, Boolean(lastHyp)),
      ts: lastHypTs,
      label: lastHyp?.title ?? null,
      isLoading: hypQ.isLoading,
    },
    backtest: {
      lamp: ageLamp(lastBtTs, btQ.isError, Boolean(lastBt)),
      ts: lastBtTs,
      label: lastBt?.id ?? null,
      isLoading: btQ.isLoading,
    },
    discovery: {
      lamp: ageLamp(discoveryTs, home.isError, home.totalDiscoveries > 0),
      ts: discoveryTs,
      label: home.totalDiscoveries > 0 ? `${home.totalDiscoveries} hits` : null,
      isLoading: home.isLoading,
    },
  }
}
