/**
 * Research Home page (Wave RS-A4).
 *
 * `/research` landing: workflow-oriented view that treats the 17 existing
 * Research pages as nodes in a pipeline. Layered as three sections:
 *
 *   1. Verdict Strip — "N active hypotheses · M new discoveries · K backtests"
 *   2. Active Hypotheses — recent hypothesis cards
 *   3. Today's Discoveries — 4-column top-3 hit lists with Save-as-Hypothesis
 *   4. Recent Backtests — placeholder until Wave RS-C4 fills it
 */
import { Link } from 'react-router-dom'
import { Beaker, ClipboardList, Compass, Plus, Radar } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { LoopOverviewStrip } from '@/pages/research/home/LoopOverviewStrip'
import { UniverseReachStrip } from '@/components/research/UniverseReachStrip'
import { EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { DiscoveryHitList } from '@/components/research/DiscoveryHitList'
import { HypothesisCard } from '@/components/research/HypothesisCard'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SaveAsHypothesisButton } from '@/components/research/SaveAsHypothesisButton'
import { useActiveHypotheses } from '@/hooks/useHypotheses'
import { useResearchHomeData } from '@/hooks/useResearchHomeData'
import { useBacktestRuns } from '@/hooks/useBacktestEventQuery'
import { pnlColorClass } from '@/utils/dailyChange'
import type { LampColor } from '@/lib/researchFreshness'
import type { BacktestRunRow } from '@/api/research/backtestEvent'

function VerdictSummary({
  totalActive,
  totalDiscoveries,
  totalBacktests,
  lampDiscoveries,
  lampHypotheses,
  lampBacktests,
}: {
  totalActive: number
  totalDiscoveries: number
  totalBacktests: number
  lampDiscoveries: LampColor
  lampHypotheses: LampColor
  lampBacktests: LampColor
}) {
  return (
    <Card variant="elevated">
      <CardContent className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-3">
        <SummaryLine
          lamp={lampHypotheses}
          label="Active hypotheses"
          value={totalActive}
          hint={
            totalActive === 0
              ? 'No live theses — start one from a Discovery hit or a per-page Save button.'
              : 'Snapshot from research.hypothesis (Golden Source).'
          }
        />
        <SummaryLine
          lamp={lampDiscoveries}
          label="New discoveries today"
          value={totalDiscoveries}
          hint="SEPA hits · events · IV extremes · sentiment anomalies."
        />
        <SummaryLine
          lamp={lampBacktests}
          label="Backtest runs (recent)"
          value={totalBacktests}
          hint="Latest event-driven runs from research.backtest_run (RS-C4)."
        />
      </CardContent>
    </Card>
  )
}

function SummaryLine({
  lamp,
  label,
  value,
  hint,
}: {
  lamp: LampColor
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <StatusLamp lamp={lamp} className="h-2.5 w-2.5 shrink-0" />
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="ml-auto font-mono text-lg font-semibold tabular-nums">{value}</p>
      </div>
      <p className="text-dense-meta text-muted-foreground leading-snug">{hint}</p>
    </div>
  )
}

export default function ResearchHomePage() {
  const activeQ = useActiveHypotheses(5)
  const home = useResearchHomeData()
  const backtestsQ = useBacktestRuns({ limit: 5 })

  const activeCount = activeQ.data?.total_active ?? 0
  const recent = activeQ.data?.recent_active ?? []
  const recentBacktests = backtestsQ.data?.rows ?? []

  const lampHypotheses: LampColor = activeQ.isError
    ? 'red'
    : activeCount > 0
      ? 'green'
      : 'yellow'
  const lampDiscoveries: LampColor = home.isError
    ? 'red'
    : home.totalDiscoveries > 0
      ? 'green'
      : 'yellow'
  const lampBacktests: LampColor = backtestsQ.isError
    ? 'red'
    : recentBacktests.length > 0
      ? 'green'
      : 'yellow'

  const hardError = activeQ.isError && home.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Research"
        description="Workflow-oriented landing: active hypotheses, today's discoveries, and recent backtests. Observe-only (D10)."
        actions={
          <div className="flex items-center gap-2">
            <AskCopilotButton
              originPage="research-home"
              originLabel="Research Home"
              snapshot={compactSnapshot({
                active_hypotheses: activeCount,
                discoveries: home.totalDiscoveries,
                recent_backtests: recentBacktests.length,
              })}
              suggestedPrompt="Summarize today's research home: which hypotheses or discoveries should I open first?"
            />
            <SaveAsHypothesisButton
              originPage="research-home"
              defaultTitle=""
              defaultTags={['manual']}
              size="button"
            />
            <Button asChild variant="outline" size="sm">
              <Link to="/research/daily-brief">
                <Compass className="mr-1 h-3.5 w-3.5" />
                Daily Brief
              </Link>
            </Button>
          </div>
        }
      />

      {/* The circuit first. Every section below shows one segment of it, and a
          segment looks healthy on its own while the loop is open. */}
      <LoopOverviewStrip />

      <UniverseReachStrip />

      <VerdictSummary
        totalActive={activeCount}
        totalDiscoveries={home.totalDiscoveries}
        totalBacktests={recentBacktests.length}
        lampDiscoveries={lampDiscoveries}
        lampHypotheses={lampHypotheses}
        lampBacktests={lampBacktests}
      />

      {hardError ? (
        <QueryErrorAlert
          error={activeQ.error ?? new Error('Research Home aggregate unavailable')}
          onRetry={() => {
            void activeQ.refetch()
            home.refetch()
          }}
        />
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-dense-body font-semibold">Active hypotheses</h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
            <Link to="/research/daily-brief">
              Save from Daily Brief
              <Plus className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        {activeQ.isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="No active hypotheses yet"
            description="Save a thesis from Daily Brief, Event Radar, SEPA Daily Core, IV Radar, or any Discovery hit below."
            action={
              <SaveAsHypothesisButton
                originPage="research-home"
                defaultTitle=""
                defaultTags={['manual']}
                size="button"
              />
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((h) => (
              <HypothesisCard key={h.id} hypothesis={h} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-dense-body font-semibold">Today's discoveries</h2>
        </div>
        <DiscoveryHitList
          sepaHits={home.sepaHits}
          eventHits={home.eventHits}
          ivExtremes={home.ivExtremes}
          sentimentAnomalies={home.sentimentAnomalies}
          sepaTradeDate={home.sepaTradeDate}
          isLoading={home.isLoading}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Beaker className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-dense-body font-semibold">Recent backtests</h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-dense-meta">
            <Link to="/research/backtest?tab=event-query">Open Backtest</Link>
          </Button>
        </div>
        <RecentBacktestsPanel
          rows={recentBacktests}
          isLoading={backtestsQ.isLoading}
          isError={backtestsQ.isError}
        />
      </section>

      <p className="text-dense-caption text-muted-foreground">
        Research Home aggregates existing engines only — observe-only (D10). Trade execution remains
        BLOCKED until Owner unlock.
      </p>
    </PageShell>
  )
}

function RecentBacktestsPanel({
  rows,
  isLoading,
  isError,
}: {
  rows: BacktestRunRow[]
  isLoading: boolean
  isError: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <Card variant="elevated">
        <CardContent className="px-4 py-4">
          <p className="text-dense-meta text-destructive">
            Backtest runs unavailable. Verify research-api :8795 and{' '}
            <code className="rounded bg-muted px-1">research.backtest_run</code> DDL.
          </p>
        </CardContent>
      </Card>
    )
  }
  if (rows.length === 0) {
    return (
      <Card variant="elevated">
        <CardContent className="px-4 py-6">
          <EmptyState
            icon={<Beaker />}
            title="No event-driven runs yet"
            description="Run an Event Query from the Backtest page to populate this list."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/research/backtest?tab=event-query">Open Event Query</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card variant="elevated">
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const summary = r.summary ?? {}
            const winRate = (summary as { win_rate?: number }).win_rate
            const avgPnl = (summary as { avg_pnl?: number }).avg_pnl
            const nEvents = (summary as { n_events?: number }).n_events ?? 0
            return (
              <li key={r.id} className="px-3 py-2">
                <Link
                  to={`/research/backtest?tab=event-query&run_id=${encodeURIComponent(r.id)}`}
                  className="flex flex-wrap items-center gap-3 hover:bg-muted/40"
                >
                  <span className="font-mono text-dense-caption text-muted-foreground">
                    {r.id.slice(0, 8)}
                  </span>
                  <span className="text-dense-body font-semibold">
                    {r.strategy_template}
                  </span>
                  <span className="text-dense-caption text-muted-foreground">
                    · {r.event_def?.kind ?? 'event'}
                  </span>
                  <span className="text-dense-caption text-muted-foreground">
                    · {nEvents} events
                  </span>
                  {typeof winRate === 'number' && (
                    <span className="text-dense-caption text-muted-foreground">
                      · win {(winRate * 100).toFixed(0)}%
                    </span>
                  )}
                  {typeof avgPnl === 'number' && (
                    <span
                      className={`ml-auto font-mono text-dense-body tabular-nums ${pnlColorClass(
                        avgPnl,
                      )}`}
                    >
                      {avgPnl > 0 ? '+' : avgPnl < 0 ? '−' : ''}$
                      {Math.abs(avgPnl).toFixed(2)}
                    </span>
                  )}
                  <span className="text-dense-caption text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
