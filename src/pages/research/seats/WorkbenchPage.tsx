/**
 * Workbench — `/research/workbench`, the level-1 seat's landing.
 *
 * You open the pages. This is what is on the bench today: the benches
 * themselves, the universe they read, active hypotheses, today's discoveries,
 * recent backtests. Was the Research home until the seats arrived.
 */
import { Link } from 'react-router-dom'
import { Beaker, ClipboardList, Plus, Radar } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { BenchDirectory } from '@/pages/research/home/BenchDirectory'
import { PipelineCensus } from '@/pages/research/pipeline/PipelineCensus'
import { usePipelineCensus } from '@/pages/research/pipeline/usePipelineCensus'
import { UniverseReachStrip } from '@/components/research/UniverseReachStrip'
import { EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
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
import type { BacktestRunRow } from '@/api/research/backtestEvent'

export default function WorkbenchPage() {
  // The same reading the census panel renders — one computation, two readers
  // (the panel and the header's Copilot snapshot).
  const census = usePipelineCensus()
  const activeQ = useActiveHypotheses(5)
  const home = useResearchHomeData()
  const backtestsQ = useBacktestRuns({ limit: 5 })

  const recent = activeQ.data?.recent_active ?? []
  const recentBacktests = backtestsQ.data?.rows ?? []


  const hardError = activeQ.isError && home.isError

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Pipeline"
        description="Your hand on the stations. Discover · Analyze · Validate — every store the stations wrote today on one scale, and how much of it nothing came out of. Made is what the engine kept; moved on is a hypothesis, a promotion or a pin that carries the page as its origin. Most stuck first. Advisory only — D10 blocked."
        actions={
          /* Design's ruling (Rev 2026-09-21.5) on the three controls this
             page's header carried. **Ask Copilot stays** — Copilot is a shell
             capability (⌘J on any page), so the button belongs to the shell,
             not to the page — but its snapshot changes: the three numbers it
             used to carry named blocks this page no longer has, so it carries
             the census instead. **Save as Hypothesis went**, and the reason is
             the question we asked: under the new scale a hypothesis is the
             numerator of this page's own `moved on` column, so writing one
             here, with the layer page as its origin, would add to a number
             this page reads. It belongs on the hit that produced it.
             **Daily Brief went** too — it is Copilot's sediment and already a
             menu row; a page repeating a menu row is furniture. */
          <AskCopilotButton
            originPage="research-workbench"
            originLabel="Pipeline"
            snapshot={compactSnapshot({
              stores: `${census.totals.withStore}/${census.totals.onBench}`,
              written: census.totals.written,
              left: census.totals.left,
              worst_station: census.worst ? `${census.worst.label} ${Math.round((census.worst.stuck ?? 0) * 100)}%` : null,
            })}
            suggestedPrompt="From this Pipeline census: which station should I open first, and what is it waiting on?"
          />
        }
      />

      {/* The design's seat-context strip (Research Overview.dc.html, the seat
          homes, Rev 2026-09-18.2): the seat as a tag on the page rather than a
          rail state. The prototype's own ruling is that this home is not
          redesigned — what changed is around it. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-md border border-border bg-background px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Context
        </span>
        <span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-0.5 text-dense-meta">
          <span className="font-mono font-bold text-foreground">hand</span>
          <span className="text-muted-foreground">operator</span>
        </span>
        <span className="text-dense-meta text-muted-foreground">
          the stations all three operators run — your hand is the one at the controls here
        </span>
      </div>

      {/* The layer's own reading (§5a.6), above the bench it is about: a layer
          page leads with the verdict and then shows the detail, the way Risk
          and Portfolio do. */}
      <PipelineCensus />

      <BenchDirectory />

      <UniverseReachStrip />


      {hardError ? (
        <QueryErrorAlert
          error={activeQ.error ?? new Error('Workbench aggregate unavailable')}
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
                originPage="research-workbench"
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
          failed={home.failed}
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
