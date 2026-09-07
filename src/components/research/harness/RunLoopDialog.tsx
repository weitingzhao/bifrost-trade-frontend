/**
 * What this run will do, and what it will cost, before it is started.
 *
 * Run was a button that spent money without saying how much. Judging is the
 * only expensive thing the loop does — about a dollar a run at eight candidates
 * across two judges — and the two levers that move it are which judges read the
 * candidates and how many candidates they read. Both were buried in the
 * objective's policy, where changing them changed every future run too.
 *
 * So the levers live here, on the run, and the figure moves as they are pulled.
 * The estimate comes from this objective's own recent runs; when it has none,
 * the dialog says the number is typical rather than measured, because a reader
 * is about to spend real money on the strength of it.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Play } from 'lucide-react'
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
import { fetchRunEstimate, type BatchRunOverrides } from '@/api/research/harness'
import { fmtUsd } from '@/lib/harness/runSpend'
import { JUDGE_MODEL_CHOICES, judgeCountWarning } from '@/lib/harness/judgeModels'

export function RunLoopDialog({
  open,
  onOpenChange,
  objectiveId,
  objectiveTitle,
  maxCandidates,
  pending,
  onRun,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  objectiveId: string
  objectiveTitle: string
  maxCandidates: number
  pending: boolean
  onRun: (overrides: BatchRunOverrides) => void
}) {
  // The caller mounts this only while it is open, so every opening starts from
  // the defaults. Reopening asks the same question again rather than offering
  // the last answer to it, which would spend differently than the dialog on
  // screen appears to say.
  const [models, setModels] = useState<string[]>(JUDGE_MODEL_CHOICES.map((m) => m.model))
  const [topN, setTopN] = useState(0)

  const judged = topN > 0 ? Math.min(topN, maxCandidates) : maxCandidates
  const estimateQ = useQuery({
    queryKey: ['run-estimate', objectiveId, judged, models.join(',')],
    queryFn: () => fetchRunEstimate(objectiveId, { candidates: judged, models }),
    enabled: open && Boolean(objectiveId),
    staleTime: 60_000,
  })
  const est = estimateQ.data

  const held = Math.max(0, maxCandidates - judged)
  const toggle = (model: string) =>
    setModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    )

  const priceLine = useMemo(() => {
    if (estimateQ.isLoading) return 'working out the cost…'
    if (estimateQ.isError || !est) return 'cost unknown — the estimate could not be read'
    return est.summary
  }, [est, estimateQ.isError, estimateQ.isLoading])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-dense-body">Run {objectiveTitle}</DialogTitle>
          <DialogDescription className="text-dense-caption">
            Propose, rank, judge, then hand the batch over. Judging is the only part
            that costs anything, and these two choices are what move it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-dense-meta">Judges</Label>
            {JUDGE_MODEL_CHOICES.map((choice) => {
              const on = models.includes(choice.model)
              const line = est?.models.find((m) => m.model === choice.model)
              return (
                <label
                  key={choice.model}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border/60 px-2 py-1.5 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={on}
                    onChange={() => toggle(choice.model)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-1.5">
                      <span className="font-mono text-dense-meta">{choice.model}</span>
                      {line ? (
                        <span className="font-mono tabular-nums text-dense-micro text-muted-foreground">
                          {fmtUsd(line.usd_per_candidate)}/candidate
                          {line.source === 'typical' ? ' (typical)' : ''}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-dense-micro text-muted-foreground">
                      {choice.blurb}
                    </span>
                  </span>
                </label>
              )
            })}
            {judgeCountWarning(models.length) ? (
              <p className="text-dense-micro text-warning">
                {judgeCountWarning(models.length)}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="deep-top-n" className="text-dense-meta">
              Judge the top
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="deep-top-n"
                type="number"
                min={0}
                max={maxCandidates}
                value={topN}
                onChange={(e) => setTopN(Math.max(0, Number(e.target.value) || 0))}
                className="h-7 w-20 text-dense-meta"
              />
              <span className="text-dense-caption text-muted-foreground">
                of the triage ranking. 0 judges all {maxCandidates}.
                {held > 0 ? ` ${held} would be held, unjudged.` : ''}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-2">
            <p className="text-dense-meta">
              <span className="font-mono tabular-nums">
                {est ? fmtUsd(est.total_usd) : '—'}
              </span>{' '}
              <span className="text-muted-foreground">{priceLine}</span>
            </p>
            {est && est.source === 'typical' ? (
              <p className="mt-0.5 text-dense-micro text-warning">
                No judged run of this objective to measure, so this is a rate borrowed
                from others. Treat it as an order of magnitude.
              </p>
            ) : null}
            <p className="mt-0.5 text-dense-micro text-muted-foreground">
              These choices apply to this run only. The objective&rsquo;s own settings are
              untouched, so tomorrow&rsquo;s scheduled run is unchanged.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              onRun({
                curate_after: true,
                judge_models: models,
                deep_judge_top_n: topN > 0 ? topN : 0,
              })
            }
          >
            <Play className="mr-0.5 size-3" />
            {pending ? 'Running…' : `Run — ${est ? fmtUsd(est.total_usd) : 'cost unknown'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
