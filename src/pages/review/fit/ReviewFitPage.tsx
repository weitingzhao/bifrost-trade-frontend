/**
 * Review · Single trade — one closed trade, read against what it was meant to be.
 *
 * The design's shape is a diff: plan against actual, and two gaps taken from
 * it — discipline (what I did against what I said) and plan cost (what I said
 * against the best the trade printed). Both gaps need the plan and the mark
 * path, so both are marked.
 *
 * What the fills do carry is the trade itself, and it is not nothing: every
 * leg, the premium in and out, the dates, the days held, how far out it was
 * written and what share of the credit it kept. That half is drawn in full,
 * because the page is still the only place one trade can be looked at whole.
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
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'
import { ReviewTradeFit } from '@/components/review/ReviewTradeFit'

const PAGE_LEAD =
  'One closed trade, read against what it was meant to be. The trade itself comes from its own fills; the two gaps need the plan it was opened under.'


export default function ReviewFitPage() {
  const [params, setParams] = useSearchParams()
  const [accountFilter] = useState('all')
  const { trades, loading, error, refetch } = useReviewTrades(accountFilter)

  const wanted = params.get('trade')
  const trade = useMemo(
    () => trades.find((t) => t.contractKey === wanted) ?? trades[0] ?? null,
    [trades, wanted],
  )

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
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : trade == null ? (
          <p className="m-0 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-3 text-dense-meta text-muted-foreground">
            No closed trade to read. A trade reaches this page once its own fills have taken the contract flat.
          </p>
        ) : (
          <>
            <ReviewTradeFit trade={trade} />

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here writes: no
              confirmation, no tag, no note. {REVIEW_UNRECORDED.reviewed}
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
