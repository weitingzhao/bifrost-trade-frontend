/**
 * Review · Habits — measured tendencies over the closed book, each with its
 * sample, its distribution and what it cost.
 *
 * The design names seven. Four are readings here: how long trades are held, how
 * far out they are written, what share of the best mark winners actually land,
 * and how long a loser stays open past its worst mark — the last two only since
 * the contract's own daily bars turned out to be available. A fifth, the share
 * of the credit kept, the fills answer outright.
 *
 * The rest divide by the plan, and so does every cost figure on the page: a
 * habit's cost is what it did against what the plan would have produced. Those
 * rows keep their place and name what they need. The temptation is to show the
 * answerable ones and quietly drop the rest, which would read as a short list
 * of tendencies rather than a long one partly unmeasured — and the second is
 * the true state of the book.
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
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { daysBetween } from '@/lib/isoDate'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { THIN_SAMPLE } from '@/utils/reviewTrades'
import { habitReadings, type HabitReading } from '@/utils/reviewHabits'
import { HabitStrip } from './HabitStrip'
import { CostSplit, NotClaimed, PlanAdherenceQuadrants } from './HabitsAside'

const PAGE_LEAD =
  'Measured tendencies over the closed book — each one a distribution, a sample count, and what it cost or earned. No scores and no trader archetypes: a label you cannot falsify is not a finding.'

const WINDOWS = [
  { value: 'q', label: '3M', days: 92 },
  { value: 'half', label: '6M', days: 183 },
  { value: 'all', label: 'All', days: null },
] as const

/** The design's second filter. Both of its narrower bases need a store this side has not got. */
const BASES = [
  { value: 'all', label: 'All closed' },
  { value: 'reviewed', label: 'Reviewed only', disabled: true },
  { value: 'planned', label: 'Has a plan', disabled: true },
]

function fmtFor(h: HabitReading): (v: number) => string {
  if (h.kind === 'share') return (v) => `${(v * 100).toFixed(0)}%`
  if (h.kind === 'days') return (v) => v.toFixed(v < 10 ? 1 : 0)
  return (v) => v.toFixed(0)
}

export default function ReviewHabitsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const [window, setWindow] = useState<string>('all')
  const {
    trades,
    paths,
    accountIds,
    withoutPath,
    pathRequests,
    pathsLoading,
    loading,
    error,
    refetch,
  } = useReviewHabits(accountFilter)

  const today = new Date().toISOString().slice(0, 10)
  const inWindow = useMemo(() => {
    const days = WINDOWS.find((w) => w.value === window)?.days
    if (days == null) return trades
    return trades.filter((t) => {
      const age = t.closedOn ? daysBetween(t.closedOn, today) : null
      return age != null && age <= days
    })
  }, [trades, window, today])

  // The window narrows the sample, so it has to narrow the readings too — a
  // gate that says "12 closed trades" above tendencies computed over 67 is the
  // worst of both.
  const habits = useMemo(() => habitReadings(inWindow, paths, pathsLoading), [inWindow, paths, pathsLoading])
  const measured = habits.filter((h) => h.value != null)
  const pending = habits.some((h) => h.measuring)
  const n = inWindow.length
  const gate =
    n === 0
      ? { lamp: 'gray' as const, title: 'No closed trade in this window', sub: 'Widen the window, or wait for a trade to close.' }
      : n < THIN_SAMPLE
        ? {
            lamp: 'yellow' as const,
            title: `${n} closed trades — under the floor of ${THIN_SAMPLE}`,
            sub: 'Every reading below is the band rather than the point. A tendency read off this few trades is a description of this few trades.',
          }
        : {
            lamp: 'green' as const,
            title: `${n} closed trades — over the floor of ${THIN_SAMPLE}`,
            sub: pending
              ? `Reading each contract's own daily bars over ${pathRequests} requests, one per underlying and expiry.`
              : `${measured.length} of the ${habits.length} tendencies have a reading; the rest name what they need. Paths read over ${pathRequests} requests, one per underlying and expiry.`,
          }

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
              <Link to="/review" className={positionsUi.link}>
                ← Queue
              </Link>
              <Link to="/review/proposals" className={positionsUi.link}>
                Proposals →
              </Link>
            </span>
          }
        />

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-2">
          <span className={positionsUi.cap}>Window</span>
          <SegmentControl
            size="xs"
            ariaLabel="Window"
            value={window}
            onChange={setWindow}
            options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
          />
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className={positionsUi.cap}>Basis</span>
          <SegmentControl size="xs" ariaLabel="Basis" value="all" onChange={() => {}} options={BASES} />
          <DenseTag variant="warning" size="cell">
            ⚠ NO REVIEW OR PLAN STORE
          </DenseTag>
          {accountIds.length > 1 ? (
            <>
              <span aria-hidden className="h-4 w-px bg-border" />
              <span className={positionsUi.cap}>Account</span>
              <SegmentControl
                size="xs"
                ariaLabel="Account"
                value={accountFilter}
                onChange={setAccountFilter}
                options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
              />
            </>
          ) : null}
          <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>
            n <span className={n < THIN_SAMPLE ? 'text-warning' : 'text-foreground'}>{n}</span> / floor{' '}
            {THIN_SAMPLE}
          </span>
        </div>

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="Sample gate">
              <div className="grid grid-cols-[0.875rem_minmax(0,1fr)] items-start gap-3 px-3 py-2.5">
                <span className="pt-1">
                  <StatusLamp lamp={gate.lamp} variant="dot" title={gate.title} />
                </span>
                <span className="min-w-0">
                  <span className="block text-dense-body font-semibold text-foreground">{gate.title}</span>
                  <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {gate.sub}
                  </span>
                </span>
              </div>
            </section>

            <div className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-0 flex-[999_1_38rem] flex-col gap-3">
                <section className={positionsUi.panel} aria-label="Tendencies">
                  <header className={positionsUi.panelHead}>
                    <span className={positionsUi.cap}>Tendencies</span>
                    <span className={positionsUi.panelTitle}>Each with its sample and its consequence</span>
                    <span className="ml-auto text-dense-meta text-muted-foreground">
                      dots are trades · green earned, red lost
                    </span>
                  </header>
                  {habits.map((h) => (
                    <HabitRow key={h.key} habit={h} />
                  ))}
                </section>
              </div>

              <aside className="flex min-w-0 max-w-[26.875rem] flex-[1_1_20.625rem] flex-col gap-3">
                <PlanAdherenceQuadrants closed={n} />
                <CostSplit />
                <NotClaimed
                  measured={measured.length}
                  total={habits.length}
                  closed={n}
                  withoutPath={withoutPath.length}
                  pathRequests={pathRequests}
                />
              </aside>
            </div>

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

function HabitRow({ habit }: { habit: HabitReading }) {
  const fmt = fmtFor(habit)
  const measuring = Boolean(habit.measuring)
  const thin = habit.value != null && habit.n < THIN_SAMPLE
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-x-4 gap-y-2 border-b border-border/55 px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              'text-dense-body font-semibold',
              habit.value == null ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {habit.value == null ? (
              <span className="inline-flex items-center gap-1.5">
                <StatusLamp lamp="gray" variant="dot" title={measuring ? 'Still reading' : 'Unmeasured'} />
                {habit.label}
              </span>
            ) : (
              habit.label
            )}
          </span>
          <DenseTag variant={habit.value == null ? 'neutral' : thin ? 'warning' : 'success'} size="cell">
            n {measuring ? '…' : habit.n}
          </DenseTag>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              positionsUi.mono,
              'text-lg font-bold',
              habit.value == null ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {habit.value == null ? (measuring ? '…' : 'n/c') : fmt(habit.value)}
          </span>
          <span className="text-dense-meta text-muted-foreground">{habit.unit}</span>
          {habit.ci ? (
            <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
              {habit.ciLabel} {fmt(habit.ci[0])} – {fmt(habit.ci[1])}
            </span>
          ) : null}
          <span className="text-dense-caption uppercase tracking-[0.1em] text-muted-foreground">{habit.stat}</span>
        </div>
        <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
          {measuring ? 'Reading this contract’s daily bars…' : habit.read}
        </p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              positionsUi.mono,
              'text-dense-body font-semibold',
              habit.consequence == null ? 'text-muted-foreground' : pnlColorClass(habit.consequence),
            )}
          >
            {habit.consequence == null ? (measuring ? 'measuring…' : 'no cost') : fmtUsd(habit.consequence, true)}
          </span>
          <span className="min-w-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
            {habit.consequenceLabel}
          </span>
        </div>
        {habit.unmeasured ? (
          <p className="m-0 inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
            <span className="pt-1">
              <StatusLamp lamp={habit.value == null ? 'gray' : 'yellow'} variant="dot" title="Not measured" />
            </span>
            <span>Not measured: {habit.unmeasured}.</span>
          </p>
        ) : null}
      </div>
      <HabitStrip habit={habit} fmt={fmt} />
    </div>
  )
}
