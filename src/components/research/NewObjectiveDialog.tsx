/**
 * Create an objective — then go and configure it. The Console's New
 * objective panel (three origins, Rev .100) opens this form pre-filled from the
 * origin picked; it is no longer a dialog with its own trigger.
 *
 * This dialog used to ask for max candidates, preset, flag filter and seed
 * symbols in one modal, and that was the last time the policy had a form.
 * Now it asks only what a new objective needs to exist: a name, what it is
 * for, when it runs, which policy template to start from and who judges. The
 * policy itself is configured on the objective's own page, where every knob
 * has room to be explained.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { usePolicyTemplates } from '@/hooks/useLoopHarness'
import { PERSONAS, SCHEDULES, objectivePath } from '@/lib/harness/objectivePolicy'

const TEXTAREA_CLASS =
  'w-full text-dense-body min-h-[70px] resize-y border px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mat-field'

/**
 * What an origin hands the form (Rev .100 three origins): a fork carries its
 * source's policy and lineage, a promoted screen its origin, a template only
 * its id. The form still asks for the name and the purpose — an origin fills
 * them in, it does not skip them.
 */
export interface ObjectiveSeed {
  title?: string
  description?: string
  schedule?: string
  persona?: string
  templateId?: string
  /** A policy carried from the origin — replaces the template choice. */
  policy?: { label: string; json: Record<string, unknown> }
  /** Written to `policy_json.origin`. */
  origin?: Record<string, unknown>
  /** The form's heading, e.g. `Fork · Daily Loop`. */
  heading?: string
}

export function NewObjectiveForm({ onClose, seed }: { onClose: () => void; seed?: ObjectiveSeed }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const templatesQ = usePolicyTemplates()
  const templates = templatesQ.data?.items ?? []
  const defaultTemplate = templates.find((t) => t.is_default)?.id ?? templates[0]?.id ?? ''

  const [title, setTitle] = useState(seed?.title ?? '')
  const [description, setDescription] = useState(seed?.description ?? '')
  const [schedule, setSchedule] = useState(seed?.schedule ?? 'adhoc')
  const [persona, setPersona] = useState(seed?.persona ?? 'loop_curator')
  const [templateId, setTemplateId] = useState<string | null>(seed?.templateId ?? null)
  const chosenTemplate = templates.find((t) => t.id === (templateId ?? defaultTemplate)) ?? null

  const mutation = useMutation({
    mutationFn: (body: ObjectiveCreateBody) => createObjective(body),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['research', 'objectives'] })
      void queryClient.invalidateQueries({ queryKey: ['research', 'loop', 'autopilot'] })
      onClose()
      navigate(objectivePath(created.id))
    },
  })
  const submitting = mutation.isPending
  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !submitting

  const submit = () => {
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      schedule,
      persona,
      policy_json: {
        ...(seed?.policy?.json ?? chosenTemplate?.policy_json ?? {}),
        source: 'harness',
        ...(seed?.origin ? { origin: seed.origin } : {}),
      },
    })
  }

  return (
    <Dialog open onOpenChange={(next) => (submitting || next ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>{seed?.heading ?? 'New objective'}</DialogTitle>
          <DialogDescription>
            An objective is one standing hunt the autopilot runs. Name it, say what it is for, and
            pick a policy to start from — you configure every knob on its page next. Advisory only,
            D10 BLOCKED.
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
            <Label htmlFor="objective-description">What it is for</Label>
            <textarea
              id="objective-description"
              className={TEXTAREA_CLASS}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Every open — find SETUP/PIVOT names with SEPA ≥ 70 and an option-flag confirmation; propose up to 8."
              rows={3}
              disabled={submitting}
            />
          </div>
          {seed?.policy ? (
            <div className="space-y-1">
              <Label>Policy</Label>
              <p className="text-dense-label text-[var(--sk-soft)]">{seed.policy.label}</p>
              <p className="text-dense-caption text-muted-foreground">
                Copied field for field; the original keeps running unchanged. Change what you forked it to change on the new
                objective’s page.
              </p>
            </div>
          ) : (
          <div className="space-y-1">
            <Label htmlFor="objective-template">Start from policy</Label>
            <Select
              value={templateId ?? defaultTemplate}
              onValueChange={setTemplateId}
              disabled={submitting || templates.length === 0}
            >
              <SelectTrigger id="objective-template">
                <SelectValue placeholder={templatesQ.isLoading ? 'Loading templates…' : 'No templates'} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.is_default ? ' (default)' : ''} · {t.universe_mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-dense-caption text-muted-foreground">
              {chosenTemplate?.description || 'Copied into the objective; edit it freely on the objective page.'}
            </p>
          </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="objective-schedule">Schedule</Label>
              <Select value={schedule} onValueChange={setSchedule} disabled={submitting}>
                <SelectTrigger id="objective-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="objective-persona">Judged by</Label>
              <Select value={persona} onValueChange={setPersona} disabled={submitting}>
                <SelectTrigger id="objective-persona">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {mutation.isError ? (
            <p className="text-dense-label text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : String(mutation.error)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={!canSubmit}>
            {submitting ? 'Creating…' : 'Create and configure'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
