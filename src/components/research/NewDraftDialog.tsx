import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateResearchDraft } from '@/hooks/useResearchDrafts'
import type { CreateResearchDraftBody, ManualDraftKind } from '@/api/researchDrafts'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[90px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const KIND_OPTIONS: { value: ManualDraftKind; label: string; hint: string }[] = [
  {
    value: 'hypothesis_suggestion',
    label: 'Hypothesis suggestion',
    hint: 'Proposes a new hypothesis. Approve → creates hypothesis if payload has title/thesis.',
  },
  {
    value: 'morning_brief',
    label: 'Morning brief (note)',
    hint: 'Note-only by default; will not auto-create hypothesis.',
  },
  {
    value: 'eod_verdict',
    label: 'EOD verdict',
    hint: 'Attach hypothesis_id to update its status/conclusion on approve.',
  },
]

function parseSymbols(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export function NewDraftDialog() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ManualDraftKind>('hypothesis_suggestion')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [hypothesisId, setHypothesisId] = useState('')
  const [symbolsStr, setSymbolsStr] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reset = useCallback(() => {
    setKind('hypothesis_suggestion')
    setTitle('')
    setSummary('')
    setHypothesisId('')
    setSymbolsStr('')
    setErrorMsg(null)
  }, [])

  const mutation = useCreateResearchDraft()
  const submitting = mutation.isPending

  const submit = () => {
    setErrorMsg(null)
    const body: CreateResearchDraftBody = {
      kind,
      title: title.trim(),
      summary: summary.trim(),
    }
    const hid = hypothesisId.trim()
    if (hid) body.hypothesis_id = hid
    const syms = parseSymbols(symbolsStr)
    if (syms.length) body.symbols = syms

    mutation.mutate(body, {
      onSuccess: () => {
        setOpen(false)
        reset()
      },
      onError: (err) => {
        setErrorMsg(err instanceof Error ? err.message : String(err))
      },
    })
  }

  const canSubmit = title.trim().length > 0 && summary.trim().length > 0 && !submitting
  const kindHint = KIND_OPTIONS.find((k) => k.value === kind)?.hint

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-dense-meta"
      >
        <Plus className="mr-1 size-3" />
        New Draft
      </Button>

      <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : setOpen(next))}>
        <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
          <DialogHeader>
            <DialogTitle>New Decision Draft</DialogTitle>
            <DialogDescription>
              Owner-manual entry into the Decision Inbox. Approving here will apply the same
              mutations as agent-generated drafts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="draft-kind">Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as ManualDraftKind)}
                disabled={submitting}
              >
                <SelectTrigger id="draft-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {kindHint ? (
                <p className="text-dense-caption text-muted-foreground">{kindHint}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="draft-title">Title</Label>
              <Input
                id="draft-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="NVDA earnings straddle sell"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="draft-summary">Summary / Thesis</Label>
              <textarea
                id="draft-summary"
                className={TEXTAREA_CLASS}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Rationale, sizing, invalidation. Markdown ok."
                rows={4}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="draft-hyp">Hypothesis id (optional)</Label>
                <Input
                  id="draft-hyp"
                  value={hypothesisId}
                  onChange={(e) => setHypothesisId(e.target.value)}
                  placeholder="hyp_abc123"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="draft-symbols">Symbols (optional)</Label>
                <Input
                  id="draft-symbols"
                  value={symbolsStr}
                  onChange={(e) => setSymbolsStr(e.target.value)}
                  placeholder="NVDA, AMD"
                  disabled={submitting}
                />
              </div>
            </div>

            {errorMsg ? (
              <p className="text-dense-meta text-destructive" role="alert">
                {errorMsg}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={submit}>
              {submitting ? 'Creating…' : 'Create draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
