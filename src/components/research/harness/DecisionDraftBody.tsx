/**
 * A decision draft: the curator's call on one hypothesis — verdict, the levels
 * it rests on, what would prove it wrong, how it would be sized.
 *
 * Advisory. The server passes this kind through (`apply_draft_approval`'s
 * `else`): Approve records the call and writes nothing, and nothing here is an
 * order (D10). The sizing text mentions NetLiq because the curator reasons in
 * it, not because anything will act on it.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { decisionDraftView } from '@/lib/harness/decisionDraft'
import { cn } from '@/lib/utils'

export function DecisionDraftBody({ payload }: { payload: Record<string, unknown> }) {
  const v = decisionDraftView(payload)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-muted-foreground">Verdict</span>
        <DenseTag variant="neutral" size="cell" className="font-semibold">
          {v.verdict ?? 'none given'}
        </DenseTag>
        {v.hypothesisId ? (
          <span className="min-w-0 text-dense-micro text-muted-foreground">
            on{' '}
            <Link
              to="/research/loop/hypotheses"
              className="font-mono hover:underline"
              title="The Hypothesis Board cannot open one entry by link yet — find this id there"
            >
              {v.hypothesisId}
            </Link>
          </span>
        ) : null}
        <span className="ml-auto text-dense-micro text-muted-foreground">
          Advisory — Approve records your call; nothing is written or placed (D10)
        </span>
      </div>

      {v.levels.length > 0 ? (
        <p className="font-mono text-dense-meta tabular-nums">
          {v.levels.map((l, i) => (
            <span key={`${l.label}-${i}`}>
              {i > 0 ? <span className="text-muted-foreground"> · </span> : null}
              <span className="text-muted-foreground">{l.label}</span> {l.value}
            </span>
          ))}
        </p>
      ) : null}

      {v.invalidation.length > 0 || v.caveats.length > 0 ? (
        // Two columns only when both are there. Measured on DEV 2026-09-22:
        // four of the six pending decision drafts carry invalidation and no
        // caveats, and the other two carry neither — so the pair has never once
        // filled this grid, and every card that drew it wrapped a half-width
        // list beside an empty half.
        <div
          className={cn(
            'grid gap-x-6 gap-y-2',
            v.invalidation.length > 0 && v.caveats.length > 0 ? 'md:grid-cols-2' : '',
          )}
        >
          {v.invalidation.length > 0 ? (
            <div>
              <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Wrong if</div>
              <ul className="list-disc space-y-0.5 pl-4">
                {v.invalidation.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {v.caveats.length > 0 ? (
            <div>
              <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Caveats</div>
              <ul className="list-disc space-y-0.5 pl-4 text-foreground/85">
                {v.caveats.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {v.sizingHeadline || v.sizing.length > 0 ? (
        <div className="space-y-0.5">
          <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">Sizing, if it were taken</div>
          {v.sizingHeadline ? <p className="font-medium">{v.sizingHeadline}</p> : null}
          {v.sizing.map((l) => (
            <p key={l.label}>
              <span className="text-muted-foreground">{l.label}:</span> {l.value}
            </p>
          ))}
        </div>
      ) : null}

      {v.riskOther.length > 0 ? (
        <div className="space-y-0.5">
          {v.riskOther.map((l) => (
            <p key={l.label}>
              <span className="text-muted-foreground">{l.label}:</span> {l.value}
            </p>
          ))}
        </div>
      ) : null}

      {v.rationale ? (
        <p className="max-h-40 max-w-prose overflow-y-auto whitespace-pre-line text-foreground/85">{v.rationale}</p>
      ) : null}
    </div>
  )
}
