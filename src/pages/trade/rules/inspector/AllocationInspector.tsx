/**
 * An allocation, edited in the Desk's inspector (design Rev .140 §2): name,
 * the opportunities it bundles, its gate, the two limits. Each change is one
 * PUT of the whole definition (`useLiveEdit`); which allocation the daemon
 * runs is a separate act — Set active, on the record. Delete holds behind
 * the toast; the one the daemon runs is refused, and says so.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { InspectorField } from '@bifrost/ui'
import { fetchAllocation, updateAllocation } from '@/api/strategy'
import {
  allocationDetailKey,
  allocationFormToPayload,
  allocationToForm,
  type AllocationFormState,
} from '@/components/strategy/allocations/allocationForm'
import { useGateSafety, useOpportunities } from '@/hooks/useStrategies'
import { useLiveEdit } from '@/hooks/useLiveEdit'
import { cn } from '@/lib/utils'
import { FIELD, RuleInspector } from './RuleInspector'

export function AllocationInspector({
  id,
  runByDaemon,
  onClose,
  onDelete,
  onSaved,
}: {
  id: number
  /** The allocation the daemon's settings run — it cannot be deleted. */
  runByDaemon: boolean
  onClose: () => void
  onDelete: (name: string) => void
  onSaved: () => void
}) {
  const q = useQuery({ queryKey: allocationDetailKey(id), queryFn: () => fetchAllocation(id), staleTime: 30_000 })
  return (
    <RuleInspector
      title={q.data ? `Allocation · ${q.data.name}` : `Allocation · ${id}`}
      meta="PUT /strategy/allocations"
      onClose={onClose}
      loading={!q.data}
      onDelete={q.data ? () => onDelete(q.data.name) : undefined}
      deleteBlocked={runByDaemon ? 'The daemon runs this allocation — set another one active first.' : null}
      note="Edits change the definition only — which allocation the daemon runs is Set active on the record, picked up on its next start. Both limits are gate rows on Risk › Limits while it runs."
    >
      {q.data ? <AllocationFields key={id} id={id} initial={allocationToForm(q.data)} onSaved={onSaved} /> : null}
    </RuleInspector>
  )
}

function AllocationFields({
  id,
  initial,
  onSaved,
}: {
  id: number
  initial: AllocationFormState
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const opps = useOpportunities().data?.items ?? []
  const gates = useGateSafety().data?.items ?? []
  const { draft, edit } = useLiveEdit<AllocationFormState>({
    initial,
    undoKey: `alloc:${id}`,
    ready: (d) => d.name.trim() !== '',
    write: (d) => updateAllocation(id, allocationFormToPayload(d)),
    onSaved: () => {
      void qc.invalidateQueries({ queryKey: allocationDetailKey(id) })
      onSaved()
    },
  })
  const picked = new Set(draft.opportunityIds)

  return (
    <>
      <InspectorField label="Name">
        <input className={FIELD} value={draft.name} onChange={(e) => edit('name', (d) => ({ ...d, name: e.target.value }))} />
      </InspectorField>
      <InspectorField
        label="Opportunities in this allocation"
        hint={
          picked.size
            ? `${picked.size} picked — each keeps its own conditions; the allocation only bundles and bounds them`
            : 'Pick at least one — an empty allocation runs nothing'
        }
      >
        <span className="flex flex-wrap gap-1.5">
          {opps.map((o) => {
            const on = picked.has(o.strategy_opportunity_id)
            return (
              <button
                key={o.strategy_opportunity_id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  edit('opps', (d) => ({
                    ...d,
                    opportunityIds: on
                      ? d.opportunityIds.filter((x) => x !== o.strategy_opportunity_id)
                      : [...d.opportunityIds, o.strategy_opportunity_id],
                  }))
                }
                className={cn(
                  'h-6 rounded-full px-2.5 text-dense-meta transition-colors active:[filter:var(--press)]',
                  on
                    ? 'bg-[color-mix(in_srgb,var(--sk-accent)_18%,transparent)] text-[var(--sk-accent)]'
                    : 'bg-[var(--mat-btn-fill)] text-[var(--sk-mute2)] hover:text-foreground',
                )}
              >
                {o.name}
              </button>
            )
          })}
        </span>
      </InspectorField>
      <InspectorField label="Gate">
        <select
          className={FIELD}
          value={draft.gateSafetyId ?? ''}
          onChange={(e) => edit('gate', (d) => ({ ...d, gateSafetyId: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">No gate</option>
          {gates.map((g) => (
            <option key={g.gate_safety_strategy_id} value={g.gate_safety_strategy_id}>
              {g.name} · v{g.version}
            </option>
          ))}
        </select>
      </InspectorField>
      <div className="grid grid-cols-2 gap-3">
        <InspectorField label="Max positions">
          <input
            className={cn(FIELD, 'font-mono tabular-nums')}
            inputMode="numeric"
            value={draft.maxPositions}
            onChange={(e) => edit('maxPositions', (d) => ({ ...d, maxPositions: e.target.value.replace(/[^\d]/g, '') }))}
          />
        </InspectorField>
        <InspectorField label="Max buying power %">
          <input
            className={cn(FIELD, 'font-mono tabular-nums')}
            inputMode="decimal"
            value={draft.maxBpPct}
            onChange={(e) => edit('maxBpPct', (d) => ({ ...d, maxBpPct: e.target.value.replace(/[^\d.]/g, '') }))}
          />
        </InspectorField>
      </div>
    </>
  )
}
