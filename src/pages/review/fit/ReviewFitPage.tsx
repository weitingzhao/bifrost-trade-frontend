/**
 * Review · Single trade — one closed trade against the path it actually traded.
 *
 * The design's argument is a distance measured twice: what I did against what
 * my plan said is discipline, and what my plan said against the best the trade
 * ever printed is the plan itself. The second endpoint — the best mark — is
 * read off the contract's own daily bars. The plan is not stored anywhere, so
 * both distances stay marked while everything they would have been measured
 * from is drawn in full.
 *
 * Layout is the design's: the path and the tables in the wide column, the
 * verdict, the timeline, the tags and the sources in the narrow one.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { useTradeMarkPath } from '@/hooks/useTradeMarkPath'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'
import { ReviewTradeFit } from './ReviewTradeFit'
import { TradePathPanels } from './TradePathPanels'
import { CounterfactualsTable, ExecutionTable } from './TradeFitTables'
import { SourcesPanel, TagsPanel, TimelinePanel, VerdictPanel } from './TradeFitAside'
import { counterfactuals, derivedTags, sources, timeline } from './tradeFitModel'

const PAGE_LEAD =
  'One closed trade against the path it actually traded: what I did, what the position was worth on every session it was held, and the best and worst that path ever offered. The distance to my plan would be discipline — and the plan is the one thing not recorded.'

export default function ReviewFitPage() {
  const [params, setParams] = useSearchParams()
  const [accountFilter] = useState('all')
  const { trades, loading, error, refetch } = useReviewTrades(accountFilter)

  const wanted = params.get('trade')
  const trade = useMemo(
    () => trades.find((t) => t.contractKey === wanted) ?? trades[0] ?? null,
    [trades, wanted],
  )

  const { path, expiryBranch, underlying, optionTicker, loading: pathLoading } = useTradeMarkPath(trade)

  const today = new Date().toISOString().slice(0, 10)
  const derived = useMemo(() => {
    if (trade == null) return null
    return {
      cfs: counterfactuals(trade, path, expiryBranch, today),
      stages: timeline(trade, path),
      tags: derivedTags(trade, path),
      srcs: sources(trade, path, underlying.length, optionTicker),
    }
  }, [trade, path, expiryBranch, underlying.length, optionTicker, today])

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Single trade">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Single trade</p>}
          title="Single trade"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {trades.length > 0 ? (
                <select
                  aria-label="Which trade"
                  className={cn(positionsUi.input, 'max-w-72')}
                  value={trade?.contractKey ?? ''}
                  onChange={(e) => setParams({ trade: e.target.value })}
                >
                  {trades.map((t) => (
                    <option key={t.contractKey} value={t.contractKey}>
                      {t.label} · {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
                    </option>
                  ))}
                </select>
              ) : null}
              <Link to="/review" className={positionsUi.link}>
                ← Queue
              </Link>
              <Link to="/review/habits" className={positionsUi.link}>
                Habits →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : trade == null || derived == null ? (
          <p className="m-0 border px-3 py-3 text-dense-meta text-muted-foreground mat-card">
            No closed trade to read. A trade reaches this page once its own fills have taken the contract flat.
          </p>
        ) : (
          <>
            <ReviewTradeFit trade={trade} markPath={path} pathLoading={pathLoading} />

            <div className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-0 flex-[999_1_40rem] flex-col gap-3">
                {pathLoading ? (
                  <Skeleton className="h-60 w-full rounded-md" />
                ) : (
                  <TradePathPanels
                    trade={trade}
                    markPath={path}
                    expiryBranch={expiryBranch}
                    underlying={underlying}
                  />
                )}
                <CounterfactualsTable rows={derived.cfs} />
                <ExecutionTable trade={trade} />
              </div>

              <aside className="flex min-w-0 max-w-[27.5rem] flex-[1_1_21rem] flex-col gap-3">
                <VerdictPanel trade={trade} markPath={path} />
                <TimelinePanel stages={derived.stages} />
                <TagsPanel tags={derived.tags} />
                <SourcesPanel rows={derived.srcs} />
              </aside>
            </div>

            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here writes: no
              confirmation, no tag, no note. {REVIEW_UNRECORDED.reviewed}
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
