import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DenseTag } from '@/components/data-display'
import type { AiDraft } from '@/api/researchDrafts'
import { cn } from '@/lib/utils'

function kindLabel(kind: string): string {
  if (kind === 'morning_brief') return 'Morning'
  if (kind === 'eod_verdict') return 'EOD'
  if (kind === 'hypothesis_suggestion') return 'Suggestion'
  return kind
}

function payloadMarkdown(payload: Record<string, unknown>): string {
  if (typeof payload.markdown === 'string') return payload.markdown
  if (Array.isArray(payload.bullets)) {
    return (payload.bullets as unknown[])
      .map((b) => `- ${String(b)}`)
      .join('\n')
  }
  if (typeof payload.rationale === 'string') return payload.rationale
  return JSON.stringify(payload, null, 2)
}

export function DraftCard({
  draft,
  approving,
  dismissing,
  onApprove,
  onDismiss,
  className,
}: {
  draft: AiDraft
  approving?: boolean
  dismissing?: boolean
  onApprove: () => void
  onDismiss: () => void
  className?: string
}) {
  const busy = Boolean(approving || dismissing)
  const title =
    (typeof draft.payload.hypothesis_title === 'string' && draft.payload.hypothesis_title) ||
    (draft.scope === 'global' ? "Today's Discoveries" : draft.scope)
  const proposed =
    typeof draft.payload.proposed_status === 'string'
      ? draft.payload.proposed_status
      : null
  const body = payloadMarkdown(draft.payload)

  return (
    <div
      className={cn(
        'rounded-md border border-border/60 bg-secondary/40 px-2.5 py-2 space-y-2',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <DenseTag variant="category" size="cell">
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
          </div>
          <p className="text-dense-label font-medium truncate">{title}</p>
          <p className="text-dense-micro text-muted-foreground">
            {draft.generated_by} · {new Date(draft.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <pre className="whitespace-pre-wrap break-words text-dense-meta text-foreground/90 font-sans max-h-40 overflow-y-auto">
        {body}
      </pre>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
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
