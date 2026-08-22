import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseTag,
  EmptyState,
} from '@/components/data-display'
import { SettlementBadges } from '@/components/data-display/SettlementBadges'
import { StatusLamp } from '@/components/StatusLamp'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  type ForecastSettlement,
  type GexIntraday,
  type MomentumScore,
  type SepaScoreRow,
  type TerrainData,
} from '@/api/researchEngine'
import { fetchIvPercentile } from '@/api/research/ivRadar'
import type { IvPercentileRow } from '@/types/ivRadar'
import { cn } from '@/lib/utils'

type LampColor = 'green' | 'yellow' | 'red' | 'gray'

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function datePrefix(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value).trim()
  return s.length >= 10 ? s.slice(0, 10) : null
}

/** Fresh = matches selected/today trade_date; stale = older date present; empty = no data. */
function freshnessLamp(
  tradeDate: string | null | undefined,
  selectedDate: string,
  hasError: boolean,
  hasData: boolean,
): LampColor {
  if (hasError) return 'red'
  if (!hasData) return 'gray'
  const td = datePrefix(tradeDate)
  const target = selectedDate || todayIso()
  if (!td) return 'yellow'
  if (td === target) return 'green'
  return 'yellow'
}

function ivBucket(rank: number | null): string {
  if (rank == null || !Number.isFinite(rank)) return 'no row'
  if (rank > 60) return 'High'
  if (rank >= 30) return 'Neutral'
  return 'Low'
}

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
  children,
}: {
  title: string
  lamp: LampColor
  verdict: string
  openTo: string
  children?: ReactNode
}) {
  return (
    <Card variant="elevated">
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

function SourceLamp({ label, lamp }: { label: string; lamp: LampColor }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
      <StatusLamp lamp={lamp} className="h-2 w-2" />
      {label}
    </span>
  )
}

export default function DailyBriefPage() {
  const [symbol, setSymbol] = useState('SPX')
  const [date, setDate] = useState('')
  const selectedDate = date || todayIso()
  const sym = symbol.trim().toUpperCase() || 'SPX'

  const eventsQ = useQuery({
    queryKey: ['daily-brief', 'events'],
    queryFn: () => fetchEventRadarEvents({ limit: 8 }),
    refetchInterval: 60_000,
  })

  const sepaQ = useQuery({
    queryKey: ['daily-brief', 'sepa', date],
    queryFn: () => fetchSepaCandidates({ trade_date: date || undefined, top: 20 }),
    refetchInterval: 60_000,
  })

  const momQ = useQuery({
    queryKey: ['daily-brief', 'momentum', date],
    queryFn: () => fetchMomentumRadar({ trade_date: date || undefined, limit: 200 }),
    refetchInterval: 60_000,
  })

  const ivQ = useQuery({
    queryKey: ['daily-brief', 'iv', sym],
    queryFn: () => fetchIvPercentile(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const terrainQ = useQuery({
    queryKey: ['daily-brief', 'terrain', sym, date],
    queryFn: () => fetchTerrain(sym, date || undefined),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const gexQ = useQuery({
    queryKey: ['daily-brief', 'gex', sym, date],
    queryFn: () => fetchGexIntraday(sym, date || undefined),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const forecastQ = useQuery({
    queryKey: ['daily-brief', 'forecast', sym, date],
    queryFn: () => fetchForecastSessions(sym, date || undefined),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const settleQ = useQuery({
    queryKey: ['daily-brief', 'settlement', sym],
    queryFn: () => fetchSettlements(sym),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const sentimentQ = useQuery({
    queryKey: ['daily-brief', 'sentiment', sym, date],
    queryFn: () => fetchOrderSentiment(sym, date || undefined),
    enabled: sym.length > 0,
    refetchInterval: 60_000,
  })

  const events = eventsQ.data?.rows ?? []
  const sepaCandidates = sepaQ.data?.candidates ?? []
  const momRows = useMemo(() => momQ.data?.rows ?? [], [momQ.data?.rows])
  const ivRow: IvPercentileRow | null = ivQ.data ?? null
  const terrain: TerrainData | undefined = terrainQ.data?.terrain
  const gexRows: GexIntraday[] = gexQ.data?.rows ?? []
  const gexLatest = gexRows.length > 0 ? gexRows[gexRows.length - 1] : null
  const forecastSessions = forecastQ.data?.rows ?? []
  const forecastLatest = forecastSessions[0] ?? null
  const settlements: ForecastSettlement[] = settleQ.data?.rows ?? []
  const lastSettlement = settlements[0] ?? null
  const sentimentRow = (sentimentQ.data?.rows ?? [])[0] ?? null

  const setupCount = sepaCandidates.filter((r) => r.path === 'SETUP').length
  const pivotCount = sepaCandidates.filter((r) => r.path === 'PIVOT').length
  const top3 = sepaCandidates.slice(0, 3)

  const gradeCounts = useMemo(() => {
    const c: Record<string, number> = { 'A+': 0, A: 0, B: 0 }
    for (const r of momRows) {
      if (r.grade === 'A+' || r.grade === 'A' || r.grade === 'B') c[r.grade] += 1
    }
    return c
  }, [momRows])

  const eventsLamp = freshnessLamp(
    events[0]?.collected_at ?? events[0]?.computed_at,
    selectedDate,
    eventsQ.isError,
    events.length > 0,
  )
  const sepaLamp = freshnessLamp(
    sepaQ.data?.trade_date ?? sepaCandidates[0]?.trade_date,
    selectedDate,
    sepaQ.isError,
    sepaCandidates.length > 0,
  )
  const momLamp = freshnessLamp(
    momQ.data?.trade_date || momRows[0]?.trade_date,
    selectedDate,
    momQ.isError,
    momRows.length > 0,
  )
  const ivLamp = freshnessLamp(ivRow?.trade_date, selectedDate, ivQ.isError, ivRow != null)
  const terrainLamp = freshnessLamp(
    terrain?.trade_date,
    selectedDate,
    terrainQ.isError,
    terrain != null,
  )
  const gexLamp = freshnessLamp(
    gexLatest?.trade_date ?? gexLatest?.asof_ts,
    selectedDate,
    gexQ.isError,
    gexLatest != null,
  )
  const forecastLamp = freshnessLamp(
    forecastLatest?.trade_date,
    selectedDate,
    forecastQ.isError,
    forecastLatest != null,
  )
  const sentimentLamp = freshnessLamp(
    sentimentRow?.trade_date,
    selectedDate,
    sentimentQ.isError,
    sentimentRow != null,
  )

  const verdictParts: string[] = []
  if (terrain?.regime) verdictParts.push(`${sym} ${terrain.regime}`)
  if (sepaCandidates.length > 0) {
    verdictParts.push(`SEPA ${setupCount} Setup / ${pivotCount} Pivot`)
  }
  if (events.length > 0) verdictParts.push(`Event ${events.length}`)
  if (lastSettlement) {
    verdictParts.push(lastSettlement.path_hit ? 'Settlement hit' : 'Settlement miss')
  }
  const verdictLine =
    verdictParts.length > 0
      ? verdictParts.join(' · ')
      : `No daily brief signals for ${sym} yet`

  // SEPA 404 (route missing on older research-api) is handled in fetch → empty card, not banner.
  const hardError =
    eventsQ.isError ||
    momQ.isError ||
    terrainQ.isError ||
    gexQ.isError ||
    forecastQ.isError

  const anyLoading =
    eventsQ.isLoading ||
    sepaQ.isLoading ||
    momQ.isLoading ||
    terrainQ.isLoading ||
    gexQ.isLoading ||
    forecastQ.isLoading

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader title="Daily Brief" />

      <Card variant="elevated">
        <CardContent className="flex flex-wrap items-center gap-3 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Symbol:</span>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="h-7 w-28 font-mono text-sm"
            placeholder="SPX"
          />
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Date:</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-7 w-36 font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Verdict strip */}
      <Card variant="elevated">
        <CardContent className="space-y-2 px-4 py-3">
          <p className="text-dense-body font-semibold leading-snug">{verdictLine}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <SourceLamp label="Events" lamp={eventsLamp} />
            <SourceLamp label="SEPA" lamp={sepaLamp} />
            <SourceLamp label="Momentum" lamp={momLamp} />
            <SourceLamp label="IV" lamp={ivLamp} />
            <SourceLamp label="Terrain" lamp={terrainLamp} />
            <SourceLamp label="GEX" lamp={gexLamp} />
            <SourceLamp label="Forecast" lamp={forecastLamp} />
            <SourceLamp label="Sentiment*" lamp={sentimentLamp} />
          </div>
          <p className="text-dense-micro text-muted-foreground">
            *Order Sentiment is snapshot proxy only — not part of the verdict body.
          </p>
        </CardContent>
      </Card>

      {hardError && (
        <QueryErrorAlert
          error={
            eventsQ.error ||
            momQ.error ||
            terrainQ.error ||
            gexQ.error ||
            forecastQ.error
          }
        />
      )}

      {anyLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
            ) : null}
          </BriefCard>

          <BriefCard
            title="SEPA"
            lamp={sepaLamp}
            verdict={
              sepaCandidates.length === 0
                ? 'No Setup/Pivot candidates'
                : `Setup ${setupCount} · Pivot ${pivotCount}`
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
            ) : null}
          </BriefCard>

          <BriefCard
            title="Momentum"
            lamp={momLamp}
            verdict={
              momRows.length === 0
                ? 'No momentum rows'
                : `A+ ${gradeCounts['A+']} · A ${gradeCounts.A} · B ${gradeCounts.B}`
            }
            openTo="/research/momentum-radar"
          >
            {momRows.length > 0 ? (
              <p className="text-dense-meta text-muted-foreground">
                {momRows.length} scored · sample{' '}
                {(momRows as MomentumScore[]).slice(0, 3).map((r) => r.symbol).join(', ')}
              </p>
            ) : null}
          </BriefCard>

          <BriefCard
            title="IV"
            lamp={ivLamp}
            verdict={
              ivRow == null
                ? `No IV row for ${sym}`
                : `Rank ${ivRow.iv_rank_1y?.toFixed(0) ?? '—'} · ${ivBucket(ivRow.iv_rank_1y)}`
            }
            openTo="/research/iv-radar"
          >
            {ivRow ? (
              <p className="text-dense-meta text-muted-foreground">
                Pct {ivRow.iv_percentile_1y?.toFixed(0) ?? '—'} · date {ivRow.trade_date ?? '—'}
              </p>
            ) : null}
          </BriefCard>

          <BriefCard
            title="Terrain"
            lamp={terrainLamp}
            verdict={
              terrain == null
                ? `No terrain for ${sym}`
                : `${terrain.regime} · pin ${terrain.pin_score.toFixed(0)} · tail ${terrain.tail_risk.toFixed(0)}`
            }
            openTo="/research/analysis-model"
          >
            {terrain ? (
              <p className="text-dense-meta text-muted-foreground">
                Spot {terrain.spot.toFixed(2)} · close {terrain.expected_close.toFixed(2)}
              </p>
            ) : null}
          </BriefCard>

          <BriefCard
            title="GEX"
            lamp={gexLamp}
            verdict={
              gexLatest == null
                ? `No GEX snapshots for ${sym}`
                : `Spot ${gexLatest.spot.toFixed(0)} vs call ${gexLatest.major_call_wall.toFixed(0)} / 0γ ${gexLatest.zero_gamma.toFixed(0)} / put ${gexLatest.major_put_wall.toFixed(0)}`
            }
            openTo="/research/gex-intraday"
          />

          <BriefCard
            title="Forecast"
            lamp={forecastLamp}
            verdict={
              forecastLatest == null
                ? `No forecast session for ${sym}`
                : `${forecastLatest.regime} · E[close] ${forecastLatest.expected_close.toFixed(2)}`
            }
            openTo="/research/forecast-sessions"
          >
            {lastSettlement ? (
              <SettlementBadges
                pathHit={lastSettlement.path_hit}
                pathHitCount={lastSettlement.path_hit_count}
                pathTotal={lastSettlement.path_total}
                closeMissPct={lastSettlement.close_miss_pct}
              />
            ) : (
              <p className="text-dense-meta text-muted-foreground">No settlement yet</p>
            )}
          </BriefCard>
        </div>
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
