/**
 * Review · Habits — the tendencies across closed trades, and their cost.
 *
 * The design names seven. Three can be measured from the fills alone — how long
 * a trade is held, how far out it is written, and what share of the credit it
 * keeps. The other four turn on the plan or on the mark through the holding
 * period, and every one of them keeps its row and says which half is missing.
 *
 * The temptation on this page is to show the three and quietly drop the four,
 * which would read as a short list of tendencies rather than a long one mostly
 * unmeasured — and the second is the true state of the book. A habit is a claim
 * about repeated behaviour, so a habit with no sample is worse than absent: it
 * invites a change to a rule on the strength of nothing.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'

const PAGE_LEAD =
  'What I do repeatedly, and what it costs. A habit is a claim about a pattern, so it needs a sample — and four of the seven have none on this side.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

function fmtValue(unit: string, v: number): string {
  if (unit === 'of credit') return `${(v * 100).toFixed(0)}%`
  return v.toFixed(unit === 'days' ? 0 : 1)
}

export default function ReviewHabitsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { trades, habits, accountIds, loading, error, refetch } = useReviewTrades(accountFilter)

  const measured = useMemo(() => habits.filter((h) => h.value != null), [habits])
  const unmeasured = useMemo(() => habits.filter((h) => h.value == null), [habits])

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Habits">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Habits</p>}
          title="Habits"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {accountIds.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {measured.length} of {habits.length} measurable · {trades.length} closed trades
              </span>
              <Link to="/review" className={positionsUi.link}>
                ← Queue
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : (
          <>
            <PositionsTier label="Measured" note="what the fills alone can say about how this book trades" />
            <section className={positionsUi.panel} aria-label="Measured habits">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{measured.length} habits with a sample</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  across {trades.length} closed trades
                </span>
              </header>
              {measured.map((h) => (
                <div key={h.key} className="border-b border-border/55 px-3 py-2 last:border-b-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xs leading-normal font-semibold text-foreground">{h.label}</span>
                    <span className={cn(positionsUi.mono, 'text-sm text-foreground')}>
                      {fmtValue(h.unit, h.value as number)}
                    </span>
                    <span className="text-dense-meta text-muted-foreground">{h.unit}</span>
                    <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>n {h.n}</span>
                  </div>
                  <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">{h.read}</p>
                  {h.unmeasured ? (
                    <p className="m-0 inline-flex flex-wrap items-baseline gap-x-1.5 text-dense-meta leading-normal text-warning text-pretty">
                      <StatusLamp lamp="yellow" variant="dot" title="Half missing" />
                      <span className="text-muted-foreground">Not measured: {h.unmeasured}.</span>
                    </p>
                  ) : null}
                </div>
              ))}
              <p className={cn(FOOT, 'm-0')}>
                None of these three carries a cost figure. A habit&rsquo;s cost is what it did to P&amp;L against what
                the plan would have produced, and that subtraction needs the plan.
              </p>
            </section>

            <PositionsTier label="Unmeasured" note="the four that need a plan or a mark path, and what each needs" />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Unmeasured habits">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{unmeasured.length} habits with no sample</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ kept, not dropped
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  a habit with no sample invites a rule change on the strength of nothing
                </span>
              </header>
              {unmeasured.map((h) => (
                <div key={h.key} className="border-b border-border/55 px-3 py-2 last:border-b-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal font-semibold text-foreground">
                      <StatusLamp lamp="gray" variant="dot" title="Unmeasured" />
                      {h.label}
                    </span>
                    <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                      {h.n} trades would be in the sample
                    </span>
                  </div>
                  <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">{h.read}</p>
                  <p className="m-0 text-dense-meta leading-normal text-secondary-foreground text-pretty">
                    Needs {h.unmeasured}.
                  </p>
                </div>
              ))}
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.plan}</p>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> A habit here is a reading, not
              a verdict. What it argues for is{' '}
              <Link to="/review/proposals" className={positionsUi.link}>
                Rule proposals
              </Link>
              &rsquo; subject, and nothing on either page changes a rule by itself.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
