/**
 * Turning a knob on the trading system, next to the outcome it produced.
 *
 * The policy was readable and not adjustable — the model could propose a change
 * to the rules and the person who owns them could not. This is the smallest
 * control that closes that: click a value, type a new one, say why.
 *
 * It proposes rather than writes. The change lands in the Decision Inbox as a
 * policy_suggestion, exactly like a model-proposed one, so every change to the
 * rules leaves the same record. That is what makes rule drift readable: a sepa
 * cut falling from 3,431 to 1,204 means the market moved *or* that someone
 * lowered min_score, and without a record those are indistinguishable.
 *
 * Only whitelisted fields get an editor. A control for a field that would be
 * dropped at approval looks like a change and is not one — the failure the
 * "0 fields to merge" work exists to surface.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { isEditablePolicyField, proposePolicyChange } from '@/api/research/harness'
import { POLICY_FIELD_HELP } from '@/lib/harness/harnessDraftHelpers'
import { cn } from '@/lib/utils'

/**
 * Parse what was typed back into the shape the field had.
 *
 * A number field that silently becomes the string "12" would pass the whitelist,
 * fail schema validation at the API, and read as the editor being broken.
 * Objects are edited as JSON because `layers` is where the real trading style
 * lives and flattening it would leave only the shallow knobs adjustable.
 */
export function parsePolicyInput(
  raw: string,
  previous: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const text = raw.trim()
  if (text === '' || text === 'not set') return { ok: true, value: null }

  if (typeof previous === 'number') {
    const n = Number(text)
    if (!Number.isFinite(n)) return { ok: false, error: `${text} is not a number` }
    return { ok: true, value: n }
  }
  if (typeof previous === 'boolean') {
    if (/^(true|false)$/i.test(text)) return { ok: true, value: /^true$/i.test(text) }
    return { ok: false, error: 'expected true or false' }
  }
  if (previous !== null && typeof previous === 'object') {
    try {
      return { ok: true, value: JSON.parse(text) }
    } catch (e) {
      return { ok: false, error: `not valid JSON — ${(e as Error).message}` }
    }
  }
  // A previously-unset field has no type to follow; take a number when it reads
  // as one so `min_score` does not arrive as a string.
  if (previous == null && text !== '' && Number.isFinite(Number(text))) {
    return { ok: true, value: Number(text) }
  }
  return { ok: true, value: text }
}

export function PolicyKnobEditor({
  objectiveId,
  field,
  value,
  rendered,
  onDone,
}: {
  objectiveId: string
  field: string
  value: unknown
  /** How the value reads when not being edited. */
  rendered: string
  onDone?: () => void
}) {
  const editable = isEditablePolicyField(field)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [why, setWhy] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const propose = useMutation({
    mutationFn: (body: { suggestion: Record<string, unknown>; rationale: string }) =>
      proposePolicyChange(objectiveId, body.suggestion, body.rationale),
    onSuccess: () => {
      setOpen(false)
      setWhy('')
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.research.drafts })
      onDone?.()
    },
  })

  if (!editable) {
    return (
      <span
        className="font-medium text-muted-foreground/70"
        title="Not adjustable — approving a change to this field would drop it silently."
      >
        {rendered}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        className="group/knob inline-flex items-center gap-1 rounded px-0.5 font-medium hover:bg-secondary/70"
        onClick={() => {
          setDraft(
            value !== null && typeof value === 'object'
              ? JSON.stringify(value)
              : value == null
                ? ''
                : String(value),
          )
          setParseError(null)
          setOpen(true)
        }}
        title={POLICY_FIELD_HELP[field as keyof typeof POLICY_FIELD_HELP] ?? 'Propose a change'}
      >
        <span className={value == null ? 'text-muted-foreground/60' : undefined}>{rendered}</span>
        <Pencil className="size-2.5 shrink-0 opacity-0 transition-opacity group-hover/knob:opacity-60" />
      </button>
    )
  }

  const submit = () => {
    const parsed = parsePolicyInput(draft, value)
    if (!parsed.ok) {
      setParseError(parsed.error)
      return
    }
    setParseError(null)
    propose.mutate({ suggestion: { [field]: parsed.value }, rationale: why })
  }

  return (
    <span className="inline-flex w-full min-w-0 flex-col gap-1 rounded-md border border-border/60 bg-background p-1.5">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        className="h-6 w-full rounded border border-border bg-card px-1.5 font-mono text-dense-caption"
        aria-label={`New value for ${field}`}
      />
      {/* Asked for, not optional-looking: a change with no reason is why drift
          cannot be attributed later. */}
      <input
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        placeholder="Why this change?"
        className="h-6 w-full rounded border border-border bg-card px-1.5 text-dense-caption"
        aria-label={`Reason for changing ${field}`}
      />
      {parseError ? <span className="text-dense-caption text-destructive">{parseError}</span> : null}
      {propose.isError ? <QueryErrorAlert error={propose.error} /> : null}
      <span className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          className={cn('h-6 px-2 text-dense-caption')}
          disabled={propose.isPending}
          onClick={submit}
        >
          <Check className="mr-1 size-3" />
          {propose.isPending ? 'Proposing…' : 'Propose'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-dense-caption"
          onClick={() => setOpen(false)}
        >
          <X className="mr-1 size-3" />
          Cancel
        </Button>
        <span className="text-dense-caption text-muted-foreground/70">
          goes to the Inbox — nothing changes until you approve it
        </span>
      </span>
    </span>
  )
}
