import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import { SettlementBadges } from '@/components/data-display/SettlementBadges'
import { EmptyHint } from '@/components/research/EmptyHint'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { VerdictStrip } from '@/components/research/VerdictStrip'
import { settlementFineGrain } from '@/lib/researchSettlement'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Button } from '@/components/ui/button'
import {
  fetchEventRadarEvents,
  fetchForecastSessions,
  fetchGexIntraday,
  fetchMomentumRadar,
  fetchOrderSentiment,
  fetchSepaCandidates,
  fetchSettlements,
  fetchTerrain,
  fetchDailyBriefSynth,
  isDailyBriefSynthUnavailable,
  mapSynthVerdict,
  synthForecastDetail,
  synthGexDetail,
  synthIvDetail,
  synthSettlement,
  synthTerrainDetail,
  type ForecastSettlement,
  type GexIntraday,
  type MomentumScore,
  type SepaScoreRow,
  type TerrainData,
} from '@/api/researchEngine'
import { fetchIvPercentile } from '@/api/research/ivRadar'
import type { IvPercentileRow } from '@/types/ivRadar'
import { useDailyVerdict } from '@/hooks/useDailyVerdict'
import { useResearchContext } from '@/hooks/useResearchContext'
import { freshnessLamp, ivBucket, type LampColor } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'

function OpenLink({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
      <Link to={to}>Open</Link>
    </Button>
  )
}

function BriefCard({
  title,
  lamp,
  verdict,
  openTo,
  emphasis = 'default',
  children,
}: {
  title: string
  lamp: LampColor
  verdict: string
  openTo: string
  emphasis?: 'primary' | 'default'
  children?: ReactNode
}) {
  return (
    <Card
      variant="elevated"
      className={cn(
        emphasis === 'primary' && 'ring-1 ring-primary/20 shadow-sm',
      )}
    >
      <CardContent className="space-y-2 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <StatusLamp lamp={lamp} className="h-2.5 w-2.5 shrink-0" />
            <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground truncate">
              {title}
            </p>
          </div>
          <OpenLink to={openTo} />
        </div>
        <p className="text-dense-label font-medium leading-snug">{verdict}</p>
        {children}
      </CardContent>
    </Card>
  )
}

export default function DailyBriefPage() {
  const { symbol, dateInput, selectedDate, apiDate } = useResearchContext()
  const [secondaryOpen, setSecondaryOpen] = useState(true)
  const sym = symbol

  const synthQ = useQuery({
    queryKey: ['daily-brief-synth', sym, apiDate],
    queryFn: () => fetchDailyBriefSynth(sym, apiDate),
    enabled: sym.length > 0,
    retry: false,
    refetchInterval: 60_000,
  })

  const useFallback =
    synthQ.isError && isDailyBriefSynthUnavailable(synthQ.error)

  const eventsQ = useQuery({
    queryKey: ['daily-brief', 'events'],
    queryFn: () => fetchEventRadarEvents({ limit: 8 }),
    enabled: useFallback,
    refetchInterval: 60_000,
  })

  const sepaQ = useQuery({
    queryKey: ['daily-brief', 'sepa', apiDate],
    queryFn: () => fetchSepaCandidates({ trade_date: apiDate, top: 20 }),
    enabled: useFallback,
    refetchInterval: 60_000,
  })

  const momQ = useQuery({
    queryKey: ['daily-brief', 'momentum', apiDate],
    queryFn: () => fetchMomentumRadar({ trade_date: apiDate, limit: 200 }),
    enabled: useFallback,
    refetchInterval: 60_000,
  })

  const ivQ = useQuery({
    queryKey: ['daily-brief', 'iv', sym],
    queryFn: () => fetchIvPercentile(sym),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const terrainQ = useQuery({
    queryKey: ['daily-brief', 'terrain', sym, apiDate],
    queryFn: () => fetchTerrain(sym, apiDate),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const gexQ = useQuery({
    queryKey: ['daily-brief', 'gex', sym, apiDate],
    queryFn: () => fetchGexIntraday(sym, apiDate),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const forecastQ = useQuery({
    queryKey: ['daily-brief', 'forecast', sym, apiDate],
    queryFn: () => fetchForecastSessions(sym, apiDate),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const settleQ = useQuery({
    queryKey: ['daily-brief', 'settlement', sym],
    queryFn: () => fetchSettlements(sym),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const sentimentQ = useQuery({
    queryKey: ['daily-brief', 'sentiment', sym, apiDate],
    queryFn: () => fetchOrderSentiment(sym, apiDate),
    enabled: useFallback && sym.length > 0,
    refetchInterval: 60_000,
  })

  const synth = synthQ.data

  const gexRows: GexIntraday[] = useFallback ? (gexQ.data?.rows ?? []) : []
  const forecastSessions = useFallback ? (forecastQ.data?.rows ?? []) : []
  const settlements: ForecastSettlement[] = useFallback ? (settleQ.data?.rows ?? []) : []

  const events = synth ? (synth.cards.events.rows ?? []) : (eventsQ.data?.rows ?? [])
  const sepaCandidates = synth
    ? (synth.cards.sepa.candidates ?? [])
    : (sepaQ.data?.candidates ?? [])
  const momRows = useMemo(
    () => (synth ? [] : (momQ.data?.rows ?? [])),
    [synth, momQ.data?.rows],
  )
  const ivRow: IvPercentileRow | null = synth ? synthIvDetail(synth) : (ivQ.data ?? null)
  const terrain: TerrainData | undefined = synth
    ? synthTerrainDetail(synth) ?? undefined
    : terrainQ.data?.terrain
  const gexLatest = synth
    ? synthGexDetail(synth)
    : gexRows.length > 0
      ? gexRows[gexRows.length - 1]
      : null
  const forecastLatest = synth ? synthForecastDetail(synth) : (forecastSessions[0] ?? null)
  const lastSettlement = synth ? synthSettlement(synth) : (settlements[0] ?? null)
  const sentimentRow = synth
    ? (synth.cards.sentiment.detail as { trade_date?: string } | null)
    : ((sentimentQ.data?.rows ?? [])[0] ?? null)

  const momVerdictText = synth?.cards.momentum.verdict
  const momSampleSymbols = synth?.cards.momentum.sample_symbols ?? []

  const setupCount = sepaCandidates.filter((r) => r.path === 'SETUP').length
  const pivotCount = sepaCandidates.filter((r) => r.path === 'PIVOT').length
  const top3 = sepaCandidates.slice(0, 3)

  const gradeCounts = useMemo(() => {
    if (synth?.cards.momentum.verdict) {
      const m = synth.cards.momentum.verdict.match(/A\+ (\d+) · A (\d+) · B (\d+)/)
      if (m) return { 'A+': Number(m[1]), A: Number(m[2]), B: Number(m[3]) }
    }
    const c: Record<string, number> = { 'A+': 0, A: 0, B: 0 }
    for (const r of momRows) {
      if (r.grade === 'A+' || r.grade === 'A' || r.grade === 'B') c[r.grade] += 1
    }
    return c
  }, [momRows, synth])

  const eventsLamp = synth
    ? synth.freshness.events
    : freshnessLamp(
        events[0]?.collected_at ?? events[0]?.computed_at,
        selectedDate,
        eventsQ.isError,
        events.length > 0,
      )
  const sepaLamp = synth
    ? synth.freshness.sepa
    : freshnessLamp(
        sepaQ.data?.trade_date ?? sepaCandidates[0]?.trade_date,
        selectedDate,
        sepaQ.isError,
        sepaCandidates.length > 0,
      )
  const momLamp = synth
    ? synth.freshness.momentum
    : freshnessLamp(
        momQ.data?.trade_date || momRows[0]?.trade_date,
        selectedDate,
        momQ.isError,
        momRows.length > 0,
      )
  const ivLamp = synth
    ? synth.freshness.iv
    : freshnessLamp(ivRow?.trade_date, selectedDate, ivQ.isError, ivRow != null)
  const terrainLamp = synth
    ? synth.freshness.terrain
    : freshnessLamp(terrain?.trade_date, selectedDate, terrainQ.isError, terrain != null)
  const gexLamp = synth
    ? synth.freshness.gex
    : freshnessLamp(
        gexLatest?.trade_date ?? gexLatest?.asof_ts,
        selectedDate,
        gexQ.isError,
        gexLatest != null,
      )
  const forecastLamp = synth
    ? synth.freshness.forecast
    : freshnessLamp(
        forecastLatest?.trade_date,
        selectedDate,
        forecastQ.isError,
        forecastLatest != null,
      )
  const sentimentLamp = synth
    ? synth.freshness.sentiment
    : freshnessLamp(
        sentimentRow?.trade_date,
        selectedDate,
        sentimentQ.isError,
        sentimentRow != null,
      )

  const fallbackVerdict = useDailyVerdict({
    symbol: sym,
    selectedDate,
    events,
    eventsError: eventsQ.isError,
    sepaCandidates,
    sepaError: sepaQ.isError,
    sepaTradeDate: sepaQ.data?.trade_date,
    momRows,
    momError: momQ.isError,
    momTradeDate: momQ.data?.trade_date,
    ivRow,
    ivError: ivQ.isError,
    terrain,
    terrainError: terrainQ.isError,
    gexLatest,
    gexError: gexQ.isError,
    forecastLatest,
    forecastError: forecastQ.isError,
  })

  const verdict = synth ? mapSynthVerdict(synth) : fallbackVerdict

  const hardError =
    synthQ.isError && !isDailyBriefSynthUnavailable(synthQ.error) ||
    (useFallback &&
      (eventsQ.isError ||
        momQ.isError ||
        terrainQ.isError ||
        gexQ.isError ||
        forecastQ.isError))

  const anyLoading =
    synthQ.isLoading ||
    (useFallback &&
      (eventsQ.isLoading ||
        sepaQ.isLoading ||
        momQ.isLoading ||
        terrainQ.isLoading ||
        gexQ.isLoading ||
        forecastQ.isLoading))

  const researchQuery = useMemo(() => {
    const q = new URLSearchParams()
    q.set('symbol', sym)
    if (dateInput) q.set('date', dateInput)
    return q.toString()
  }, [sym, dateInput])

  const withContext = (path: string) =>
    `${path}${researchQuery ? `?${researchQuery}` : ''}`

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Daily Brief"
        actions={
          <div className="flex items-center gap-1.5">
            <AskCopilotButton
              originPage="daily-brief"
              originLabel="Daily Brief"
              symbol={sym}
              date={dateInput || undefined}
              snapshot={compactSnapshot({
                narrative: verdict.narrative,
                risk: verdict.risk,
                opportunity: verdict.opportunity,
              })}
              suggestedPrompt={`Based on today's daily brief for ${sym}, highlight the signals I should act on.`}
            />
            <SaveAsHypothesisButton
              originPage="daily-brief"
              defaultTitle={`${sym} daily brief`}
              defaultSymbols={sym ? [sym] : []}
              originRef={{ symbol: sym, date: selectedDate }}
            />
          </div>
        }
      />

      <ResearchContextBar />

      <VerdictStrip
        narrative={verdict.narrative}
        risk={verdict.risk}
        opportunity={verdict.opportunity}
        actionHint={verdict.actionHint}
        sourceLamps={[
          { label: 'Events', lamp: eventsLamp },
          { label: 'SEPA', lamp: sepaLamp },
          { label: 'Momentum', lamp: momLamp },
          { label: 'IV', lamp: ivLamp },
          { label: 'Terrain', lamp: terrainLamp },
          { label: 'GEX', lamp: gexLamp },
          { label: 'Forecast', lamp: forecastLamp },
          { label: 'Sentiment*', lamp: sentimentLamp },
        ]}
        footnote="*Order Sentiment is snapshot proxy only — not part of the verdict body."
      />

      {hardError && (
        <QueryErrorAlert
          error={
            synthQ.error ||
            eventsQ.error ||
            momQ.error ||
            terrainQ.error ||
            gexQ.error ||
            forecastQ.error
          }
        />
      )}

      {anyLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          <div>
            <p className="mb-2 text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
              Primary — terrain & flow
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <BriefCard
                title="Terrain"
                lamp={terrainLamp}
                emphasis="primary"
                verdict={
                  synth?.cards.terrain.verdict ??
                  (terrain == null
                    ? `No terrain for ${sym}`
                    : `${terrain.regime} · pin ${terrain.pin_score.toFixed(0)} · tail ${terrain.tail_risk.toFixed(0)}`)
                }
                openTo={withContext('/research/analysis-model')}
              >
                {terrain ? (
                  <p className="text-dense-meta text-muted-foreground">
                    Spot {terrain.spot.toFixed(2)} · close {terrain.expected_close.toFixed(2)}
                  </p>
                ) : (
                  <EmptyHint
                    title="No terrain row"
                    hint="Terrain is produced by the forecast engine; intraday snapshots every 15min."
                    to={withContext('/research/analysis-model')}
                    triggerId="terrain-forecast"
                    triggerLabel="Trigger terrain forecast"
                    invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                  />
                )}
              </BriefCard>

              <BriefCard
                title="GEX"
                lamp={gexLamp}
                emphasis="primary"
                verdict={
                  synth?.cards.gex.verdict ??
                  (gexLatest == null
                    ? `No GEX snapshots for ${sym}`
                    : `Spot ${gexLatest.spot.toFixed(0)} vs call ${gexLatest.major_call_wall.toFixed(0)} / 0γ ${gexLatest.zero_gamma.toFixed(0)} / put ${gexLatest.major_put_wall.toFixed(0)}`)
                }
                openTo={withContext('/research/gex-intraday')}
              >
                {gexLatest == null ? (
                  <EmptyHint
                    title="No GEX data"
                    hint="Try SPY / QQQ — SPX OI may not be backfilled yet."
                    to={withContext('/research/gex-intraday')}
                    linkLabel="Open GEX Intraday"
                    triggerId="gex-intraday"
                    triggerLabel="Trigger GEX intraday"
                    invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                  />
                ) : null}
              </BriefCard>

              <BriefCard
                title="Forecast"
                lamp={forecastLamp}
                emphasis="primary"
                verdict={
                  synth?.cards.forecast.verdict ??
                  (forecastLatest == null
                    ? `No forecast session for ${sym}`
                    : `${forecastLatest.regime} · E[close] ${forecastLatest.expected_close.toFixed(2)}`)
                }
                openTo={withContext('/research/forecast-sessions')}
              >
                {forecastLatest ? (
                  lastSettlement ? (
                    <SettlementBadges
                      pathHit={lastSettlement.path_hit}
                      pathHitCount={lastSettlement.path_hit_count}
                      pathTotal={lastSettlement.path_total}
                      closeMissPct={lastSettlement.close_miss_pct}
                      {...settlementFineGrain(lastSettlement)}
                    />
                  ) : (
                    <p className="text-dense-meta text-muted-foreground">No settlement yet</p>
                  )
                ) : (
                  <EmptyHint
                    title="No forecast session"
                    hint="Forecast session engine needs heuristic or LLM output."
                    to={withContext('/research/forecast-sessions')}
                    triggerId="terrain-forecast"
                    triggerLabel="Trigger forecast"
                    invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                  />
                )}
              </BriefCard>
            </div>
          </div>

          <CollapsibleGroup variant="card">
            <CollapsibleGroupHeader
              expanded={secondaryOpen}
              onToggle={() => setSecondaryOpen((o) => !o)}
            >
              <CollapsibleGroupTitle>Secondary — screener & context</CollapsibleGroupTitle>
            </CollapsibleGroupHeader>
            {secondaryOpen ? (
              <CollapsibleGroupBody>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 p-3 pt-0">
                  <BriefCard
                    title="SEPA"
                    lamp={sepaLamp}
                    verdict={
                      synth?.cards.sepa.verdict ??
                      (sepaCandidates.length === 0
                        ? 'No Setup/Pivot candidates'
                        : `Setup ${setupCount} · Pivot ${pivotCount}`)
                    }
                    openTo="/research/sepa-daily-core"
                  >
                    {top3.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {top3.map((r: SepaScoreRow) => (
                          <DenseTag key={r.symbol} variant="symbol">
                            {r.symbol}
                          </DenseTag>
                        ))}
                      </div>
                    ) : (
                      <EmptyHint
                        title="No SEPA candidates"
                        hint="Wait for dbt SEPA mart (04:15 UTC)."
                        to="/research/sepa-daily-core"
                        triggerId="dbt-sepa"
                        triggerLabel="Trigger dbt SEPA"
                        invalidateKeys={[['daily-brief-synth', sym, apiDate ?? ''], ['daily-brief', 'sepa', apiDate ?? '']]}
                      />
                    )}
                  </BriefCard>

                  <BriefCard
                    title="Momentum"
                    lamp={momLamp}
                    verdict={
                      momVerdictText ??
                      (momRows.length === 0
                        ? 'No momentum rows'
                        : `A+ ${gradeCounts['A+']} · A ${gradeCounts.A} · B ${gradeCounts.B}`)
                    }
                    openTo="/research/momentum-radar"
                  >
                    {momRows.length > 0 ? (
                      <p className="text-dense-meta text-muted-foreground">
                        {momRows.length} scored · sample{' '}
                        {(momRows as MomentumScore[]).slice(0, 3).map((r) => r.symbol).join(', ')}
                      </p>
                    ) : momSampleSymbols.length > 0 ? (
                      <p className="text-dense-meta text-muted-foreground">
                        Sample {momSampleSymbols.join(', ')}
                      </p>
                    ) : (
                      <EmptyHint
                        title="No momentum rows"
                        hint="Momentum CronJob runs daily at 05:00 UTC."
                        to="/research/momentum-radar"
                        triggerId="momentum"
                        triggerLabel="Trigger momentum"
                        invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                      />
                    )}
                  </BriefCard>

                  <BriefCard
                    title="IV"
                    lamp={ivLamp}
                    verdict={
                      ivRow == null
                        ? `No IV row for ${sym}`
                        : `Rank ${ivRow.iv_rank_1y?.toFixed(0) ?? '—'} · ${ivBucket(ivRow.iv_rank_1y)}`
                    }
                    openTo={withContext('/research/iv-radar')}
                  >
                    {ivRow ? (
                      <p className="text-dense-meta text-muted-foreground">
                        Pct {ivRow.iv_percentile_1y?.toFixed(0) ?? '—'} · date {ivRow.trade_date ?? '—'}
                      </p>
                    ) : (
                      <EmptyHint
                        title="No IV percentile"
                        hint="IV percentile requires the volatility engine run."
                        to={withContext('/research/iv-radar')}
                        triggerId="iv-percentile"
                        triggerLabel="Trigger IV percentile"
                        invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                      />
                    )}
                  </BriefCard>

                  <BriefCard
                    title="Events"
                    lamp={eventsLamp}
                    verdict={
                      events.length === 0
                        ? 'No event radar rows'
                        : `${events.length} recent · top importance ${Math.max(...events.map((e) => e.importance ?? 0))}`
                    }
                    openTo="/research/event-radar"
                  >
                    {events.length > 0 ? (
                      <ul className="space-y-1">
                        {events.slice(0, 4).map((e) => (
                          <li
                            key={e.event_id}
                            className="truncate text-dense-meta text-muted-foreground"
                            title={e.subject || e.event_summary}
                          >
                            <span className="font-mono text-dense-micro mr-1">
                              i{e.importance ?? '—'}
                            </span>
                            {e.subject || e.event_summary || e.theme || e.event_id}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyHint
                        title="No events"
                        hint="Run event radar CronJob or drop CSV into the ingest folder."
                        to="/research/event-radar"
                        triggerId="event-radar"
                        triggerLabel="Trigger event radar"
                        invalidateKeys={[['daily-brief-synth', sym, apiDate ?? '']]}
                      />
                    )}
                  </BriefCard>

                  <BriefCard
                    title="Sentiment"
                    lamp={sentimentLamp}
                    verdict={
                      sentimentRow == null
                        ? `No sentiment for ${sym}`
                        : `Net bias proxy · date ${sentimentRow.trade_date ?? '—'}`
                    }
                    openTo={withContext('/research/order-sentiment')}
                  >
                    {sentimentRow ? (
                      <p className="text-dense-meta text-muted-foreground">
                        Snapshot proxy — not live tape
                      </p>
                    ) : (
                      <EmptyHint
                        title="No sentiment row"
                        hint="Options tape ingest may not be enabled."
                        to={withContext('/research/order-sentiment')}
                      />
                    )}
                  </BriefCard>
                </div>
              </CollapsibleGroupBody>
            ) : null}
          </CollapsibleGroup>
        </>
      )}

      {!anyLoading &&
        events.length === 0 &&
        sepaCandidates.length === 0 &&
        momRows.length === 0 &&
        terrain == null &&
        gexLatest == null &&
        forecastLatest == null &&
        !hardError && (
          <EmptyState
            icon={<ClipboardList />}
            title="No brief data"
            description={`No Research engine rows for ${sym} on ${selectedDate}. Empty lamps are honest — no fabricated signals.`}
          />
        )}

      <p className={cn('text-dense-caption text-muted-foreground')}>
        Daily Brief synthesizes existing Research engines — observe only (D10). Not investment advice.
      </p>
    </PageShell>
  )
}
