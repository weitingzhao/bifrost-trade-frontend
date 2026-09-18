/**
 * Review · Rule proposals — what a habit argues for, before it becomes a rule.
 *
 * The chain the design draws is short and strict: a habit that has cost
 * something repeatedly becomes a proposal, a proposal that is accepted becomes
 * a change to a rule, and the change is then measured against the trades that
 * follow it. Every link needs the one before it.
 *
 * This page has no rows, and the reason is worth more than a row would be:
 * four of the seven habits cannot be measured at all here, the three that can
 * carry no cost figure — a cost is what the habit did against what the plan
 * would have produced — and nothing stores a proposal, its decision or its
 * outcome. A proposal generated from an unmeasured habit is a rule change
 * argued from nothing, which is worse than no proposal.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { useReviewHabits } from '@/hooks/useReviewHabits'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'

const PAGE_LEAD =
  'What the habits argue for, before any of it becomes a rule. A proposal needs a habit with a cost and a sample — and it needs somewhere to be accepted or refused.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The chain, and which link is missing. */
const CHAIN = [
  {
    key: 'habit',
    step: 'A habit',
    what: 'a behaviour repeated across enough trades to be a pattern rather than an anecdote',
    state: 'partial',
    note: 'Three of seven are measured here; the other four need a plan or a mark path.',
    to: '/review/habits',
  },
  {
    key: 'cost',
    step: 'Its cost',
    what: 'what the behaviour did to P&L against what the plan would have produced',
    state: 'missing',
    note: 'No plan is linked to a position, so the subtraction that turns a tendency into a cost cannot be made.',
    to: '/trade/plans',
  },
  {
    key: 'proposal',
    step: 'A proposal',
    what: 'a specific change to a specific rule, with the habit and its cost attached',
    state: 'missing',
    note: 'Nothing stores a proposal, so one written here would not survive the page being closed.',
    to: '/trade/plans',
  },
  {
    key: 'decision',
    step: 'Accepted or refused',
    what: 'a decision, dated, so the rule’s history says why it reads the way it does',
    state: 'missing',
    note: 'The Rules engine the design edits is not built on this side.',
    to: '/risk/limits',
  },
  {
    key: 'outcome',
    step: 'Measured after',
    what: 'the trades that followed the change, against the ones before it',
    state: 'missing',
    note: 'Needs the decision to be dated, so there is a before and an after to split on.',
    to: '/review/playbook-stats',
  },
] as const

export default function RuleProposalsPage() {
  const [accountFilter] = useState('all')
  const { trades, habits, loading, error, refetch } = useReviewHabits(accountFilter)
  const measurable = useMemo(() => habits.filter((h) => h.value != null).length, [habits])

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Rule proposals">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Rule proposals</p>}
          title="Rule proposals"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <DenseTag variant="warning" size="cell">
                ⚠ 0 proposals — and none can be generated
              </DenseTag>
              <Link to="/review/habits" className={positionsUi.link}>
                Habits →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <Skeleton className="h-48 w-full rounded-md" />
        ) : (
          <>
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Proposals">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Open proposals</span>
                <span className={positionsUi.panelTitle}>none</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {measurable} of {habits.length} habits measurable · {trades.length} closed trades behind them
                </span>
              </header>
              <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                A proposal is generated, not written by hand: a habit that has cost something repeatedly becomes an
                argument for changing a rule, and the argument carries the habit, its cost and its sample so the change
                can be judged rather than taken on faith. None of the three parts is available here — which is a
                different statement from &ldquo;no rule needs changing&rdquo;.
              </p>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.proposals}</p>
            </section>

            <PositionsTier label="The chain" note="each link needs the one before it — and where it breaks" />
            <section className={positionsUi.panel} aria-label="The chain">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  1 of {CHAIN.length} links is partly in place
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the break is at the second link, and everything after it follows
                </span>
              </header>
              {CHAIN.map((c) => (
                <div
                  key={c.key}
                  className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border/55 px-3 py-2 last:border-b-0"
                >
                  <span className="inline-flex items-start gap-1.5 text-xs leading-normal font-semibold text-foreground">
                    <StatusLamp
                      lamp={c.state === 'partial' ? 'yellow' : 'gray'}
                      variant="dot"
                      title={c.state === 'partial' ? 'Partly in place' : 'Missing'}
                      className="mt-1 shrink-0"
                    />
                    {c.step}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                      {c.what}
                    </span>
                    <span className="block text-dense-meta leading-normal text-secondary-foreground text-pretty">
                      {c.note}{' '}
                      <Link to={c.to} className={positionsUi.link}>
                        where it would come from →
                      </Link>
                    </span>
                  </span>
                </div>
              ))}
              <p className={cn(FOOT, 'm-0')}>
                One store closes most of this at once: a plan linked to the position gives the cost, and a cost is what
                turns three measured tendencies into arguments.
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> A proposal is never applied
              from here. It is an argument for a change a person makes in the rules, and the page that would hold those
              rules does not exist yet either.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
