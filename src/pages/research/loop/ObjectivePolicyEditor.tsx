/**
 * The policy as a form the Owner can read and change.
 *
 * Every knob shows the value the run will use — stored or default, and says
 * which. Edits collect into one change; the change goes through the same
 * propose → approve path a model's suggestion takes, so the ledger holds the
 * rationale and the before/after, and a run tomorrow can be traced to a change
 * today. Nothing here writes policy_json directly.
 */
import { useMemo, useState } from 'react'
import { DenseTag } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import {
  POLICY_SECTIONS,
  buildSuggestion,
  defaultFor,
  describeEdits,
  effectiveValue,
  fieldText,
  getPath,
  parseFieldInput,
  valuesEqual,
  type PolicyField,
} from '@/lib/harness/objectivePolicy'
import { usePolicyDefaults } from '@/hooks/useLoopHarness'

export function ObjectivePolicyEditor({
  policy,
  onSubmit,
  submitting,
  error,
  lastResult,
}: {
  policy: Record<string, unknown>
  onSubmit: (suggestion: Record<string, unknown>, rationale: string) => void
  submitting: boolean
  error: string | null
  lastResult: string | null
}) {
  // The runtime's own defaults, so a "default" chip names what the run will do
  // rather than a constant copied from the backend's schema.
  const serverDefaults = usePolicyDefaults().data?.policy_json ?? null
  const [edits, setEdits] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [rationale, setRationale] = useState('')
  const [showRaw, setShowRaw] = useState(false)

  // The form reads as if the edits were already applied, so a mode change
  // reveals the layers it enables before the change is proposed.
  const preview = useMemo(() => {
    let p = policy
    for (const [path, v] of Object.entries(edits)) p = setPathShallow(p, path, v)
    return p
  }, [policy, edits])

  const nEdits = Object.keys(edits).length
  const nErrors = Object.keys(errors).length
  const summary = describeEdits(policy, edits)

  function change(field: PolicyField, raw: string) {
    const parsed = parseFieldInput(field, raw)
    if (!parsed.ok) {
      setErrors((e) => ({ ...e, [field.path]: parsed.error }))
      setEdits((e) => ({ ...e, [field.path]: raw }))
      return
    }
    setErrors((e) => omit(e, field.path))
    const current = getPath(policy, field.path)
    if (valuesEqual(parsed.value, current) || (parsed.value == null && current === undefined)) {
      setEdits((e) => omit(e, field.path))
      return
    }
    setEdits((e) => ({ ...e, [field.path]: parsed.value }))
  }

  function discard() {
    setEdits({})
    setErrors({})
    setRationale('')
  }

  function submit() {
    if (nErrors > 0 || nEdits === 0) return
    let suggestion: Record<string, unknown>
    try {
      suggestion = buildSuggestion(edits)
    } catch (err) {
      setErrors((e) => ({ ...e, _: err instanceof Error ? err.message : String(err) }))
      return
    }
    onSubmit(suggestion, rationale.trim() || `Owner: ${summary}`)
    discard()
  }

  return (
    <div className="space-y-4">
      {POLICY_SECTIONS.map((section) => {
        const fields = section.fields.filter((f) => !f.when || f.when(preview))
        if (fields.length === 0) return null
        return (
          <section key={section.id} className="rounded-lg border border-border bg-secondary/40">
            <header className="border-b border-border/60 px-4 py-2">
              <h3 className="text-dense-body font-semibold">{section.title}</h3>
              <p className="text-dense-label text-muted-foreground">{section.lead}</p>
            </header>
            <dl className="grid gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-2">
              {fields.map((field) => (
                <FieldRow
                  key={field.path}
                  field={field}
                  policy={policy}
                  serverDefaults={serverDefaults}
                  edited={field.path in edits}
                  editValue={edits[field.path]}
                  error={errors[field.path]}
                  onChange={(raw) => change(field, raw)}
                />
              ))}
            </dl>
          </section>
        )
      })}

      <div className="sticky bottom-0 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.2)] backdrop-blur">
        {nEdits > 0 ? (
          <p className="mb-2 text-dense-label">
            <span className="font-medium">{nEdits} change{nEdits === 1 ? '' : 's'}:</span>{' '}
            <span className="text-muted-foreground">{summary}</span>
          </p>
        ) : (
          <p className="mb-2 text-dense-label text-muted-foreground">
            Change a knob above. The change is proposed as a draft with your reason and approved in
            one click — the same ledger a model's suggestion goes through.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Why — one line for the ledger (optional; the diff is recorded either way)"
            className="h-8 min-w-[240px] flex-1 text-dense-body"
            disabled={nEdits === 0}
          />
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={nEdits === 0 || nErrors > 0 || submitting}
            onClick={submit}
          >
            {submitting ? 'Applying…' : 'Propose & approve'}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8" disabled={nEdits === 0} onClick={discard}>
            Discard
          </Button>
          <button
            type="button"
            className="ml-auto text-dense-label text-muted-foreground hover:underline"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? 'Hide JSON' : 'Show JSON'}
          </button>
        </div>
        {errors._ ? <p className="mt-1 text-dense-label text-destructive">{errors._}</p> : null}
        {error ? <p className="mt-1 text-dense-label text-destructive">{error}</p> : null}
        {lastResult ? <p className="mt-1 text-dense-label text-success">{lastResult}</p> : null}
      </div>

      {showRaw ? (
        <pre className="max-h-96 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-dense-micro leading-relaxed">
          {JSON.stringify(policy, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}

function omit<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const next = { ...obj }
  delete next[key]
  return next
}

function setPathShallow(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...obj, [head]: value }
  const child = obj[head]
  const childRec = child && typeof child === 'object' && !Array.isArray(child) ? (child as Record<string, unknown>) : {}
  return { ...obj, [head]: setPathShallow(childRec, rest.join('.'), value) }
}

function FieldRow({
  field,
  policy,
  serverDefaults,
  edited,
  editValue,
  error,
  onChange,
}: {
  field: PolicyField
  policy: Record<string, unknown>
  serverDefaults: Record<string, unknown> | null
  edited: boolean
  editValue: unknown
  error: string | undefined
  onChange: (raw: string) => void
}) {
  const stored = getPath(policy, field.path)
  const fallbackDefault = defaultFor(field, serverDefaults)
  const effective = effectiveValue(policy, field, serverDefaults)
  // The server normalises an unset optional to null; that is an absence, not a
  // default worth labelling. Only a real value earns the chip.
  const hasDefault = fallbackDefault !== undefined && fallbackDefault !== null
  const isDefault = (stored === undefined || stored === null) && hasDefault
  const shown = edited ? editValue : stored
  const inputText = shown == null ? '' : Array.isArray(shown) ? shown.join(', ') : String(shown)

  return (
    <div className={`min-w-0 rounded-md px-2 py-1.5 ${edited ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}>
      <dt className="flex items-center gap-1 text-dense-meta uppercase tracking-wide text-muted-foreground">
        {field.label}
        <InfoTooltip text={field.help} />
        {isDefault && !edited ? (
          <DenseTag
            variant="neutral"
            size="cell"
            title={`Not stored on this objective; the runtime applies ${fieldText(field, fallbackDefault)}.`}
          >
            default
          </DenseTag>
        ) : null}
        {edited ? (
          <DenseTag variant="category" size="cell">
            was {fieldText(field, stored)}
          </DenseTag>
        ) : null}
      </dt>
      <dd className="mt-1">
        {field.kind === 'bool' ? (
          <label className="flex items-center gap-2 text-dense-body">
            <Switch
              checked={Boolean(edited ? editValue : effective)}
              onCheckedChange={(v) => onChange(v ? 'true' : 'false')}
              size="sm"
            />
            <span>{fieldText(field, edited ? editValue : effective)}</span>
          </label>
        ) : field.kind === 'select' ? (
          <Select
            value={String((edited ? editValue : effective) ?? '')}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger className="h-7 text-dense-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-dense-body">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={inputText}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              field.placeholder ?? (hasDefault ? `default ${fieldText(field, fallbackDefault)}` : 'not set')
            }
            inputMode={field.kind === 'number' ? 'decimal' : undefined}
            className={`h-7 font-mono text-dense-body ${error ? 'border-destructive' : ''}`}
            aria-invalid={Boolean(error)}
          />
        )}
        {error ? <p className="mt-0.5 text-dense-label text-destructive">{error}</p> : null}
      </dd>
    </div>
  )
}
