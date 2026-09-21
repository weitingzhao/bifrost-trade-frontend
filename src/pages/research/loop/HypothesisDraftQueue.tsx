/**
 * Proposed by Copilot — the drafts waiting to become hypotheses.
 *
 * The design's own panel, and the rule it states in its header: a hypothesis
 * the machine proposes arrives as *the same card as every other write*. It
 * does not appear on the board until you accept it, which is the whole point
 * of the queue — the Book keeps beliefs, not suggestions.
 *
 * Two kinds feed it. `hypothesis_suggestion` is what the Copilot writes from
 * a note or a reading; `hypothesis_draft` is what an agent writes from a run.
 * Both land in the same queue and both are answered the same way, so they are
 * one list here rather than two panels saying the same thing.
 *
 * It renders only when something is waiting, as the design's own `sc-if`
 * does. On DEV the queue has been empty in every status since it was
 * measured, so the board's footer names it — a queue nobody can see is
 * indistinguishable from one that does not exist.
 */
import { DenseTag } from '@/components/data-display'
import { SectionPanel } from '@/components/layout'
import { useApproveDraft, useDismissDraft, useResearchDrafts } from '@/hooks/useResearchDrafts'
import type { AiDraft } from '@/api/researchDrafts'

function draftTitle(d: AiDraft): string {
  const p = (d.payload ?? {}) as Record<string, unknown>
  for (const k of ['title', 'hypothesis_title', 'thesis']) {
    const v = p[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return d.id
}

/** The design's second line: where it came from, what it cites, how it fails. */
function draftBody(d: AiDraft): string | null {
  const p = (d.payload ?? {}) as Record<string, unknown>
  const parts: string[] = []
  for (const [label, key] of [
    ['Origin', 'origin'],
    ['Evidence', 'evidence'],
    ['Falsifier', 'falsifier'],
    ['', 'rationale'],
    ['', 'thesis'],
  ] as const) {
    const v = p[key]
    if (typeof v === 'string' && v.trim()) parts.push(label ? `${label}: ${v.trim()}` : v.trim())
  }
  return parts.length ? parts.join(' ') : null
}

export function HypothesisDraftQueue() {
  const suggestions = useResearchDrafts({ status: 'pending', kind: 'hypothesis_suggestion' })
  const drafts = useResearchDrafts({ status: 'pending', kind: 'hypothesis_draft' })
  const approve = useApproveDraft()
  const dismiss = useDismissDraft()

  const rows = [...(suggestions.data?.rows ?? []), ...(drafts.data?.rows ?? [])]
  if (rows.length === 0) return null

  const busy = approve.isPending || dismiss.isPending
  return (
    <SectionPanel
      cap="Proposed by Copilot"
      tone="warning"
      title={`${rows.length} draft${rows.length === 1 ? '' : 's'} awaiting your call`}
      note="the hypothesis queue · the same card as every other write"
    >
      <div className="flex flex-col gap-3 px-3 py-3">
        {rows.map((d) => (
          <div key={d.id} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <DenseTag variant="warning" size="cell">
                draft
              </DenseTag>
              <span className="text-dense-body font-semibold">{draftTitle(d)}</span>
              <span className="font-mono text-dense-caption text-muted-foreground">
                {d.generated_by}
              </span>
            </div>
            {draftBody(d) ? (
              <p className="text-dense-meta leading-relaxed text-muted-foreground">
                {draftBody(d)}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => approve.mutate(d.id)}
                className="text-dense-meta text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                title="Accept — writes the hypothesis and takes the draft off the queue"
              >
                Accept → the board
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => dismiss.mutate(d.id)}
                className="text-dense-meta text-muted-foreground hover:text-destructive hover:underline disabled:text-muted-foreground/40 disabled:no-underline"
                title="Dismiss — the draft is kept as history, not deleted"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionPanel>
  )
}
