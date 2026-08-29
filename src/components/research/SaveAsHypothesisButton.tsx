import { useCallback, useMemo, useState } from 'react'
import { BookmarkPlus, CheckCircle2 } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
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
import { cn } from '@/lib/utils'
import { useCreateHypothesis } from '@/hooks/useHypotheses'
import type { Hypothesis } from '@/api/researchHypothesis'
import { cockpitPinStore } from '@/store/cockpitPinStore'
import { PromoteToWatchlistButton } from '@/components/research/PromoteToWatchlistButton'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[80px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

interface SaveAsHypothesisButtonProps {
  originPage: string
  defaultTitle?: string
  defaultThesis?: string
  defaultSymbols?: string[]
  defaultTags?: string[]
  originRef?: Record<string, unknown>
  size?: 'dense' | 'button'
  onSaved?: (h: Hypothesis) => void
  className?: string
}

export function SaveAsHypothesisButton({
  originPage,
  defaultTitle,
  defaultThesis,
  defaultSymbols,
  defaultTags,
  originRef,
  size = 'dense',
  onSaved,
  className,
}: SaveAsHypothesisButtonProps) {
  const mutation = useCreateHypothesis()
  const submitting = mutation.isPending

  const initialSymbols = useMemo(
    () => (defaultSymbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean).join(', '),
    [defaultSymbols],
  )
  const initialTags = useMemo(
    () => (defaultTags ?? []).map((t) => t.trim()).filter(Boolean).join(', '),
    [defaultTags],
  )

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(defaultTitle ?? '')
  const [thesis, setThesis] = useState(defaultThesis ?? '')
  const [symbolsStr, setSymbolsStr] = useState(initialSymbols)
  const [tagsStr, setTagsStr] = useState(initialTags)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [lastSaved, setLastSaved] = useState<Hypothesis | null>(null)

  const openDialog = useCallback(() => {
    setTitle(defaultTitle ?? '')
    setThesis(defaultThesis ?? '')
    setSymbolsStr(initialSymbols)
    setTagsStr(initialTags)
    setErrorMsg(null)
    setOpen(true)
  }, [defaultTitle, defaultThesis, initialSymbols, initialTags])

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
        origin_page: originPage,
        origin_ref: originRef ?? null,
      })
      cockpitPinStore.getState().pinHypothesis(created.id)
      setSavedFlash(true)
      setLastSaved(created)
      window.setTimeout(() => setSavedFlash(false), 2400)
      setOpen(false)
      onSaved?.(created)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    }
  }

  const trigger =
    size === 'button' ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openDialog}
        className={cn('gap-1.5', className)}
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Save as Hypothesis
      </Button>
    ) : (
      <IconActionButton
        title="Save current view as a Hypothesis"
        ariaLabel="Save as Hypothesis"
        onClick={openDialog}
        className={className}
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
      </IconActionButton>
    )

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {trigger}
        {savedFlash && (
          <span
            className="inline-flex items-center gap-1 text-dense-caption text-success"
            aria-live="polite"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
        {lastSaved && (lastSaved.symbols?.[0] || symbolsArray[0]) ? (
          <PromoteToWatchlistButton
            hypothesis={lastSaved}
            symbol={lastSaved.symbols?.[0] ?? symbolsArray[0]}
            size="dense"
          />
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : setOpen(next))}>
        <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
          <DialogHeader>
            <DialogTitle>Save as Hypothesis</DialogTitle>
            <DialogDescription>
              Persist the current view as a first-class research hypothesis. Origin page and
              context are attached automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="hypothesis-title">Title</Label>
              <Input
                id="hypothesis-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="NVDA earnings vol crush"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hypothesis-thesis">Thesis</Label>
              <textarea
                id="hypothesis-thesis"
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
                <Label htmlFor="hypothesis-symbols">Symbols</Label>
                <Input
                  id="hypothesis-symbols"
                  value={symbolsStr}
                  onChange={(e) => setSymbolsStr(e.target.value)}
                  placeholder="NVDA, AMD"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hypothesis-tags">Tags</Label>
                <Input
                  id="hypothesis-tags"
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="earnings, vol"
                  disabled={submitting}
                />
              </div>
            </div>
            <p className="text-dense-caption text-muted-foreground">
              Origin page: <code className="rounded bg-muted px-1 py-0.5">{originPage}</code>
            </p>
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={disabled} onClick={submit}>
              {submitting ? 'Saving…' : 'Save Hypothesis'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
