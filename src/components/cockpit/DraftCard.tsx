import { approveEffect, draftKindLabel, draftLinks, draftTitle } from '@/lib/harness/draftText'
import { Link } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DenseTag } from '@/components/data-display'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import {
  CandidateBatchBody,
  PolicySuggestionBody,
} from '@/components/research/harness'
import type { AiDraft } from '@/api/researchDrafts'
import { isHitRateWarnActive, isPersonaDissentActive } from '@/lib/harness/harnessDraftHelpers'
import { loopPipelinePath } from '@/lib/harness/loopCopilotPrefill'
import {
  draftJournalHref,
  draftParentId,
  draftThreadId,
} from '@/lib/research/draftProvenance'
import { DailyDigestBody } from '@/components/cockpit/DailyDigestBody'
import { DecisionDraftBody } from '@/components/research/harness/DecisionDraftBody'
import { cn } from '@/lib/utils'

/**
 * One neutral face for every kind (§7: classification is not colour — Design
 * 2026-09-13 ④). Kinds used to carry entity hues on the border and left rail
 * and the briefings a sky tint; the queue read apart by hue, but that put the
 * palette on a semantic slot it does not own. A kind now reads from its tag's
 * text. `muted` is the same face at lower weight, for a draft whose Approve
 * would write nothing — weight, not hue, carries that distinction. The card's
 * real states keep their colour: warn / dissent below, and the EOD verdict's
 * own status tag (active / validated / rejected).
 */
const ACCENT = {
  normal: 'border-border/60 border-l-border bg-secondary/40',
  muted: 'border-border/35 border-l-border/60 bg-transparent',
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
  // A playbook note's body. It arrived as `note_md`, which nothing here read, so
  // every note printed as its whole payload in JSON.
  if (typeof payload.note_md === 'string' && payload.note_md.trim()) {
    return payload.note_md
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
  read,
  onToggleRead,
  className,
}: {
  draft: AiDraft
  approving?: boolean
  dismissing?: boolean
  onApprove: () => void
  onDismiss: () => void
  /** Same hue, lower weight — for a draft whose Approve would write nothing. */
  muted?: boolean
  /** Marked read by this viewer. Briefings only; a decision is answered, not read. */
  read?: boolean
  /** Given, the card offers "Mark read" / undo. */
  onToggleRead?: () => void
  className?: string
}) {
  const busy = Boolean(approving || dismissing)
  const title = draftTitle(draft)
  const proposed =
    typeof draft.payload.proposed_status === 'string'
      ? draft.payload.proposed_status
      : null
  const parentId = draftParentId(draft)
  const threadId = draftThreadId(draft)
  const personaDiff =
    draft.kind === 'playbook_rule' && draft.payload.persona_diff
      ? (draft.payload.persona_diff as Record<string, unknown>)
      : null
  const agentOwner =
    typeof draft.payload.agent_owner === 'string' ? draft.payload.agent_owner : null

  const warnActive = draft.kind === 'candidate_batch' && isHitRateWarnActive(draft.payload)
  const dissentActive =
    draft.kind === 'candidate_batch' && isPersonaDissentActive(draft.payload)
  const prose = payloadProse(draft.payload)
  // What Approve writes, read from the server's branches and this payload — so
  // the button can name it, and a card whose Approve writes nothing says that.
  const effect = approveEffect(draft)
  // Where to check the card first. A link that is also Approve's destination is
  // already on the line below the buttons.
  const links = draftLinks(draft).filter((l) => l.to !== effect?.to)
  // A playbook entry is filed by the names and tags it carries; on the card they
  // say what it is about before the note does. Only these kinds: the EOD verdicts
  // carry symbols too, and a row of chips on each of a hundred posts is noise.
  const isPlaybook = draft.kind === 'playbook_note' || draft.kind === 'playbook_rule'
  const filedSymbols = isPlaybook && Array.isArray(draft.payload.symbols)
    ? draft.payload.symbols.filter((v): v is string => typeof v === 'string')
    : []
  const filedTags = isPlaybook && Array.isArray(draft.payload.tags)
    ? draft.payload.tags.filter((v): v is string => typeof v === 'string')
    : []
  const runId =
    typeof draft.payload.run_id === 'string' ? draft.payload.run_id : null
  // A digest needs reading, not a verdict (its own self-description). Its
  // Approve wrote nothing and the recorded answer had no reader, so the button
  // came off the card (Design 2026-09-13 ③ / 2026-09-14 ④). What remains is
  // Mark read (header) and Dismiss — leaving the queue is a server-side fact,
  // read state is not.
  const isDigest = draft.kind === 'daily_digest'

  return (
    <div
      className={cn(
        // The card sets its own base size. Without it everything that does not
        // name a size inherits the app default 16px — which is how the kind tag
        // came to render larger than the title it labels.
        'rounded-md border border-l-4 px-2.5 py-2 space-y-2 text-dense-meta',
        dissentActive
          ? 'border-destructive/50 border-l-destructive bg-destructive/5'
          : warnActive
            ? 'border-warning/50 border-l-warning bg-warning/5'
            : muted
              ? ACCENT.muted
              : ACCENT.normal,
        read ? 'opacity-70' : '',
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
        <DenseTag variant="category" size="cell">
          {draftKindLabel(draft.kind)}
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
        {onToggleRead ? (
          <button
            type="button"
            onClick={onToggleRead}
            aria-pressed={Boolean(read)}
            className="shrink-0 text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
            title={read ? 'Marked read in this browser — click to mark unread' : 'Mark read — kept in this browser only'}
          >
            {read ? 'Read · undo' : 'Mark read'}
          </button>
        ) : null}
      </div>

      {filedSymbols.length > 0 || filedTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {filedSymbols.map((sym) => (
            <DenseTag key={`s:${sym}`} variant="neutral" size="cell" className="font-mono">
              {sym}
            </DenseTag>
          ))}
          {filedTags.map((tag) => (
            <span key={`t:${tag}`} className="text-dense-micro text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {draft.kind === 'candidate_batch' ? (
        <CandidateBatchBody payload={draft.payload} />
      ) : draft.kind === 'daily_digest' ? (
        <DailyDigestBody payload={draft.payload} />
      ) : draft.kind === 'policy_suggestion' ? (
        <PolicySuggestionBody payload={draft.payload} />
      ) : draft.kind === 'decision_draft' ? (
        // Its rationale used to be the whole card: the verdict, the stop and
        // what would prove it wrong were in the payload and never shown.
        <DecisionDraftBody payload={draft.payload} />
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

      {/* The design closes a card with where it came from (Rev 2026-09-18.2):
          a merge proposal is only as good as what it was distilled from, and
          the reader should be one click away from it. */}
      <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border/40 pt-1.5 font-mono text-dense-micro text-muted-foreground">
        <span title="The artifact this draft is about — the same rule the Journal reads it by.">
          parent · {parentId ?? 'none recorded'}
        </span>
        <span
          title={
            threadId
              ? 'The Copilot thread this was distilled from.'
              : 'No thread: every draft here is written by an agent on a schedule. Nothing on this side distils a patch out of a Copilot thread yet, so the field stays empty rather than borrowing one.'
          }
        >
          thread · {threadId ?? 'not distilled from one'}
        </span>
        <Link
          to={draftJournalHref(draft.id)}
          className="ml-auto text-primary hover:underline"
          title="This draft as a node in the Journal, under what it came from"
        >
          Journal →
        </Link>
      </p>

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
        {isDigest ? null : (
          <Button
            type="button"
            size="sm"
            variant={muted ? 'outline' : 'default'}
            className="h-7 gap-1 text-dense-meta"
            disabled={busy}
            onClick={onApprove}
          >
            <Check className="size-3.5" />
            {approving ? 'Approving…' : effect ? `Approve → ${effect.label}` : 'Approve'}
          </Button>
        )}
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
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="text-dense-micro text-primary hover:underline">
            {l.label} →
          </Link>
        ))}
        {isDigest ? null : (
          <span className="min-w-0 text-dense-micro text-muted-foreground">
            {effect ? (
              <>
                Approve {effect.detail} —{' '}
                <Link to={effect.to} className="hover:underline">
                  {effect.label}
                </Link>
                {/* The design writes the negative half of every `writes`
                    string, and it is the half that matters under D10: a
                    reader answering a queue fast needs to know that none of
                    these answers can become an order. Worded as "never an
                    order" rather than the design's "nothing to Trade"
                    because a playbook entry does land under Trade — it is a
                    note, not an order, and the looser wording would be
                    false on exactly that kind. */}
                {' · never an order (D10)'}
              </>
            ) : (
              'Approve only records your answer — nothing is written'
            )}
          </span>
        )}
      </div>
    </div>
  )
}
