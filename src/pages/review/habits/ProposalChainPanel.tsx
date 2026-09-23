/**
 * Where the habit → cost → proposal chain breaks.
 *
 * It was the foot of the Rule proposals page. Package 2026-09-23.1 moved the
 * proposals themselves into the Decision Inbox as `rule` cards and ruled that
 * this panel does not follow them: a broken link is not a decision anyone can
 * take, it is a fact about what the habits can still argue — which is this
 * page's subject. So it lands here rather than being deleted with the page it
 * used to sit on.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { positionsUi } from '@/components/positions/positionsUi'
import { buildProposals, proposalChain } from '@/pages/research/loop/proposals/proposalsModel'
import type { HabitReading } from '@/utils/reviewHabits'
import type { ReviewTrade } from '@/utils/reviewTrades'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export function ProposalChainPanel({
  habits,
  trades,
  paths,
  pathsLoading,
}: {
  habits: readonly HabitReading[]
  trades: readonly ReviewTrade[]
  paths: Map<string, { best: number }>
  pathsLoading: boolean
}) {
  const chain = proposalChain(habits, buildProposals(habits, trades, paths))
  return (
    <>
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
    </>
  )
}
