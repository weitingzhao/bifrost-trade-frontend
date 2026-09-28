/**
 * The instance face as Rules shows it (design Rev .101): the header facts the
 * rulebook knows about an instance, and the right sheet the list's eye opens —
 * stepping the rows it came from, with Open in Rules and Ran under leading
 * back into the chain. The face itself is the shared `InstanceRecord`.
 */
import { InstanceRecord, type InstanceRecordAction } from '@/components/instanceRecord/InstanceRecord'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import type { StrategyInstance } from '@/types/positions'
import type { ChainData, ChainSelection } from './rulesChain'

export interface SheetRec {
  id: number
  ids: number[]
  from: string
}

/** Title, opportunity and structure — what the face heads itself with. */
export function instanceFaceOf(data: ChainData, id: number) {
  const reading = data.instances.find((r) => r.id === id)
  const opp = reading ? data.opportunities.find((o) => o.strategy_opportunity_id === reading.opportunityId) : undefined
  return {
    title: `#${id}${reading ? ` · ${reading.symbolish}` : ''}`,
    opportunity: opp?.name ?? reading?.opportunityName ?? '—',
    structure: opp?.structure_name ?? reading?.structureName ?? '—',
  }
}

/** The allocation and gate an instance ran under — or that it ran outside the rules. */
export function ranUnderOf(data: ChainData, id: number) {
  const reading = data.instances.find((r) => r.id === id)
  const al = reading ? data.allocations.find((a) => (a.strategy_opportunity_ids ?? []).includes(reading.opportunityId)) : undefined
  const g = al ? data.gates.find((x) => x.gate_safety_strategy_id === al.gate_safety_strategy_id) : undefined
  return al
    ? { alloc: `in ${al.name} · gate ${g ? `${g.name} v${g.version}` : 'none'}`, warn: false }
    : { alloc: 'in no allocation — ran outside rules, no gate', warn: true }
}

export function RulesInstanceSheet({
  rec,
  data,
  rawInstances,
  actions,
  onClose,
  onStep,
  onPick,
}: {
  rec: SheetRec | null
  data: ChainData
  rawInstances: readonly StrategyInstance[]
  actions: (id: number) => InstanceRecordAction[]
  onClose: () => void
  onStep: (dir: -1 | 1) => void
  onPick: (sel: ChainSelection, sib?: { ids: number[]; from: string }) => void
}) {
  const inst = rec ? rawInstances.find((r) => r.strategy_instance_id === rec.id) : undefined
  if (!rec || !inst) return null
  const id = inst.strategy_instance_id
  const j = rec.ids.indexOf(rec.id)
  const reading = data.instances.find((r) => r.id === rec.id)
  return (
    <RightInspectorShell open ariaLabel="Instance record" onClose={onClose}>
      <InstanceRecord
        key={id}
        instance={inst}
        mode="sheet"
        {...instanceFaceOf(data, id)}
        pos={`${j + 1} / ${rec.ids.length}`}
        from={rec.from}
        onPrev={j > 0 ? () => onStep(-1) : undefined}
        onNext={j < rec.ids.length - 1 ? () => onStep(1) : undefined}
        onClose={onClose}
        onFull={() => {
          onClose()
          onPick({ kind: 'instance', id }, { ids: rec.ids, from: rec.from })
        }}
        ranUnder={{
          ...ranUnderOf(data, id),
          onOpp: reading
            ? () => {
                onClose()
                onPick({ kind: 'opportunity', id: reading.opportunityId })
              }
            : undefined,
        }}
        actions={actions(id)}
      />
    </RightInspectorShell>
  )
}
