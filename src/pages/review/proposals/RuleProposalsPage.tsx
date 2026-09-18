/**
 * Review · Rule proposals — what a habit argues for, before it becomes a rule.
 *
 * The chain the design draws is short and strict: a habit that has cost
 * something repeatedly becomes a proposal, a proposal that is accepted becomes
 * a change to a rule, and the change is then measured against the trades that
 * follow it. Every link needs the one before it.
 *
 * One of the four now has its argument. The give-back on winners is measured
 * off each contract's daily marks and carries a cost in dollars, which is
 * exactly what a proposal needs; the other three are still waiting on a habit
 * or on the cost that a linked plan would supply.
 *
 * What none of them can be is a *diff*, and that is the link the design cares
 * about most: a diff subtracts from the rule's current text, and no rules store
 * exists on this side. So each card draws its `+` line and marks its `−`, and
 * the three decisions are drawn disabled rather than hidden — a page that omits
 * them reads as "nothing to decide", when the truth is that there is something
 * to decide and nowhere to record it.
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
import { ProposalCard } from './ProposalCard'
import { buildProposals, proposalChain } from './proposalsModel'

const PAGE_LEAD =
  'What the habits argue for, before any of it becomes a rule. A proposal needs a habit with a cost and a sample — and it needs somewhere to be accepted or refused.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function RuleProposalsPage() {
  const [accountFilter] = useState('all')
  const { trades, habits, paths, pathsLoading, loading, error, refetch } = useReviewHabits(accountFilter)
  const proposals = useMemo(() => buildProposals(habits, trades, paths), [habits, trades, paths])
  const chain = useMemo(() => proposalChain(habits, proposals), [habits, proposals])
  const argued = proposals.filter((p) => p.state === 'argued').length

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
              <DenseTag variant={argued > 0 ? 'success' : 'warning'} size="cell">
                {argued} of {proposals.length} argued · none can be written as a diff
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
            <div className="flex flex-col gap-2.5">
              {proposals.map((p) => (
                <ProposalCard key={p.key} proposal={p} />
              ))}
            </div>

            <PositionsTier label="The chain" note="each link needs the one before it — and where it breaks" />
            <section className={positionsUi.panel} aria-label="The chain">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {chain.filter((c) => c.state === 'partial').length} of {chain.length} links are partly in place
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the break is at the third link now, and everything after it follows
                </span>
              </header>
              {chain.map((c) => (
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
                {pathsLoading
                  ? 'Reading each contract’s daily marks — the link that says which habits carry a cost.'
                  : 'Two stores close the rest: a plan linked to a position turns the remaining tendencies into costs, and a rules store gives every diff its missing half.'}
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
