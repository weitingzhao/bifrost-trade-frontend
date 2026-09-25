/**
 * The trader's three questions — can I trade, can I see, did the data land —
 * read once, for System Status and for the user centre in the sidebar foot
 * (design Rev .54: "三域灯读 System Status 的三个聚合,与该页同源").
 *
 * `live` decides whether "can I see" is judged stream by stream. That takes
 * the quote stream, which a control on every page must not hold open, so the
 * sidebar asks for it only while its popover is open; without it the two other
 * questions are answered exactly as Status answers them.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchSignalHealth } from '@/api/research/similarRegime'
import { useCoverageQuality } from '@/hooks/useMarketDataCoverage'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useQuoteStream } from '@/hooks/useQuoteStream'
import {
  marketStanding,
  nightlyStanding,
  tradingStanding,
  watchlistDataLine,
  type DomainStanding,
} from '@/utils/systemStanding'

export function useSystemDomains({ live }: { live: boolean }): DomainStanding[] {
  const { data: status } = useMonitorStatus()
  const health = useQuery({
    queryKey: ['research', 'signal-health'],
    queryFn: fetchSignalHealth,
    staleTime: 60_000,
  })
  // The plugin's own verdict over the watchlist (Owner 2026-09-25).
  const quality = useCoverageQuality()
  // The streams the monitor says are subscribed — the same list Live asks for.
  const streamKeys = live ? (status?.live_ui?.subscribed_tickers ?? []) : []
  // Off entirely when not live: an empty list is not "no request" — the quote
  // hook then asks the market service for its own focus list, and polls it.
  const { quotesMap } = useQuoteStream(streamKeys, [], { enableSse: live, enableFallbackPoll: live })
  // Read once: the freshness window must not move under the reader mid-render.
  const [nowSec] = useState(() => Date.now() / 1000)

  const trading = tradingStanding(status)
  const nightly = nightlyStanding(health.data, health.isError, watchlistDataLine(quality.data, quality.isError))
  return live ? [trading, marketStanding(status, quotesMap, streamKeys, nowSec), nightly] : [trading, nightly]
}
