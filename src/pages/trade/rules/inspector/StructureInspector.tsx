/**
 * A structure, edited in the Desk's inspector (design Rev .140 §2): its name,
 * the template it is on — the catalog (was Option Category) — and that
 * template's parameters. Each change is one PUT of the whole structure
 * (`useLiveEdit`), built by the same mapping the edit sheet writes with
 * (`structureForm`). The six dimensions and the legs come from the template
 * and are read here, not edited.
 *
 * No Delete: the store has no hard delete for a structure — its DELETE only
 * takes it off the books, which is Activate / Deactivate on the record.
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { InspectorField } from '@bifrost/ui'
import { fetchStructure, fetchTemplateDetail, updateStructure } from '@/api/strategy'
import { TemplateCatalogControls } from '@/components/strategy/structures/TemplateCatalogControls'
import {
  TEMPLATE_DIM_TYPES,
  legLine,
  structureFormToPayload,
  structureToForm,
  templateDimAt,
  templateMatchesSearch,
  withParam,
  withTemplate,
  type StructureFormState,
} from '@/components/strategy/structures/structureForm'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useStructureTemplates, useTemplateDetail } from '@/hooks/useStructureManagement'
import { useLiveEdit } from '@/hooks/useLiveEdit'
import { notify } from '@/lib/shellNotify'
import { cn } from '@/lib/utils'
import type { StrategyStructure } from '@/types/strategy'
import { FIELD, RuleInspector } from './RuleInspector'

const structureDetailKey = QUERY_KEYS.strategy.structure
/** The key `useTemplateDetail` reads — a pick fills it, so the panel never waits on it twice. */
const templateDetailKey = QUERY_KEYS.strategy.templates.detail

const CAP = 'text-dense-meta font-semibold text-muted-foreground'

export function StructureInspector({
  id,
  onClose,
  onDuplicate,
  onSaved,
}: {
  id: number
  onClose: () => void
  onDuplicate: () => void
  onSaved: () => void
}) {
  const q = useQuery({ queryKey: structureDetailKey(id), queryFn: () => fetchStructure(id), staleTime: 30_000 })
  const tid = q.data?.strategy_template_id ?? null
  // The template's parameters seed the editable ones; a template that will not
  // load leaves the structure's meta exactly as saved.
  const tpl = useTemplateDetail(tid)
  const ready = !!q.data && (tid == null || tpl.data != null || tpl.isError)
  return (
    <RuleInspector
      title={q.data ? `Structure · ${q.data.name}` : `Structure · ${id}`}
      meta="PUT /strategy/structures"
      onClose={onClose}
      loading={!ready}
      onDuplicate={q.data ? onDuplicate : undefined}
      note="Edits change the definition only — whether it is on the books is Activate / Deactivate on the record. Version stays as it is; the six dimensions and the legs are the template’s."
    >
      {q.data && ready ? (
        <StructureFields key={id} id={id} initial={structureToForm(q.data, tpl.data ?? null)} onSaved={onSaved} />
      ) : null}
    </RuleInspector>
  )
}

function StructureFields({
  id,
  initial,
  onSaved,
}: {
  id: number
  initial: StructureFormState
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const templates = useStructureTemplates().data?.items ?? []
  const [search, setSearch] = useState('')
  const [picking, setPicking] = useState<number | null>(null)
  const pickSeq = useRef(0)
  useEffect(
    () => () => {
      // A template still loading when the panel closes is not linked afterwards.
      pickSeq.current += 1
    },
    [],
  )

  const { draft, edit } = useLiveEdit<StructureFormState>({
    initial,
    undoKey: `struct:${id}`,
    ready: (d) => d.name.trim() !== '' && d.strategyTemplateId != null,
    write: (d) => {
      // Availability is the record's act (Activate / Deactivate): write what the
      // store says now, not what it said when the panel opened.
      const live = qc.getQueryData<StrategyStructure>(structureDetailKey(id))
      return updateStructure(id, structureFormToPayload({ ...d, isActive: live?.is_active ?? d.isActive }))
    },
    onSaved: () => {
      void qc.invalidateQueries({ queryKey: structureDetailKey(id) })
      onSaved()
    },
  })

  const linked = useTemplateDetail(draft.strategyTemplateId ?? null).data
  const linkedRow = linked ?? templates.find((t) => t.strategy_template_id === draft.strategyTemplateId) ?? null

  const shown = templates.filter((t) => templateMatchesSearch(t, search))
  const pickedRow = templates.find((t) => t.strategy_template_id === draft.strategyTemplateId)
  if (pickedRow && !shown.includes(pickedRow)) shown.unshift(pickedRow)

  const pick = (templateId: number) => {
    if (templateId === draft.strategyTemplateId) return
    const seq = ++pickSeq.current
    setPicking(templateId)
    qc.fetchQuery({ queryKey: templateDetailKey(templateId), queryFn: () => fetchTemplateDetail(templateId) })
      .then((t) => {
        if (seq === pickSeq.current) edit('template', (d) => withTemplate(d, t))
      })
      .catch((e: unknown) => {
        if (seq === pickSeq.current) notify(`Template not linked — ${e instanceof Error ? e.message : String(e)}`)
      })
      .finally(() => {
        if (seq === pickSeq.current) setPicking(null)
      })
  }

  const params = (draft.metaParams ?? []).filter((p) => p.param_kind !== 'fixed')

  return (
    <>
      <InspectorField label="Name">
        <input
          className={FIELD}
          value={draft.name}
          aria-label="Structure name"
          onChange={(e) => edit('name', (d) => ({ ...d, name: e.target.value }))}
        />
      </InspectorField>

      <InspectorField
        label="Template — the catalog (was Option Category)"
        hint="Dimensions come from the linked template — change the template and the six dims follow."
      >
        <span className="flex flex-col gap-1.5">
          <input
            type="search"
            className={FIELD}
            value={search}
            placeholder="Search templates…"
            aria-label="Search templates"
            onChange={(e) => setSearch(e.target.value)}
          />
          <TemplateCatalogControls onCreated={pick} editableTemplateId={draft.strategyTemplateId ?? null} />
          <span role="radiogroup" aria-label="Template" className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            {shown.length === 0 ? (
              <span className="text-dense-meta text-muted-foreground">
                {templates.length === 0 ? 'Loading templates…' : 'No template matches.'}
              </span>
            ) : (
              shown.map((t) => {
                const on = t.strategy_template_id === draft.strategyTemplateId
                const desc = t.typical_use || t.explanation
                return (
                  <button
                    key={t.strategy_template_id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(t.strategy_template_id)}
                    className="grid w-full grid-cols-[14px_minmax(0,1fr)] items-start gap-2.5 border px-2.5 py-2 text-left mat-card hover:bg-[var(--mat-card-fill-hover)]"
                    style={
                      on
                        ? {
                            outline: '1px solid var(--sk-accent)',
                            outlineOffset: -1,
                            backgroundColor: 'color-mix(in srgb, var(--sk-accent) 12%, transparent)',
                          }
                        : undefined
                    }
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-0.5 size-3 rounded-full border',
                        on ? 'border-[var(--sk-accent)] bg-[var(--sk-accent)]' : 'border-[var(--sk-line2)]',
                      )}
                    />
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-dense-body font-semibold">{t.display_name}</span>
                        <span className="font-mono text-dense-caption text-[var(--sk-mute)]">{t.template_code}</span>
                        {picking === t.strategy_template_id ? (
                          <span className="ml-auto text-dense-caption text-[var(--sk-mute)]">linking…</span>
                        ) : null}
                      </span>
                      {desc ? (
                        <span className="mt-0.5 block text-dense-meta text-[var(--sk-mute2)]">{desc}</span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </span>
        </span>
      </InspectorField>

      {params.length > 0 ? (
        <InspectorField label="Parameters · from template" hint="Saved as the structure’s meta.">
          <span className="grid grid-cols-2 gap-x-3 gap-y-2">
            {params.map((p) => (
              <label key={p.meta_key} className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-dense-caption text-[var(--sk-mute)]">{p.display_label ?? p.meta_key}</span>
                <input
                  className={cn(FIELD, 'font-mono tabular-nums')}
                  inputMode="decimal"
                  aria-label={p.display_label ?? p.meta_key}
                  value={draft.paramValues[p.meta_key] ?? p.default_value_text ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.]/g, '')
                    const v = raw === '' ? '' : /^\d+$/.test(raw) ? parseInt(raw, 10) : raw
                    edit(`param:${p.meta_key}`, (d) => withParam(d, p.meta_key, v))
                  }}
                />
              </label>
            ))}
          </span>
        </InspectorField>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className={CAP}>Dimensions · from template</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-3 gap-y-2">
          {TEMPLATE_DIM_TYPES.map((dt) => (
            <div key={dt} className="min-w-0">
              <div className="text-dense-caption text-[var(--sk-mute)]">dim_{dt}</div>
              <div className="mt-px truncate text-dense-body text-[var(--sk-soft)]">
                {(linkedRow && templateDimAt(linkedRow, dt)) ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className={CAP}>Legs</span>
        {draft.legs.length === 0 ? (
          <span className="text-dense-meta text-muted-foreground">No legs on this structure.</span>
        ) : (
          draft.legs.map((leg, i) => (
            <div
              key={`${leg.role}-${leg.direction}-${i}`}
              className="border px-2.5 py-1.5 font-mono text-dense-body text-[var(--sk-soft)] mat-card"
            >
              {legLine(leg)}
            </div>
          ))
        )}
      </div>
    </>
  )
}
