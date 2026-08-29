import { useCallback, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { createObjective, type ObjectiveCreateBody } from '@/api/research/harness'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[70px] resize-y rounded-md border border-input bg-background px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

type Schedule = 'adhoc' | 'daily_open' | 'daily_eod' | 'weekly'

const SCHEDULE_OPTIONS: { value: Schedule; label: string; hint: string }[] = [
  { value: 'adhoc', label: 'Adhoc', hint: 'Manual runs only (Run button)' },
  { value: 'daily_open', label: 'Daily @ open', hint: 'Cron before session (currently harness cron suspended)' },
  { value: 'daily_eod', label: 'Daily @ EOD', hint: 'Cron after session (currently harness cron suspended)' },
  { value: 'weekly', label: 'Weekly', hint: 'Weekly schedule (currently harness cron suspended)' },
]

type Preset = 'neutral' | 'momentum' | 'mean_revert' | 'adaptive_30d'

const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'mean_revert', label: 'Mean revert' },
  { value: 'adaptive_30d', label: 'Adaptive 30d' },
]

function parseSymbols(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export interface NewObjectiveDialogProps {
  triggerLabel?: string
}

export function NewObjectiveDialog({ triggerLabel = 'New Objective' }: NewObjectiveDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [schedule, setSchedule] = useState<Schedule>('adhoc')
  const [maxCandidates, setMaxCandidates] = useState<number>(3)
  const [seedSymbols, setSeedSymbols] = useState('')
  const [preset, setPreset] = useState<Preset>('neutral')
  const [flagFilter, setFlagFilter] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const reset = useCallback(() => {
    setTitle('')
    setDescription('')
    setSchedule('adhoc')
    setMaxCandidates(3)
    setSeedSymbols('')
    setPreset('neutral')
    setFlagFilter('')
    setErrorMsg(null)
  }, [])

  const mutation = useMutation({
    mutationFn: (body: ObjectiveCreateBody) => createObjective(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      setOpen(false)
      reset()
    },
    onError: (err) => {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    },
  })

  const submitting = mutation.isPending
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !submitting

  const submit = () => {
    setErrorMsg(null)
    const parsedSymbols = parseSymbols(seedSymbols)
    const filter = flagFilter.trim()
    const body: ObjectiveCreateBody = {
      title: title.trim(),
      description: description.trim(),
      schedule,
      policy_json: {
        max_candidates: Math.max(1, Math.min(20, maxCandidates)),
        seed_symbols: parsedSymbols,
        source: 'harness',
        preset,
        ...(filter ? { flag_filter: filter } : {}),
      },
    }
    mutation.mutate(body)
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 text-dense-meta"
      >
        <Plus className="mr-1 size-3" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : setOpen(next))}>
        <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
          <DialogHeader>
            <DialogTitle>New Harness Objective</DialogTitle>
            <DialogDescription>
              Advisory only — D10 BLOCKED. Objective drives the harness to propose candidates
              for Owner approval. Cron schedules are configured but currently suspended in DEV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="objective-title">Title</Label>
              <Input
                id="objective-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Morning IV Hot Watch"
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="objective-description">Description</Label>
              <textarea
                id="objective-description"
                className={TEXTAREA_CLASS}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Every open — pick 3 candidates with iv_rank>=90 and vrp:hot, propose for approval."
                rows={3}
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="objective-schedule">Schedule</Label>
                <Select
                  value={schedule}
                  onValueChange={(v) => setSchedule(v as Schedule)}
                  disabled={submitting}
                >
                  <SelectTrigger id="objective-schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-dense-caption text-muted-foreground">
                  {SCHEDULE_OPTIONS.find((o) => o.value === schedule)?.hint}
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="objective-max">Max candidates</Label>
                <Input
                  id="objective-max"
                  type="number"
                  min={1}
                  max={20}
                  value={maxCandidates}
                  onChange={(e) => setMaxCandidates(Number(e.target.value) || 1)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="objective-preset">Scan preset</Label>
                <Select
                  value={preset}
                  onValueChange={(v) => setPreset(v as Preset)}
                  disabled={submitting}
                >
                  <SelectTrigger id="objective-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="objective-flag">Flag filter</Label>
                <Input
                  id="objective-flag"
                  value={flagFilter}
                  onChange={(e) => setFlagFilter(e.target.value)}
                  placeholder="iv_rank:hot,vrp:hot"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="objective-symbols">Seed symbols (fallback)</Label>
              <Input
                id="objective-symbols"
                value={seedSymbols}
                onChange={(e) => setSeedSymbols(e.target.value)}
                placeholder="AAPL, MSFT, TSLA"
                disabled={submitting}
              />
              <p className="text-dense-caption text-muted-foreground">
                Runtime reads scan first; falls back to these seeds when scan is empty. Advanced
                policy fields (min_composite_score / min_hit_rate) go into policy_json via API.
              </p>
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
              {submitting ? 'Creating…' : 'Create Objective'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
