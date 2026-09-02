import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import {
  CandidateBatchBody,
  PolicySuggestionBody,
} from '@/components/research/harness'
import type { AiDraft } from '@/api/researchDrafts'
import { isHitRateWarnActive } from '@/lib/harness/harnessDraftHelpers'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import { cn } from '@/lib/utils'

/**
 * Colour a draft by what kind of call it is.
 *
 * Every kind used to render the same purple tag on the same grey card, so a
 * queue of eleven read as one wall — you had to parse the label text to tell a
 * candidate batch from a policy change. The hue is carried by the left rail,
 * the border and the kind tag together, so the start of each decision is
 * unmistakable at a glance. Tokens only — no new palette.
 *
 * `muted` is the same hue at lower weight, for a draft whose Approve would
 * write nothing: still legible, no longer competing.
 */
const KIND_ACCENT: Record<
  string,
  { normal: string; muted: string; tag: DenseTagVariant }
> = {
  candidate_batch: {
    normal: 'border-entity-category/45 border-l-entity-category bg-entity-category/[0.07]',
    muted: 'border-entity-category/25 border-l-entity-category/50 bg-entity-category/[0.03]',
    tag: 'category',
  },
  policy_suggestion: {
    normal: 'border-entity-instance/45 border-l-entity-instance bg-entity-instance/[0.07]',
    muted: 'border-entity-instance/25 border-l-entity-instance/50 bg-entity-instance/[0.03]',
    tag: 'instance',
  },
  hypothesis_suggestion: {
    normal: 'border-entity-strategy/45 border-l-entity-strategy bg-entity-strategy/[0.07]',
    muted: 'border-entity-strategy/25 border-l-entity-strategy/50 bg-entity-strategy/[0.03]',
    tag: 'strategy',
  },
  // Recurring posts stay quieter than decisions on purpose — they need reading,
  // not a call. They still need telling apart: on the Briefings tab thirteen of
  // them in one grey ran together. Morning takes the calm hue; the EOD verdict
  // stays neutral because its own status tag (active / validated / rejected)
  // already carries a colour, and two competing hues on one card read as noise.
  morning_brief: {
    normal: 'border-sky-500/35 border-l-sky-500/70 bg-sky-500/[0.05]',
    muted: 'border-sky-500/20 border-l-sky-500/40 bg-sky-500/[0.02]',
    tag: 'info',
  },
  eod_verdict: {
    normal: 'border-border/60 border-l-border bg-secondary/40',
    muted: 'border-border/40 border-l-border/70 bg-transparent',
    tag: 'neutral',
  },
}

const DEFAULT_ACCENT = {
  normal: 'border-border/60 border-l-border bg-secondary/40',
  muted: 'border-border/35 border-l-border/60 bg-transparent',
  tag: 'category' as DenseTagVariant,
}

function kindLabel(kind: string): string {
  if (kind === 'morning_brief') return 'Morning'
  if (kind === 'eod_verdict') return 'EOD'
  if (kind === 'hypothesis_suggestion') return 'Suggestion'
  if (kind === 'candidate_batch') return 'Candidate Batch'
  if (kind === 'policy_suggestion') return 'Policy Suggestion'
  return kind
}

/**
 * The draft's prose, or null when the payload carries none.
 *
 * Returning null rather than a JSON dump keeps the two cases apart: prose goes
 * through the markdown renderer, an unmodelled payload stays a readable blob.
 */
function payloadProse(payload: Record<string, unknown>): string | null {
  if (typeof payload.markdown === 'string' && payload.markdown.trim()) {
    return payload.markdown
  }
  if (Array.isArray(payload.bullets) && payload.bullets.length > 0) {
    return (payload.bullets as unknown[]).map((b) => `- ${String(b)}`).join('\n')
  }
  if (typeof payload.rationale === 'string' && payload.rationale.trim()) {
    return payload.rationale
  }
  return null
}

export function DraftCard({
  draft,
  approving,
  dismissing,
  onApprove,
  onDismiss,
  muted,
  className,
}: {
  draft: AiDraft
  approving?: boolean
  dismissing?: boolean
  onApprove: () => void
  onDismiss: () => void
  /** Same hue, lower weight — for a draft whose Approve would write nothing. */
  muted?: boolean
  className?: string
}) {
  const busy = Boolean(approving || dismissing)
  const title =
    (typeof draft.payload.title === 'string' && draft.payload.title) ||
    (typeof draft.payload.hypothesis_title === 'string' && draft.payload.hypothesis_title) ||
    (draft.scope === 'global' ? "Today's Discoveries" : draft.scope)
  const proposed =
    typeof draft.payload.proposed_status === 'string'
      ? draft.payload.proposed_status
      : null
  const personaDiff =
    draft.kind === 'playbook_rule' && draft.payload.persona_diff
      ? (draft.payload.persona_diff as Record<string, unknown>)
      : null
  const agentOwner =
    typeof draft.payload.agent_owner === 'string' ? draft.payload.agent_owner : null

  const warnActive = draft.kind === 'candidate_batch' && isHitRateWarnActive(draft.payload)
  const accent = KIND_ACCENT[draft.kind] ?? DEFAULT_ACCENT
  const prose = payloadProse(draft.payload)
  const runId =
    typeof draft.payload.run_id === 'string' ? draft.payload.run_id : null

  return (
    <div
      className={cn(
        // The card sets its own base size. Without it everything that does not
        // name a size inherits the app default 16px — which is how the kind tag
        // came to render larger than the title it labels.
        'rounded-md border border-l-4 px-2.5 py-2 space-y-2 text-dense-meta',
        warnActive
          ? 'border-warning/50 border-l-warning bg-warning/5'
          : muted
            ? accent.muted
            : accent.normal,
        className,
      )}
    >
      {/*
        One header line, not three stacked blocks. Kind, title and provenance
        used to sit on separate rows above a description and two more rows of
        tags — six blocks before any content, in five type sizes. Kind and title
        read left, provenance sits right where it stops competing.
      */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <DenseTag variant={accent.tag} size="cell">
          {kindLabel(draft.kind)}
        </DenseTag>
        {proposed ? (
          <DenseTag
            variant={
              proposed === 'validated'
                ? 'success'
                : proposed === 'rejected'
                  ? 'danger'
                  : 'warning'
            }
            size="cell"
          >
            → {proposed}
          </DenseTag>
        ) : null}
        <span className="min-w-0 truncate text-dense-label font-medium">{title}</span>
        <span className="ml-auto shrink-0 text-dense-micro text-muted-foreground">
          {draft.generated_by} · {new Date(draft.created_at).toLocaleString()}
          {runId ? (
            <>
              {' · '}
              <Link
                to={loopPipelinePath(runId)}
                className="text-primary hover:underline"
              >
                Pipeline
              </Link>
            </>
          ) : null}
        </span>
      </div>

      {draft.kind === 'candidate_batch' ? (
        <CandidateBatchBody payload={draft.payload} />
      ) : draft.kind === 'policy_suggestion' ? (
        <PolicySuggestionBody payload={draft.payload} />
      ) : prose !== null ? (
        // Briefings arrive as markdown and were dumped raw, so `**PAYS pivot —
        // SEPA A**` and `## Today's Discoveries` rendered with their syntax
        // showing. react-markdown is already a dependency and MarkdownContent
        // already styles it for dense surfaces — this was a primitive not
        // reused, not a capability missing.
        <div className="max-w-prose max-h-60 overflow-y-auto">
          <MarkdownContent className="text-foreground/90">{prose}</MarkdownContent>
        </div>
      ) : (
        <pre className="max-w-prose max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-dense-micro text-muted-foreground">
          {JSON.stringify(draft.payload, null, 2)}
        </pre>
      )}

      {personaDiff && Object.keys(personaDiff).length > 0 ? (
        <p className="text-dense-meta text-warning">
          Also updates {agentOwner ?? 'agent'} persona:{' '}
          {Object.entries(personaDiff)
            .map(([k, v]) => `${k} → ${String(v)}`)
            .join('; ')}
        </p>
      ) : null}

      <div className="flex items-center gap-1.5">
        {/*
          On a muted draft Approve writes nothing, so it stops being the primary
          button. A full-strength green control was the loudest thing on a card
          whose own footer says approving it changes no field — exactly the
          mismatch that teaches you to clear the queue without reading.
        */}
        <Button
          type="button"
          size="sm"
          variant={muted ? 'outline' : 'default'}
          className="h-7 gap-1 text-dense-meta"
          disabled={busy}
          onClick={onApprove}
        >
          <Check className="size-3.5" />
          {approving ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-dense-meta"
          disabled={busy}
          onClick={onDismiss}
        >
          <X className="size-3.5" />
          {dismissing ? 'Dismissing…' : 'Dismiss'}
        </Button>
      </div>
    </div>
  )
}
