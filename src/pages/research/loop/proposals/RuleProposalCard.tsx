/**
 * A rule proposal as an Inbox card (design Rev 2026-09-23.1).
 *
 * The merge is drawn rather than only ruled: a proposal is a `rule` kind in
 * the Decisions stream, with the same header, the same verbs and the same pair
 * of verdicts as every other decision. What is its own is the body — the
 * sentence diff on the left, and on the right the trades that argue it.
 *
 * Neither verdict can be taken. Approve would write the `+` line into Rules
 * and there is no rules store on this side; Dismiss would have to record that
 * the answer was no, and there is nowhere to record it either. The design asks
 * for Approve to be drawn disabled with the reason in the `writes` slot, and
 * the same reason retires Dismiss beside it — a button that answers nothing is
 * worse than one that says why.
 */
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DenseTag } from '@/components/data-display'
import { ArtifactVerbs } from '@/components/research/ArtifactVerbs'
import type { VerbKey } from '@/lib/harness/artifactVerbs'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtUsd } from '@/utils/positions'
import type { Proposal } from './proposalsModel'

/**
 * Design Rev 2026-09-22.9: a diff does not take a hue. The contrast is
 * lightness and weight — the before line muted, the after line ink at 600 —
 * and the −/+ glyphs recede into a fixed slot.
 */
const DIFF_LINE = 'grid grid-cols-[14px_minmax(0,1fr)]'
const DIFF_GLYPH = 'text-muted-foreground/50'

const RULE_VERBS_OFF: ReadonlySet<VerbKey> = new Set(['distill', 'settle'])

const NO_STORE = 'no rules store on this side, so neither verdict can be recorded'

export function RuleProposalCard({
  proposal,
  expanded,
  onToggle,
}: {
  proposal: Proposal
  expanded: boolean
  onToggle: () => void
}) {
  const p = proposal
  return (
    <div className="space-y-2 rounded-md border border-l-4 border-warning/50 border-l-warning bg-warning/5 px-2.5 py-2 text-dense-meta">
      {/* The header is the whole card when it is folded, so it carries what a
          reader needs to choose which one to open: kind, title, what it would
          change, and the size of the argument. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left"
        title={expanded ? 'Fold' : 'Open this card'}
      >
        <DenseTag variant="warning" size="cell">
          rule
        </DenseTag>
        <span className="min-w-0 truncate text-dense-label font-medium">{p.title}</span>
        <span className={cn(positionsUi.mono, 'text-dense-micro text-muted-foreground')}>
          review · habits · {p.target}
        </span>
        <span className="ml-auto shrink-0 text-dense-micro text-muted-foreground">
          {p.n == null ? 'n —' : `n ${p.n}`}
          {p.effect == null ? '' : ` · ${fmtUsd(p.effect, true)}`} {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <>
          <div className="grid gap-2.5 @2xl/page:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-1 border px-2.5 py-2 mat-card">
              <div className="flex items-baseline gap-2">
                <span className={positionsUi.cap}>Diff</span>
                <span className={cn(positionsUi.mono, 'text-dense-caption text-[var(--sk-layer-analysis)]')}>
                  → Rules › {p.target}
                </span>
              </div>
              <span
                className={cn(
                  positionsUi.mono,
                  DIFF_LINE,
                  'text-dense-meta leading-normal text-muted-foreground text-pretty',
                )}
              >
                <span className={DIFF_GLYPH}>−</span>
                <span>{p.beforeText}</span>
              </span>
              <span
                className={cn(
                  positionsUi.mono,
                  DIFF_LINE,
                  'text-dense-meta leading-normal font-semibold text-foreground text-pretty',
                )}
              >
                <span className={cn(DIFF_GLYPH, 'font-normal')}>+</span>
                <span>{p.after}</span>
              </span>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5 border px-2.5 py-2 mat-card">
              <span className={positionsUi.cap}>Evidence · the trades that argue it</span>
              <p className="m-0 text-dense-body leading-normal text-secondary-foreground text-pretty">
                {p.evidence}
              </p>
              {p.cites.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {p.cites.map((c) => (
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
              <div
                className={cn(
                  positionsUi.mono,
                  'mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border/60 pt-1.5 text-dense-caption text-muted-foreground',
                )}
              >
                <span>habit · {p.habitKey}</span>
                <span>n {p.n ?? '—'}</span>
                <span>{p.effect == null ? 'n/c' : fmtUsd(p.effect, true)}</span>
              </div>
            </div>
          </div>

          {/* Distill and Settle are off on every pending card (Rev 2026-09-22.7):
              Settle because it is in-period, Distill because a proposal already
              is one. */}
          <ArtifactVerbs artifact={`proposal ${p.key}`} off={RULE_VERBS_OFF} onVerb={() => {}} />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-dense-meta"
              disabled
              title={NO_STORE}
            >
              <Check className="size-3.5" />
              Approve → edit Rules
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-dense-meta"
              disabled
              title={NO_STORE}
            >
              <X className="size-3.5" />
              Dismiss
            </Button>
            <Link to="/review/habits" className="text-dense-micro text-primary hover:underline">
              Habits →
            </Link>
            <span className="min-w-0 text-dense-caption text-muted-foreground">
              Approve would write the + line into Rules › {p.target} — {NO_STORE}.
            </span>
          </div>
        </>
      ) : null}
    </div>
  )
}
