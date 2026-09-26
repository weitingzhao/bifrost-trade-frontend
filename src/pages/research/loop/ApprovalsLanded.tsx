/**
 * Where approvals land — the design's aside on the Decision Inbox.
 *
 * It exists to answer one question the page had stopped answering: where does
 * the thing I just approved *go*. The page's old narrative said the Desk, and
 * that narrative is retired — approving accepts research into The Book, and
 * nothing on this page reaches Trade (D10). So the sentence with no approvals
 * behind it is not filler; it is the claim, and it is the half a reader is
 * most likely to need.
 *
 * Why an accumulating list rather than the six-second `ApprovedStrip`: the
 * strip answers "did that work" and then leaves, which is right where there is
 * nowhere to put a list (the Desk, the cockpit banner). Here there is a rail,
 * and a session's worth of "this is what you let through" is worth more than
 * the same fact shown once and withdrawn. Neither carries an Undo — the server
 * cannot take an approval back (Design 2026-09-13 ⑥).
 */
import { Link } from 'react-router-dom'
import { approvedStripLine, type ApprovedDraftResult } from '@/components/cockpit/ApprovedStrip'

export interface LandedApproval {
  id: string
  text: string
  viewTo: string | null
}

/** One approval as a row. The wording is the strip's, so the two cannot disagree. */
export function landedApproval(result: ApprovedDraftResult): LandedApproval {
  const line = approvedStripLine(result.draft, result.executed)
  return { id: result.draft.id, text: line.text.replace(/^Approved → /, ''), viewTo: line.viewTo }
}

export function ApprovalsLanded({ landed }: { landed: readonly LandedApproval[] }) {
  return (
    <aside className="space-y-2 border px-3 py-2.5 text-dense-meta mat-card">
      <div className="flex items-baseline gap-2">
        <h2 className="text-dense-meta font-semibold text-muted-foreground">
          Where approvals land
        </h2>
        <span className="text-dense-body font-semibold">The Book</span>
      </div>

      {landed.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing accepted yet this session. Approve a candidate batch or a hypothesis and it appears
          here — and in the Pool or on the Hypothesis Board. Never on the Desk: accepting opens
          research, not an order.
        </p>
      ) : (
        <ul className="space-y-1">
          {landed.map((l) => (
            <li key={l.id} className="flex items-start gap-2">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
              <span className="min-w-0">
                {l.text}
                {l.viewTo ? (
                  <>
                    {' · '}
                    <Link to={l.viewTo} className="text-primary hover:underline">
                      view
                    </Link>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link to="/research/loop/hypotheses" className="inline-block text-primary hover:underline">
        Open The Book →
      </Link>
    </aside>
  )
}
