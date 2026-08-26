/**
 * Global Save-as-Hypothesis dialog host for Cockpit Actions (Wave RS-E1.4).
 * Opens when `saveHypothesisIntentStore.open(...)` is called.
 */
import { useMemo, useState } from 'react'
import { BookmarkPlus } from 'lucide-react'
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
import { useCreateHypothesis } from '@/hooks/useHypotheses'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import {
  saveHypothesisIntentStore,
  useSaveHypothesisIntent,
  type SaveHypothesisIntent,
} from '@/store/saveHypothesisIntentStore'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[80px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function SaveHypothesisForm({ intent }: { intent: SaveHypothesisIntent }) {
  const mutation = useCreateHypothesis()
  const submitting = mutation.isPending

  const initialSymbols = useMemo(
    () => (intent.defaultSymbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean).join(', '),
    [intent.defaultSymbols],
  )
  const initialTags = useMemo(
    () => (intent.defaultTags ?? []).map((t) => t.trim()).filter(Boolean).join(', '),
    [intent.defaultTags],
  )

  const [title, setTitle] = useState(intent.defaultTitle ?? '')
  const [thesis, setThesis] = useState(intent.defaultThesis ?? '')
  const [symbolsStr, setSymbolsStr] = useState(initialSymbols)
  const [tagsStr, setTagsStr] = useState(initialTags)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const symbolsArray = symbolsStr
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  const tagsArray = tagsStr
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const disabled = submitting || !title.trim() || !thesis.trim()

  async function submit() {
    setErrorMsg(null)
    if (!title.trim() || !thesis.trim()) return
    try {
      const created = await mutation.mutateAsync({
        title: title.trim(),
        thesis: thesis.trim(),
        symbols: symbolsArray,
        tags: tagsArray,
        origin_page: intent.originPage,
        origin_ref: intent.originRef ?? null,
      })
      cockpitPinStore.getState().pinHypothesis(created.id)
      saveHypothesisIntentStore.close()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
      <DialogHeader>
        <DialogTitle className="inline-flex items-center gap-2">
          <BookmarkPlus className="h-4 w-4" />
          Save as Hypothesis
        </DialogTitle>
        <DialogDescription>
          Persist the current Cockpit context as a research hypothesis.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="cockpit-hypothesis-title">Title</Label>
          <Input
            id="cockpit-hypothesis-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="NVDA earnings vol crush"
            autoFocus
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cockpit-hypothesis-thesis">Thesis</Label>
          <textarea
            id="cockpit-hypothesis-thesis"
            className={TEXTAREA_CLASS}
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="1–3 sentence rationale. Markdown ok."
            rows={3}
            disabled={submitting}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cockpit-hypothesis-symbols">Symbols</Label>
            <Input
              id="cockpit-hypothesis-symbols"
              value={symbolsStr}
              onChange={(e) => setSymbolsStr(e.target.value)}
              placeholder="NVDA, AMD"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cockpit-hypothesis-tags">Tags</Label>
            <Input
              id="cockpit-hypothesis-tags"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="earnings, vol"
              disabled={submitting}
            />
          </div>
        </div>
        {errorMsg && (
          <p className="text-dense-meta text-destructive" role="alert">
            {errorMsg}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => saveHypothesisIntentStore.close()}
        >
          Cancel
        </Button>
        <Button type="button" disabled={disabled} onClick={submit}>
          {submitting ? 'Saving…' : 'Save Hypothesis'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function CockpitSaveHypothesisHost() {
  const intent = useSaveHypothesisIntent()

  return (
    <Dialog
      open={intent.open}
      onOpenChange={(next) => {
        if (!next) saveHypothesisIntentStore.close()
      }}
    >
      {intent.open ? (
        <SaveHypothesisForm key={intent.nonce} intent={intent} />
      ) : null}
    </Dialog>
  )
}
