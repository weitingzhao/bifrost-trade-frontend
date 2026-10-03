/**
 * Review · Habits — measured tendencies over the closed book, each with its
 * sample, its distribution and what it cost.
 *
 * The design names seven. Five are readings here: how long trades are held, how
 * far out they are written, what share of the best mark winners actually land,
 * how long a loser stays open past its worst mark — the last two only since
 * the contract's own daily bars turned out to be available — and, since
 * 2026-09-26, the IV rank each trade was opened at (`utils/entryIvRank.ts`). A
 * sixth, the share of the credit kept, the fills answer outright.
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
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { daysBetween } from '@/lib/isoDate'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { useExecutionsAll } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { ProposalChainPanel } from './ProposalChainPanel'
import { THIN_SAMPLE } from '@/utils/reviewContracts'
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

/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

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
    pathsError,
    ivRanks,
    ivRankFailed,
    ivRankNames,
  } = useReviewHabits(accountFilter)
  // The same cache entry the hook reads — held here for its §17 state.
  const execQuery = useExecutionsAll()

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
  // worst of both. The IV-rank history is the shared hook's (one read, the
  // same one the Decision Inbox's IV-floor card argues from).
  const habits = useMemo(
    () => habitReadings(inWindow, paths, pathsLoading, ivRanks),
    [inWindow, paths, pathsLoading, ivRanks],
  )
  const measured = habits.filter((h) => h.value != null)
  const pending = habits.some((h) => h.measuring)
  const n = inWindow.length
  const gate =
    n === 0
      ? { lamp: 'gray' as const, title: 'No closed contract in this window', sub: 'Widen the window, or wait for a contract to close.' }
      : n < THIN_SAMPLE
        ? {
            lamp: 'yellow' as const,
            title: `Below the sample floor · n ${n} of ${THIN_SAMPLE}`,
            sub: 'Every reading below is the band rather than the point. A tendency read off this few contracts is a description of this few contracts.',
          }
        : {
            lamp: 'green' as const,
            title: `Above the sample floor · n ${n} of ${THIN_SAMPLE}`,
            sub: pending
              ? `Reading each contract's own daily bars over ${pathRequests} requests, one per underlying and expiry.`
              : `${measured.length} of the ${habits.length} tendencies have a reading; the rest name what they need. Paths read over ${pathRequests} requests, one per underlying and expiry. Each tendency reports its own n, which can sit under the floor on its own.`,
          }

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(execQuery)
  const windowOn = window !== 'all'

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the Queue and the proposals as the head's doors. */}
      <PageHead
        title="Habits"
        info={PAGE_LEAD}
        actions={
          <>
            <PageHeadLink to="/review" title="The closed contracts these are read from">
              ← Queue
            </PageHeadLink>
            <PageHeadLink to="/review/proposals" title="Rule proposals are decided in the Decision Inbox">
              Rule proposals →
            </PageHeadLink>
          </>
        }
      />

      <div data-sr-toolbar="">
        <span data-sr-tb="label">Window</span>
        <SegmentControl
          size="xs"
          ariaLabel="Window"
          value={window}
          onChange={setWindow}
          options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">Basis</span>
        <SegmentControl size="xs" ariaLabel="Basis" value="all" onChange={() => {}} options={BASES} />
        <DenseTag variant="warning" size="cell">
          no review or plan store
        </DenseTag>
        {accountIds.length > 1 ? (
          <>
            <span data-sr-tb="sep" />
            <span data-sr-tb="label">Account</span>
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          </>
        ) : null}
        <span data-sr-tb="meta" className={positionsUi.mono}>
          n <span className={n < THIN_SAMPLE ? 'text-warning' : 'text-foreground'}>{n}</span> / floor {THIN_SAMPLE}
        </span>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the closed book"
          detail={staleDetail(execQuery, 'a contract closed since then is not counted.')}
          onAction={() => void execQuery.refetch()}
        />
      ) : null}
      {pageState === 'ready' && pathsError != null ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read every contract’s daily bars"
          detail="The path habits — winner trimming and cut-loss latency — cover only the contracts whose bars arrived; the rest are unread, not unmoved."
        />
      ) : null}
      {pageState === 'ready' && ivRankFailed > 0 ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read some IV ranks"
          detail={`${ivRankFailed} of ${ivRankNames} names did not answer; their contracts are out of the IV-rank-at-entry sample.`}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the closed book" rows={6} cols={3} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the closed book"
            detail={failedDetail(execQuery, 'Nothing was measured — this is not a book with no habits.')}
            onAction={() => void execQuery.refetch()}
          />
        </section>
      ) : preview === 'filtered' || (preview !== 'empty' && n === 0 && windowOn) ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="filtered"
            detail="No contract closed inside this window."
            onAction={() => setWindow('all')}
          />
        </section>
      ) : preview === 'empty' || n === 0 ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="empty"
            title="No closed contract yet"
            detail="A habit is read over closed contracts — a contract reaches this page once its own fills have taken it flat."
          />
        </section>
      ) : (
        <>
          <section
            className={positionsUi.panel}
            style={n > 0 && n < THIN_SAMPLE ? WARN_EDGE : undefined}
            aria-label="Sample gate"
          >
            <div className="grid grid-cols-[0.875rem_minmax(0,1fr)] items-start gap-3 px-3 py-2.5">
              <span className="pt-1">
                <StatusLamp lamp={gate.lamp} variant="dot" title={gate.title} />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-dense-body font-semibold',
                    n > 0 && n < THIN_SAMPLE ? 'text-warning' : 'text-foreground',
                  )}
                >
                  {gate.title}
                </span>
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
                    dots are contracts · green earned, red lost
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

          {/* The chain that turns a habit into a rule change, and where it is
              broken. The proposals it feeds are decided in the Decision Inbox
              since Package 2026-09-23.1; what is still Habits' own is the reason
              some of them cannot be argued yet. */}
          <ProposalChainPanel habits={habits} trades={trades} paths={paths} pathsLoading={pathsLoading} />

          <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
            <span className="font-semibold text-secondary-foreground">Boundary.</span> A habit here is a reading, not a
            verdict. What it argues for is{' '}
            <Link to="/review/proposals" className={positionsUi.link}>
              Rule proposals
            </Link>
            &rsquo; subject, and nothing on either page changes a rule by itself.
          </p>
        </>
      )}
    </PageShell>
  )
}

function HabitRow({ habit }: { habit: HabitReading }) {
  const fmt = fmtFor(habit)
  const measuring = Boolean(habit.measuring)
  const thin = habit.value != null && habit.n < THIN_SAMPLE
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-start gap-x-4 gap-y-2 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              'text-dense-body font-semibold',
              habit.value == null ? 'text-muted-foreground' : thin ? 'text-[var(--sk-soft)]' : 'text-foreground',
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
          {/* n is a state: green over the floor, amber under it, grey unmeasured. */}
          <DenseTag variant={habit.value == null ? 'neutral' : thin ? 'warning' : 'state-green'} size="cell">
            n {measuring ? '…' : habit.n}
          </DenseTag>
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn(
              positionsUi.mono,
              'text-lg font-bold',
              habit.value == null ? 'text-muted-foreground' : thin ? 'text-muted-foreground' : 'text-foreground',
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
          <span className="text-dense-meta font-semibold text-muted-foreground">{habit.stat}</span>
        </div>
        <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
          {measuring ? 'Reading the history this habit is measured from…' : habit.read}
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
