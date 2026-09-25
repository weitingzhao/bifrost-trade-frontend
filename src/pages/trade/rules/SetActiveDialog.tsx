/**
 * Which allocation the daemon runs — the one active switch the design keeps.
 *
 * Design DECISIONS 2026-09-18: `设计只保留 allocation 单一 active 开关，gate 挂
 * allocation、structure 由 opportunity 决定`. So the gate written alongside is
 * the allocation's own, and the structure is derived only when every
 * opportunity under the allocation names the same one — an allocation that
 * mixes shapes has no single structure, and inventing one would tell the daemon
 * something the rulebook does not say.
 *
 * This is a rulebook write, not an order: it changes what the daemon will load
 * on its next start. D10 is not in play, and the daemon is at zero replicas
 * outside DEV regardless. The confirm exists because the endpoint overwrites
 * all three fields at once, so the reader should see all three before it does.
 */
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { setActiveAllocation } from '@/api/strategy'
import { positionsUi } from '@/components/positions/positionsUi'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ChainData } from '@/hooks/useRulesChain'

/** What the three fields will be set to, and why each one is what it is. */
export interface ActivePlan {
  allocationId: number | null
  allocationName: string
  gateId: number | null
  gateLabel: string
  structureId: number | null
  structureLabel: string
}

export function planActive(d: ChainData, allocationId: number | null, currentStructureId: number | null): ActivePlan {
  const a = allocationId == null ? null : d.allocations.find((x) => x.strategy_allocation_id === allocationId) ?? null
  if (a == null) {
    return {
      allocationId: null,
      allocationName: 'none',
      gateId: null,
      gateLabel: 'cleared',
      structureId: null,
      structureLabel: 'cleared',
    }
  }
  const gate = d.gates.find((g) => g.gate_safety_strategy_id === a.gate_safety_strategy_id) ?? null
  const opps = (a.strategy_opportunity_ids ?? [])
    .map((id) => d.opportunities.find((o) => o.strategy_opportunity_id === id))
    .filter((o): o is NonNullable<typeof o> => o != null)
  const structureIds = [...new Set(opps.map((o) => o.strategy_structure_id).filter((v): v is number => v != null))]
  const single = structureIds.length === 1 ? structureIds[0] : null
  const structure = single == null ? null : d.structures.find((s) => s.strategy_structure_id === single) ?? null
  return {
    allocationId: a.strategy_allocation_id,
    allocationName: a.name,
    gateId: gate?.gate_safety_strategy_id ?? null,
    gateLabel: gate ? `${gate.name} · v${gate.version}` : 'none — this allocation carries no gate',
    // Not derivable is not the same as none: leaving what is there beats
    // clearing a field this side cannot speak for.
    structureId: single ?? currentStructureId,
    structureLabel:
      structure != null
        ? structure.name
        : structureIds.length > 1
          ? `left as it is — its ${structureIds.length} opportunities name different shapes`
          : 'left as it is — no opportunity under it names a structure',
  }
}

export function SetActiveDialog({
  open,
  data,
  allocationId,
  currentStructureId,
  onClose,
}: {
  open: boolean
  data: ChainData
  allocationId: number | null
  currentStructureId: number | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const plan = useMemo(
    () => planActive(data, allocationId, currentStructureId),
    [data, allocationId, currentStructureId],
  )

  async function apply() {
    setBusy(true)
    setError(null)
    try {
      await setActiveAllocation(plan.allocationId, {
        structureId: plan.structureId,
        gateSafetyId: plan.gateId,
      })
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={plan.allocationId == null ? 'Clear the active allocation' : `Set active · ${plan.allocationName}`}
      message={
        plan.allocationId == null
          ? 'The daemon will have no allocation to load on its next start. Nothing is sent to the broker.'
          : 'This is what the daemon loads on its next start. It writes the rulebook’s config and sends nothing to the broker.'
      }
      confirmVariant="default"
      confirmLabel={plan.allocationId == null ? 'Clear it' : 'Set active'}
      confirming={busy}
      bodyExtra={
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 border px-2.5 py-2 text-dense-meta leading-normal mat-card">
            {[
              { k: 'Allocation', v: plan.allocationName },
              { k: 'Gate', v: plan.gateLabel },
              { k: 'Structure', v: plan.structureLabel },
            ].map((r) => (
              <span key={r.k} className="flex justify-between gap-3">
                <span className="flex-none text-muted-foreground">{r.k}</span>
                <span className="min-w-0 text-right text-secondary-foreground text-pretty">{r.v}</span>
              </span>
            ))}
            <span className="flex justify-between gap-3">
              <span className="flex-none text-muted-foreground">Writes</span>
              <span className={positionsUi.mono}>settings · active-strategy</span>
            </span>
          </div>
          <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
            The endpoint sets all three at once, which is why all three are named here. Being on the books is a
            different flag and is edited in the allocation’s own form.
          </p>
          {error ? <p className="m-0 text-dense-meta text-danger text-pretty">{error}</p> : null}
        </div>
      }
      onConfirm={() => void apply()}
      onCancel={onClose}
    />
  )
}
