/**
 * An opportunity, edited in the Desk's inspector (design Rev .140 §2): name,
 * the structure it uses, its symbol scope, the entry conditions that say when
 * the shape may be used, and its default gate. Each change is one PUT of the
 * whole definition (`useLiveEdit`), built by the same model the create / edit
 * sheet uses (`opportunityForm`), so both write one shape of a valid
 * opportunity. A draft the server would refuse — no name, no structure — is
 * held back and the field says why. Delete is refused while it has trades.
 */
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { InspectorField } from '@bifrost/ui'
import { Plus, X } from 'lucide-react'
import { fetchOpportunityDetail, patchOpportunity, STRATEGY_WRITES, strategyWriteLabel } from '@/api/strategy'
import { SegmentControl } from '@/components/data-display'
import { opportunityDetailKey } from '@/components/strategy/opportunityCopy'
import {
  newEntryCondition,
  opportunityFormToPayload,
  opportunityFormProblem,
  opportunityToForm,
  symbolsToText,
  textToSymbols,
  withScopeType,
  type OpportunityFormState,
} from '@/components/strategy/opportunities/opportunityForm'
import { useGateSafety, useStructures } from '@/hooks/useStrategies'
import { useLiveEdit } from '@/hooks/useLiveEdit'
import { cn } from '@/lib/utils'
import type { EntryConditionInput } from '@/types/strategy'
import { OPPORTUNITY_CONDITION_TYPES, getOpportunityConditionTypeLabel } from '@/utils/strategyFormUtils'
import { FIELD, RuleInspector } from './RuleInspector'

/** The form's scope types (`OPPORTUNITY_SCOPE_TYPES`), labelled to fit the inspector. */
const SCOPE_OPTIONS = [
  { value: 'explicit_symbols', label: 'Symbols' },
  { value: 'watchlist_stk', label: 'Watchlist' },
  { value: '', label: 'None' },
]

const ADD_BTN =
  'inline-flex h-6 w-fit items-center gap-1 rounded-full bg-[var(--mat-btn-fill)] px-2.5 text-dense-meta text-[var(--sk-mute2)] transition-colors hover:text-foreground active:[filter:var(--press)]'

export function OpportunityInspector({
  id,
  tradeCount,
  onClose,
  onDelete,
  onDuplicate,
  onSaved,
}: {
  id: number
  /** Trades on this opportunity — >0 means Delete is refused (said on the button). */
  tradeCount: number
  onClose: () => void
  onDelete: (name: string) => void
  onDuplicate: () => void
  /** The page refreshes its chain. */
  onSaved: () => void
}) {
  const q = useQuery({ queryKey: opportunityDetailKey(id), queryFn: () => fetchOpportunityDetail(id), staleTime: 30_000 })
  return (
    <RuleInspector
      title={q.data ? `Opportunity · ${q.data.name}` : `Opportunity · ${id}`}
      meta={strategyWriteLabel(STRATEGY_WRITES.opportunity, id)}
      onClose={onClose}
      loading={!q.data && !q.isError}
      onDelete={q.data ? () => onDelete(q.data.name) : undefined}
      deleteBlocked={
        tradeCount > 0
          ? `It has ${tradeCount} trade${tradeCount === 1 ? '' : 's'} — deactivate instead; delete needs an empty history.`
          : null
      }
      onDuplicate={q.data ? onDuplicate : undefined}
      note="The daemon only acts on this through an allocation it runs. Deactivating stops new trades; running ones keep going until closed."
    >
      {q.data ? (
        <OpportunityFields
          key={id}
          id={id}
          initial={opportunityToForm(q.data)}
          structureName={q.data.structure_name}
          gateName={q.data.gate_safety_name}
          onSaved={onSaved}
        />
      ) : (
        <p className="m-0 text-dense-meta text-[var(--color-loss)]">
          Could not load the opportunity — {q.error instanceof Error ? q.error.message : 'unknown error'}
        </p>
      )}
    </RuleInspector>
  )
}

function OpportunityFields({
  id,
  initial,
  structureName,
  gateName,
  onSaved,
}: {
  id: number
  initial: OpportunityFormState
  /** Names the saved structure / gate when the pickers do not list it (inactive). */
  structureName: string | null
  gateName: string | null
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const structures = useStructures().data?.items ?? []
  const gates = (useGateSafety().data?.items ?? []).filter(
    (g) => g.is_active || String(g.gate_safety_strategy_id) === initial.gateSafetyId,
  )
  const { draft, edit } = useLiveEdit<OpportunityFormState>({
    initial,
    undoKey: `opp:${id}`,
    ready: (d) => opportunityFormProblem(d) == null,
    write: (d) => patchOpportunity(id, opportunityFormToPayload(d)),
    onSaved: () => {
      void qc.invalidateQueries({ queryKey: opportunityDetailKey(id) })
      onSaved()
    },
  })

  // The symbols line as typed, kept while it is the text that produced the
  // draft's list — so separators survive typing, and an undo shows its own list.
  const [symText, setSymText] = useState<{ of: string[]; text: string } | null>(null)
  const symbolsValue = symText && symText.of === draft.symbols ? symText.text : symbolsToText(draft.symbols)

  const structureListed = structures.some((s) => String(s.strategy_structure_id) === draft.structureId)
  const gateListed = gates.some((g) => String(g.gate_safety_strategy_id) === draft.gateSafetyId)

  const setCondition = (idx: number, field: string, patch: Partial<EntryConditionInput>) =>
    edit(`cond:${idx}:${field}`, (d) => ({
      ...d,
      conditions: d.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }))

  return (
    <>
      <InspectorField
        label="Name"
        hint={draft.name.trim() ? undefined : 'A name is required — nothing saves until it has one.'}
      >
        <input
          className={FIELD}
          value={draft.name}
          aria-label="Name"
          onChange={(e) => edit('name', (d) => ({ ...d, name: e.target.value }))}
        />
      </InspectorField>

      <InspectorField
        label="Structure — the shape it uses"
        hint={draft.structureId ? undefined : 'Pick a structure — nothing saves until it has one.'}
      >
        <select
          className={FIELD}
          aria-label="Structure"
          value={draft.structureId}
          onChange={(e) => edit('structure', (d) => ({ ...d, structureId: e.target.value }))}
        >
          {!draft.structureId ? <option value="">Pick a structure</option> : null}
          {draft.structureId && !structureListed ? (
            <option value={draft.structureId}>
              {draft.structureId === initial.structureId && structureName
                ? `${structureName} (inactive)`
                : `Structure #${draft.structureId}`}
            </option>
          ) : null}
          {structures.map((s) => (
            <option key={s.strategy_structure_id} value={String(s.strategy_structure_id)}>
              {`${s.name} · v${s.version}`}
            </option>
          ))}
        </select>
      </InspectorField>

      <InspectorField label="Scope type">
        <SegmentControl
          size="sm"
          ariaLabel="Scope type"
          value={draft.scopeType}
          onChange={(v) => edit('scopeType', (d) => withScopeType(d, v))}
          options={SCOPE_OPTIONS}
        />
      </InspectorField>

      {draft.scopeType === 'explicit_symbols' || draft.scopeType === 'watchlist_stk' ? (
        <InspectorField
          label={draft.scopeType === 'watchlist_stk' ? 'Watchlist symbols' : 'Symbols'}
          hint={
            draft.scopeType === 'watchlist_stk'
              ? 'Empty follows the whole watchlist (stocks with Option? on); listing some narrows it.'
              : draft.symbols.length === 0
                ? 'No symbols — the scope covers nothing.'
                : undefined
          }
        >
          <input
            className={cn(FIELD, 'font-mono')}
            aria-label="Symbols"
            placeholder="AMD · NVDA"
            value={symbolsValue}
            onChange={(e) => {
              const text = e.target.value
              const next = textToSymbols(text)
              edit('symbols', (d) => ({ ...d, symbols: next }))
              setSymText({ of: next, text })
            }}
          />
        </InspectorField>
      ) : null}

      <InspectorField
        label="Conditions — when the shape may be used"
        hint="The daemon evaluates them per tick; a plan created by hand quotes them as its rules row."
      >
        <span className="flex flex-col gap-1.5">
          {draft.conditions.length === 0 ? (
            <span className="text-dense-meta text-[var(--sk-mute)]">No entry conditions yet.</span>
          ) : null}
          {draft.conditions.map((c, idx) => (
            <span
              key={idx}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] items-center gap-1.5"
            >
              <select
                className={FIELD}
                aria-label={`Condition ${idx + 1} type`}
                value={c.condition_type}
                onChange={(e) => setCondition(idx, 'type', { condition_type: e.target.value })}
              >
                {!(OPPORTUNITY_CONDITION_TYPES as readonly string[]).includes(c.condition_type) ? (
                  <option value={c.condition_type}>{getOpportunityConditionTypeLabel(c.condition_type)}</option>
                ) : null}
                {OPPORTUNITY_CONDITION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getOpportunityConditionTypeLabel(t)}
                  </option>
                ))}
              </select>
              <input
                className={FIELD}
                aria-label={`Condition ${idx + 1} text`}
                placeholder="text"
                value={c.value_text ?? ''}
                onChange={(e) => setCondition(idx, 'text', { value_text: e.target.value || null })}
              />
              <input
                className={cn(FIELD, 'font-mono tabular-nums')}
                aria-label={`Condition ${idx + 1} number`}
                type="number"
                step="any"
                placeholder="numeric"
                value={c.value_numeric ?? ''}
                onChange={(e) =>
                  setCondition(idx, 'numeric', {
                    value_numeric: e.target.value === '' ? null : parseFloat(e.target.value),
                  })
                }
              />
              <button
                type="button"
                className="inline-flex h-7 w-6 items-center justify-center rounded-md text-[var(--sk-mute)] hover:text-foreground"
                aria-label={`Remove condition ${idx + 1}`}
                onClick={() =>
                  edit(`cond:remove:${idx}`, (d) => ({ ...d, conditions: d.conditions.filter((_, i) => i !== idx) }))
                }
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
          <button
            type="button"
            className={ADD_BTN}
            onClick={() => edit('cond:add', (d) => ({ ...d, conditions: [...d.conditions, newEntryCondition()] }))}
          >
            <Plus className="h-3 w-3" aria-hidden />
            Add condition
          </button>
        </span>
      </InspectorField>

      <InspectorField
        label="Default gate"
        hint="Used when an allocation carries no gate of its own — the allocation’s gate wins otherwise."
      >
        <select
          className={FIELD}
          aria-label="Default gate"
          value={draft.gateSafetyId}
          onChange={(e) => edit('gate', (d) => ({ ...d, gateSafetyId: e.target.value }))}
        >
          <option value="">No gate</option>
          {draft.gateSafetyId && !gateListed ? (
            <option value={draft.gateSafetyId}>{gateName ?? `Gate #${draft.gateSafetyId}`}</option>
          ) : null}
          {gates.map((g) => (
            <option key={g.gate_safety_strategy_id} value={String(g.gate_safety_strategy_id)}>
              {`${g.name} · v${g.version}${g.is_active ? '' : ' (inactive)'}`}
            </option>
          ))}
        </select>
      </InspectorField>
    </>
  )
}
