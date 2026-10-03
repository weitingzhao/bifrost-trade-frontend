/**
 * A gate set, edited in the Desk's inspector (design Rev .140 §2): name, the
 * four families of the daemon's params (strategy · state · intent · guard),
 * the earnings dates the blackout reads, the dims it applies to, Active. Each
 * change is one PUT of the whole set (`useLiveEdit`) with the payload the gate
 * sheet sends (`gateForm`). The first edit carries the set to v(N+1); the
 * daemon keeps the vN it loaded until its next start.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { InspectorField } from '@bifrost/ui'
import { fetchGateSafetyFull, updateGateSafety } from '@/api/strategy'
import {
  GATE_DIM_FIELDS,
  GATE_FAMILIES,
  gateDimLabel,
  gateFormProblem,
  gateFormToPayload,
  gateToForm,
  gateVersionMeta,
  getGateValue,
  isGateFormReady,
  parseGateNumber,
  setGateValue,
  withNextVersion,
  type GateField,
  type GateFormState,
} from '@/components/strategy/gates/gateForm'
import { Switch } from '@/components/ui/switch'
import { useStrategyDims } from '@/hooks/useOptionCategory'
import { useLiveEdit } from '@/hooks/useLiveEdit'
import { dimOptions } from '@/utils/gateDefaults'
import { cn } from '@/lib/utils'
import type { GateSafetyFull } from '@/types/positions'
import { FIELD, RuleInspector } from './RuleInspector'

const gateDetailKey = (id: number) => ['strategy', 'gate-safety', id] as const

const SMALL =
  'h-[26px] font-mono tabular-nums text-dense-label [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

const NOTE = (
  <>
    Earnings blackout reads the dates listed under strategy — the daemon takes them from this set. The running
    daemon keeps the version it started with; a new version applies on next start.
  </>
)

export function GateInspector({
  id,
  deleteBlocked,
  onClose,
  onDelete,
  onDuplicate,
  onSaved,
}: {
  id: number
  /** Why Delete would be refused (opportunities / allocations / the daemon use it), or null. */
  deleteBlocked: string | null
  onClose: () => void
  onDelete: (name: string) => void
  onDuplicate: () => void
  onSaved: () => void
}) {
  const q = useQuery({ queryKey: gateDetailKey(id), queryFn: () => fetchGateSafetyFull(id), staleTime: 30_000 })
  if (!q.data) {
    return (
      <RuleInspector title={`Gate · ${id}`} onClose={onClose} loading>
        {null}
      </RuleInspector>
    )
  }
  return (
    <GateEditor
      key={id}
      id={id}
      full={q.data}
      deleteBlocked={deleteBlocked}
      onClose={onClose}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onSaved={onSaved}
    />
  )
}

/** Mounted once per gate set, so `opened` is the version it had when the inspector opened. */
function GateEditor({
  id,
  full,
  deleteBlocked,
  onClose,
  onDelete,
  onDuplicate,
  onSaved,
}: {
  id: number
  full: GateSafetyFull
  deleteBlocked: string | null
  onClose: () => void
  onDelete: (name: string) => void
  onDuplicate: () => void
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const dims = useStrategyDims().data
  const [opened] = useState(full.version)
  const [initial] = useState(() => gateToForm(full))
  const { draft, edit: liveEdit } = useLiveEdit<GateFormState>({
    initial,
    undoKey: `gate:${id}`,
    ready: isGateFormReady,
    write: (d) => updateGateSafety(id, gateFormToPayload(d)),
    onSaved: () => {
      void qc.invalidateQueries({ queryKey: ['strategy', 'gate-safety'] })
      onSaved()
    },
  })
  /** Every edit carries the draft to v(N+1) inside the same change, so its undo restores what was there. */
  const edit = (field: string, change: (d: GateFormState) => GateFormState) =>
    liveEdit(field, (d) => withNextVersion(change(d), opened))

  const problem = gateFormProblem(draft)
  const name = draft.name.trim() || full.name

  return (
    <RuleInspector
      title={`Gate · ${name}`}
      meta={gateVersionMeta(opened)}
      metaClassName="text-[var(--sk-warn)] font-mono"
      onClose={onClose}
      onDelete={() => onDelete(name)}
      deleteBlocked={deleteBlocked}
      onDuplicate={onDuplicate}
      duplicateLabel="Duplicate set"
      note={NOTE}
    >
      <InspectorField label="Name">
        <input className={FIELD} value={draft.name} onChange={(e) => edit('name', (d) => ({ ...d, name: e.target.value }))} />
      </InspectorField>
      {problem ? (
        <p role="status" className="m-0 text-dense-meta text-[var(--sk-warn)]">
          Not saved — {problem}
        </p>
      ) : null}
      <p className="m-0 text-dense-label leading-normal text-[var(--sk-mute2)]">
        Four families, mirroring the daemon’s schema. Every row is a limit with scope = allocation: the daemon enforces it
        before acting, and a hit lands on Risk › Limits as GATE HIT.
      </p>
      {GATE_FAMILIES.map((fam) => (
        <section key={fam.id} className="flex flex-col gap-2" aria-label={`${fam.id} family`}>
          <div className="flex items-baseline gap-2">
            <span className="text-dense-meta font-semibold text-[var(--sk-mute)]">{fam.id}</span>
            <span className="text-dense-meta text-[var(--sk-mute)]">{fam.note}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {fam.fields.map((field) => (
              <GateFieldInput key={field.path} field={field} form={draft} edit={edit} />
            ))}
          </div>
          {fam.id === 'strategy' ? <EarningsDates dates={draft.earnings_dates} edit={edit} /> : null}
        </section>
      ))}
      <section className="flex flex-col gap-2" aria-label="applies to">
        <div className="flex items-baseline gap-2">
          <span className="text-dense-meta font-semibold text-[var(--sk-mute)]">applies to</span>
          <span className="text-dense-meta text-[var(--sk-mute)]">strategy dims · Any applies broadly</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {GATE_DIM_FIELDS.map((dim) => (
            <InspectorField key={dim} label={gateDimLabel(dim)} className="min-w-0">
              <select
                className={cn(FIELD, 'h-[26px] text-dense-label')}
                value={draft[dim] ?? ''}
                onChange={(e) => edit(dim, (d) => ({ ...d, [dim]: e.target.value || null }))}
              >
                <option value="">Any</option>
                {dimOptions(dims, dim).map((o) => (
                  <option key={o.strategy_dim_id} value={o.code}>
                    {o.display_label}
                  </option>
                ))}
                {draft[dim] && !dimOptions(dims, dim).some((o) => o.code === draft[dim]) ? (
                  <option value={draft[dim] ?? ''}>{draft[dim]}</option>
                ) : null}
              </select>
            </InspectorField>
          ))}
          <InspectorField label="Active" className="min-w-0">
            <span className="flex h-[26px] items-center">
              <Switch
                checked={draft.is_active}
                onCheckedChange={(v) => edit('is_active', (d) => ({ ...d, is_active: v }))}
                aria-label="Active"
              />
            </span>
          </InspectorField>
        </div>
      </section>
    </RuleInspector>
  )
}

type Edit = (field: string, change: (d: GateFormState) => GateFormState) => void

function GateFieldInput({ field, form, edit }: { field: GateField; form: GateFormState; edit: Edit }) {
  const v = getGateValue(form.gates, field.path)
  if (field.kind === 'bool') {
    return (
      <InspectorField label={field.label} className="min-w-0">
        <span className="flex h-[26px] items-center" title={field.path}>
          <Switch
            checked={v === true}
            onCheckedChange={(on) => edit(field.path, (d) => setGateValue(d, field.path, on))}
            aria-label={field.label}
          />
        </span>
      </InspectorField>
    )
  }
  return (
    <InspectorField label={field.label} className="min-w-0">
      <input
        type="number"
        step={field.step ?? 1}
        title={field.path}
        aria-label={field.label}
        className={cn(FIELD, SMALL)}
        value={typeof v === 'number' ? v : ''}
        onChange={(e) => edit(field.path, (d) => setGateValue(d, field.path, parseGateNumber(e.target.value)))}
      />
    </InspectorField>
  )
}

function EarningsDates({ dates, edit }: { dates: string[]; edit: Edit }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-dense-meta font-semibold text-muted-foreground">Earnings dates · blackout around these</span>
      {dates.map((date, idx) => (
        <span key={idx} className="flex items-center gap-2">
          <input
            type="date"
            aria-label={`Earnings date ${idx + 1}`}
            className={cn(FIELD, SMALL)}
            value={date}
            onChange={(e) =>
              edit(`earnings:${idx}`, (d) => ({
                ...d,
                earnings_dates: d.earnings_dates.map((x, i) => (i === idx ? e.target.value : x)),
              }))
            }
          />
          <button
            type="button"
            className="h-[26px] shrink-0 rounded-lg px-2 text-dense-meta text-[var(--sk-mute2)] hover:text-foreground"
            onClick={() =>
              edit(`earnings-remove:${idx}`, (d) => ({ ...d, earnings_dates: d.earnings_dates.filter((_, i) => i !== idx) }))
            }
          >
            Remove
          </button>
        </span>
      ))}
      <button
        type="button"
        className="h-[26px] self-start rounded-lg bg-[var(--mat-btn-fill)] px-2.5 text-dense-meta text-[var(--sk-mute2)] hover:text-foreground"
        onClick={() => edit('earnings-add', (d) => ({ ...d, earnings_dates: [...d.earnings_dates, ''] }))}
      >
        Add date
      </button>
    </div>
  )
}
