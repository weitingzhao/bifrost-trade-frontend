/**
 * Copilot's verdicts back on the page — research-loop-automation D4.
 *
 * One row under the regime row on every hub: what the leash decided about the
 * symbol (the digest's lens line lives in the regime row), and the chat-side proposals folded into
 * one line — how many of each kind, how many still wait on a decision, what
 * happened last — with every proposal chip behind a disclosure. Renders
 * nothing when nobody has said anything.
 */
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Sparkles } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useSymbolVerdicts } from '@/hooks/useSymbolVerdicts'
import {
  decisionChips,
  proposalChips,
  verdictSummary,
  type VerdictChip,
} from '@/lib/symbolVerdicts'
import { cn } from '@/lib/utils'

function Chip({ chip }: { chip: VerdictChip }) {
  if (!chip.to) {
    return (
      <DenseTag variant={chip.tone} size="cell" title={chip.title}>
        {chip.label}
      </DenseTag>
    )
  }
  return (
    <Link to={chip.to} title={chip.title} className="no-underline">
      <DenseTag variant={chip.tone} size="cell">
        {chip.label}
      </DenseTag>
    </Link>
  )
}

export function CopilotVerdictStrip({
  originPage,
  originLabel,
}: {
  originPage: string
  originLabel: string
}) {
  const { symbol } = useResearchContext()
  const q = useSymbolVerdicts(symbol)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const decisions = decisionChips(q.data)
  const proposals = proposalChips(q.data)
  const summary = verdictSummary(q.data)
  if (!symbol || (decisions.length === 0 && proposals.length === 0)) return null
  const digest = q.data?.digest
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5"
      role="status"
      data-testid="copilot-verdict-strip"
    >
      <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        Copilot on {symbol}
      </span>
      {digest?.day ? (
        <span className="text-dense-micro text-muted-foreground">digest {digest.day}</span>
      ) : null}
      {decisions.map((c) => (
        <Chip key={c.key} chip={c} />
      ))}
      {summary.total > 0 ? (
        <>
          <span className="text-dense-meta text-foreground">{summary.parts.join(' · ')}</span>
          {summary.last ? (
            <span className="text-dense-micro text-muted-foreground">
              last{' '}
              <Link to={summary.last.to} className="hover:text-foreground">
                {summary.last.label}
                {summary.last.day ? ` · ${summary.last.day}` : ''}
              </Link>
            </span>
          ) : null}
          {summary.waiting > 0 ? (
            <Link
              to="/research/loop/decisions"
              className="no-underline"
              title="Proposals still waiting on a decision"
            >
              <DenseTag variant="warning" size="cell">
                {summary.waiting} waiting
              </DenseTag>
            </Link>
          ) : null}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 text-dense-micro text-muted-foreground hover:text-foreground"
          >
            {summary.total} {summary.total === 1 ? 'proposal' : 'proposals'}
            <ChevronDown
              className={cn('size-3 transition-transform', open && 'rotate-180')}
              aria-hidden
            />
          </button>
        </>
      ) : null}
      <span className="ml-auto">
        <AskCopilotButton
          originPage={originPage}
          originLabel={originLabel}
          symbol={symbol}
          size="dense"
          snapshot={compactSnapshot({
            digest_line: digest?.line,
            digest_day: digest?.day,
            proposals: summary.parts,
            waiting: summary.waiting,
            last: summary.last?.label,
          })}
          suggestedPrompt={`What has the Loop and the Copilot concluded about ${symbol} so far, and what is still waiting for a decision? Cite the digest and the proposals.`}
        />
      </span>
      {open && summary.total > 0 ? (
        <div
          id={listId}
          className="flex basis-full flex-wrap items-center gap-1.5 pt-1"
          data-testid="copilot-verdict-proposals"
        >
          {proposals.map((c) => (
            <Chip key={c.key} chip={c} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
