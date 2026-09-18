/**
 * One proposal, in the design's shape: evidence on the left, the diff on the
 * right, the three decisions along the bottom.
 *
 * The diff's `−` line is marked on every card. It is not a formality — a diff
 * subtracts from the rule's current text, and there is no rules store here, so
 * a "before" line would be arguing against a rule nobody wrote.
 *
 * The three buttons are drawn and disabled rather than hidden. A page that
 * simply omits them reads as "there is nothing to decide"; the truth is that
 * there is something to decide and nowhere to record the decision.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import type { Proposal, ProposalState } from './proposalsModel'

const STATE_TAG: Record<ProposalState, { variant: 'success' | 'warning' | 'neutral'; label: string }> = {
  argued: { variant: 'success', label: 'argued' },
  'no-cost': { variant: 'warning', label: 'no cost' },
  'no-habit': { variant: 'neutral', label: 'no habit' },
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const tag = STATE_TAG[proposal.state]
  return (
    <section
      className={cn(positionsUi.panel, proposal.state === 'argued' ? 'border-success/40' : 'border-border')}
      aria-label={proposal.title}
    >
      <header className={positionsUi.panelHead}>
        <DenseTag variant={tag.variant} size="cell">
          {tag.label}
        </DenseTag>
        <span className={positionsUi.panelTitle}>{proposal.title}</span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{proposal.target}</span>
        <span className="ml-auto flex items-center gap-2.5">
          <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
            n {proposal.n ?? '—'}
          </span>
          <span
            className={cn(
              positionsUi.mono,
              'text-dense-body font-semibold',
              proposal.effect == null ? 'text-muted-foreground' : pnlColorClass(proposal.effect),
            )}
          >
            {proposal.effect == null ? 'n/c' : fmtUsd(proposal.effect, true)}
          </span>
        </span>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="m-0 text-dense-body leading-normal text-secondary-foreground text-pretty">
            {proposal.evidence}
          </p>
          {proposal.cites.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {proposal.cites.map((c) => (
                <Link
                  key={c.contractKey}
                  to={`/review/fit?trade=${encodeURIComponent(c.contractKey)}`}
                  className={cn(positionsUi.btn, positionsUi.mono)}
                  title={`${c.label} · ${fmtUsd(c.amount, true)}`}
                >
                  {c.label}
                </Link>
              ))}
            </div>
          ) : null}
          {proposal.blockedBy ? (
            <p className="m-0 inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="pt-1">
                <StatusLamp lamp="gray" variant="dot" title="Waiting on" />
              </span>
              <span>Waiting on {proposal.blockedBy}.</span>
            </p>
          ) : null}
        </div>

        <div className="min-w-0 overflow-hidden rounded-md border border-border bg-[var(--sk-raised2)]">
          <div className="border-b border-border px-2.5 py-1">
            <span className={cn(positionsUi.cap, 'tracking-[0.07em]')}>Diff · {proposal.target}</span>
          </div>
          <div className="flex flex-col gap-1 px-2.5 py-1.75">
            <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-muted-foreground text-pretty')}>
              − n/c — needs {proposal.beforeMissing}
            </span>
            <span className={cn(positionsUi.mono, 'text-dense-meta leading-normal text-success text-pretty')}>
              + {proposal.after}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
        {['Accept into Rules', 'Defer — need more n', 'Reject'].map((label) => (
          <button key={label} type="button" disabled className={cn(positionsUi.btn, 'cursor-not-allowed opacity-50')}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-dense-meta text-muted-foreground">
          nothing stores a decision, so none of the three can be taken
        </span>
      </div>
    </section>
  )
}
