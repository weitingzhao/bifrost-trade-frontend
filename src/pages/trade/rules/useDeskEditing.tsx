/**
 * The Desk's editing (design Rev .140, §17.5): select = edit, delete without
 * asking, every act through the toast and ⌘Z.
 *
 * - The picked structure / opportunity / allocation opens its inspector; the
 *   allocation's Edit gate opens the gate's in its place. One at a time.
 * - Delete holds: the object leaves the chain at once and DELETE goes when the
 *   toast leaves without Undo (Owner 2026-10-01). An object in use is refused
 *   before anything is held, in the server's words — an opportunity with
 *   trades, the allocation the daemon runs, a gate set in use; a deleted
 *   opportunity also leaves its allocations, and Undo puts both back.
 * - Activate / Deactivate, Set active, Duplicate, a deleted empty trade: done
 *   at once, and the toast's Undo (or ⌘Z) reverses them.
 * - Emergency flatten keeps its confirm (it is on the Desk, not here).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createGateSafety,
  fetchGateSafetyFull,
  createOpportunity,
  createStructure,
  fetchStructure,
  updateStructure,
  deleteAllocation,
  deleteGateSafety,
  deleteOpportunity,
  deleteStrategyInstance,
  fetchOpportunityDetail,
  putOpportunity,
  setActiveAllocation,
} from '@/api/strategy'
import type { ChainData } from '@/hooks/useRulesChain'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'
import { notify } from '@/lib/shellNotify'
import type { StatusResponse } from '@/types/monitor'
import type { StrategyInstance, StrategyOpportunityDetail } from '@/types/strategy'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { ChainSelection } from './rulesChain'
import { planActive } from './SetActiveDialog'
import { AllocationInspector } from './inspector/AllocationInspector'
import { gateInUseReason, withoutHeld } from './deskEditModel'
import { structureFormToPayload, structureToForm } from '@/components/strategy/structures/structureForm'
import { gateFormToPayload, gateToForm } from '@/components/strategy/gates/gateForm'

const HELD = {
  opportunity: 'rules-opportunity',
  allocation: 'rules-allocation',
  gate: 'rules-gate',
  instance: 'rules-instance',
} as const

type Kind = 'structure' | 'opportunity' | 'allocation'
const EDITABLE: readonly Kind[] = ['structure', 'opportunity', 'allocation']

function opportunityBody(d: StrategyOpportunityDetail, over: Partial<{ name: string; is_active: boolean }> = {}) {
  return {
    name: over.name ?? d.name,
    strategy_structure_id: d.strategy_structure_id ?? 0,
    default_gate_safety_strategy_id: d.default_gate_safety_strategy_id,
    scope_type: d.scope_type,
    symbols: d.symbols ?? [],
    entry_conditions: d.entry_conditions ?? [],
    is_active: over.is_active ?? d.is_active,
  }
}

const said = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function useDeskEditing({
  data,
  rawInstances,
  status,
  sel,
  pick,
  renderStructure,
  renderOpportunity,
  renderGate,
}: {
  data: ChainData
  rawInstances: StrategyInstance[]
  status: StatusResponse | undefined
  sel: ChainSelection | null
  pick: (s: ChainSelection) => void
  /** The three inspectors built beside this one, injected so this file stays the wiring. */
  renderStructure?: (p: { id: number; onClose: () => void; onDuplicate: () => void; onSaved: () => void }) => ReactNode
  renderOpportunity?: (p: {
    id: number
    tradeCount: number
    onClose: () => void
    onDelete: (name: string) => void
    onDuplicate: () => void
    onSaved: () => void
  }) => ReactNode
  renderGate?: (p: {
    id: number
    deleteBlocked: string | null
    onClose: () => void
    onDelete: (name: string) => void
    onDuplicate: () => void
    onSaved: () => void
  }) => ReactNode
}) {
  const qc = useQueryClient()
  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['trade', 'rulesChain'] })
    void qc.invalidateQueries({ queryKey: ['strategy'] })
  }, [qc])

  const opp = useHeldRemoval(HELD.opportunity)
  const alloc = useHeldRemoval(HELD.allocation)
  const gate = useHeldRemoval(HELD.gate)
  const inst = useHeldRemoval(HELD.instance)

  /** The chain as it reads with the held deletes already gone. */
  const view = useMemo(
    () =>
      withoutHeld(data, rawInstances, {
        opportunity: opp.isHeld,
        allocation: alloc.isHeld,
        gate: gate.isHeld,
        instance: inst.isHeld,
      }),
    [data, rawInstances, opp.isHeld, alloc.isHeld, gate.isHeld, inst.isHeld],
  )

  const daemonAllocationId = status?.strategy?.active?.allocation?.id ?? null
  const daemonGateId = status?.strategy?.active?.gate_safety?.id ?? null

  // ── Which inspector is open ─────────────────────────────────────────────
  const selKey = sel && sel.id != null ? `${sel.kind}:${sel.id}` : null
  const [closedFor, setClosedFor] = useState<string | null>(null)
  const [gateFor, setGateFor] = useState<{ id: number; key: string | null } | null>(null)
  const openGateId = gateFor && gateFor.key === selKey ? gateFor.id : null
  const editing =
    sel && sel.id != null && (EDITABLE as readonly string[]).includes(sel.kind) && closedFor !== selKey
      ? { kind: sel.kind as Kind, id: sel.id }
      : null
  const close = () => {
    setGateFor(null)
    setClosedFor(selKey)
  }
  const reopen = () => setClosedFor(null)
  const openGate = (id: number) => setGateFor({ id, key: selKey })

  // ── Refusals said before anything is held ───────────────────────────────
  const tradesOn = (id: number) => view.data.instances.filter((i) => i.opportunityId === id).length
  const gateUsers = (id: number) => gateInUseReason(view.data, id, daemonGateId)

  // ── Deletes (held) ──────────────────────────────────────────────────────
  const deleteOpp = (id: number, name: string) => {
    const n = tradesOn(id)
    if (n) {
      notify(`${name} has ${n} trade${n === 1 ? '' : 's'} — deactivate it instead; a rule with trades stays.`)
      return
    }
    close()
    opp.hold(id, {
      msg: `Deleted ${name} — and took it out of its allocations`,
      commit: () => deleteOpportunity(id),
      invalidate: [['trade', 'rulesChain'], ['strategy']],
      failed: `${name} was not deleted`,
    })
  }
  const deleteAlloc = (id: number, name: string) => {
    if (id === daemonAllocationId) {
      notify(`${name} is the allocation the daemon runs — set another one active first.`)
      return
    }
    close()
    alloc.hold(id, {
      msg: `Deleted ${name} — its opportunities and trades are untouched`,
      commit: () => deleteAllocation(id),
      invalidate: [['trade', 'rulesChain'], ['strategy']],
      failed: `${name} was not deleted`,
    })
  }
  const deleteGate = (id: number, name: string) => {
    const why = gateUsers(id)
    if (why) {
      notify(`${name}: ${why}`)
      return
    }
    setGateFor(null)
    gate.hold(id, {
      msg: `Deleted gate set ${name}`,
      commit: () => deleteGateSafety(id),
      invalidate: [['trade', 'rulesChain'], ['strategy']],
      failed: `Gate set ${name} was not deleted`,
    })
  }
  /** An empty trade goes without a confirm; one with fills is refused (unlink on the Ledger first). */
  const deleteTrade = (id: number) => {
    const reading = view.data.instances.find((r) => r.id === id)
    if ((reading?.fills ?? 0) > 0) {
      notify(`#${id} has ${reading?.fills} fills linked — unlink them on the Ledger first.`)
      return
    }
    inst.hold(id, {
      msg: `Deleted trade #${id}`,
      commit: () => deleteStrategyInstance(id),
      invalidate: [['trade', 'rulesChain'], ['strategy']],
      failed: `Trade #${id} was not deleted`,
    })
  }

  // ── Done at once, undone by the toast ───────────────────────────────────
  const setOppActive = async (id: number, on: boolean) => {
    try {
      const d = await fetchOpportunityDetail(id)
      await putOpportunity(id, opportunityBody(d, { is_active: on }))
      refresh()
      notify(`${on ? 'Activated' : 'Deactivated'} ${d.name}${on ? '' : ' — no new trades; running ones keep going'}`, {
        undo: () =>
          void putOpportunity(id, opportunityBody(d))
            .then(refresh)
            .catch((e: unknown) => notify(`Not undone — ${said(e)}`)),
      })
    } catch (e) {
      notify(`Not changed — ${said(e)}`)
    }
  }
  const duplicateOpp = async (id: number) => {
    try {
      const d = await fetchOpportunityDetail(id)
      const name = `${d.name} (copy)`
      const { strategy_opportunity_id: copy } = await createOpportunity(opportunityBody(d, { name, is_active: false }))
      refresh()
      setClosedFor(null)
      pick({ kind: 'opportunity', id: copy })
      notify(`Duplicated as ${name} — inactive until you turn it on`, {
        undo: () =>
          void deleteOpportunity(copy)
            .then(refresh)
            .catch((e: unknown) => notify(`Copy not removed — ${said(e)}`)),
      })
    } catch (e) {
      notify(`Not duplicated — ${said(e)}`)
    }
  }
  /** A structure's payload as saved, with a change — every write carries the whole shape. */
  const structureWrite = async (id: number, over: { name?: string; isActive?: boolean }) => {
    const f = structureToForm(await fetchStructure(id), null)
    return {
      before: structureFormToPayload(f),
      after: structureFormToPayload({ ...f, name: over.name ?? f.name, isActive: over.isActive ?? f.isActive }),
    }
  }
  const structChanged = (id: number) => {
    refresh()
    void qc.invalidateQueries({ queryKey: ['strategy', 'structure', id] })
  }
  const setStructActive = async (id: number, on: boolean) => {
    try {
      const { before, after } = await structureWrite(id, { isActive: on })
      await updateStructure(id, after)
      structChanged(id)
      notify(`${on ? 'Activated' : 'Deactivated'} ${after.name}${on ? '' : ' — hidden from new opportunities'}`, {
        undo: () =>
          void updateStructure(id, before)
            .then(() => structChanged(id))
            .catch((e: unknown) => notify(`Not undone — ${said(e)}`)),
      })
    } catch (e) {
      notify(`Not changed — ${said(e)}`)
    }
  }
  /** A real copy, opened here. Structures have no hard delete, so Undo takes the copy off the books. */
  const duplicateStruct = async (id: number) => {
    try {
      const f = structureToForm(await fetchStructure(id), null)
      const name = `${f.name} (copy)`
      const { strategy_structure_id: copy } = await createStructure(structureFormToPayload({ ...f, name }))
      refresh()
      setClosedFor(null)
      pick({ kind: 'structure', id: copy })
      notify(`Duplicated as ${name}`, {
        undo: () =>
          void structureWrite(copy, { isActive: false })
            .then(({ after }) => updateStructure(copy, after))
            .then(() => structChanged(copy))
            .catch((e: unknown) => notify(`Copy not taken off — ${said(e)}`)),
      })
    } catch (e) {
      notify(`Not duplicated — ${said(e)}`)
    }
  }

  /** Duplicate set: a real copy at v1-as-saved, opened in the gate inspector; Undo deletes it (nothing points at it yet). */
  const duplicateGate = async (id: number) => {
    try {
      const f = gateToForm(await fetchGateSafetyFull(id), { copy: true })
      const r = await createGateSafety(gateFormToPayload(f))
      const copy = r.gate_safety_strategy_id
      if (copy == null) throw new Error(r.error ?? 'no id returned')
      refresh()
      setGateFor({ id: copy, key: selKey })
      notify(`Duplicated as ${f.name} — point an allocation at it`, {
        undo: () => {
          setGateFor(null)
          void deleteGateSafety(copy)
            .then(refresh)
            .catch((e: unknown) => notify(`Copy not removed — ${said(e)}`))
        },
      })
    } catch (e) {
      notify(`Not duplicated — ${said(e)}`)
    }
  }

  /** Set active / Clear active: the daemon's settings, read on its next start. */
  const setActive = async (id: number | null) => {
    const current = status?.strategy?.active
    const before = {
      allocationId: current?.allocation?.id ?? null,
      structureId: current?.structure?.id ?? null,
      gateSafetyId: current?.gate_safety?.id ?? null,
    }
    const plan = planActive(view.data, id, before.structureId)
    try {
      await setActiveAllocation(plan.allocationId, { structureId: plan.structureId, gateSafetyId: plan.gateId })
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
      notify(
        plan.allocationId == null
          ? 'Cleared the active allocation — the daemon loads none on its next start'
          : `Set active: ${plan.allocationName} — the daemon picks it up on next start`,
        {
          undo: () =>
            void setActiveAllocation(before.allocationId, {
              structureId: before.structureId,
              gateSafetyId: before.gateSafetyId,
            })
              .then(() => qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status }))
              .catch((e: unknown) => notify(`Not undone — ${said(e)}`)),
        },
      )
    } catch (e) {
      notify(`Not set — ${said(e)}`)
    }
  }

  // ── The inspector on screen ─────────────────────────────────────────────
  let inspector: ReactNode = null
  if (openGateId != null && renderGate) {
    inspector = renderGate({
      id: openGateId,
      deleteBlocked: gateUsers(openGateId),
      onClose: close,
      onDelete: (name) => deleteGate(openGateId, name),
      onDuplicate: () => void duplicateGate(openGateId),
      onSaved: refresh,
    })
  } else if (editing?.kind === 'allocation') {
    inspector = (
      <AllocationInspector
        key={editing.id}
        id={editing.id}
        runByDaemon={editing.id === daemonAllocationId}
        onClose={close}
        onDelete={(name) => deleteAlloc(editing.id, name)}
        onSaved={refresh}
      />
    )
  } else if (editing?.kind === 'opportunity' && renderOpportunity) {
    inspector = renderOpportunity({
      id: editing.id,
      tradeCount: tradesOn(editing.id),
      onClose: close,
      onDelete: (name) => deleteOpp(editing.id, name),
      onDuplicate: () => void duplicateOpp(editing.id),
      onSaved: refresh,
    })
  } else if (editing?.kind === 'structure' && renderStructure) {
    inspector = renderStructure({
      id: editing.id,
      onClose: close,
      onDuplicate: () => void duplicateStruct(editing.id),
      onSaved: refresh,
    })
  }

  return {
    view,
    inspector,
    inspectorOpen: inspector != null,
    reopen,
    openGate,
    setOppActive: (id: number, on: boolean) => void setOppActive(id, on),
    duplicateOpp: (id: number) => void duplicateOpp(id),
    setStructActive: (id: number, on: boolean) => void setStructActive(id, on),
    duplicateStruct: (id: number) => void duplicateStruct(id),
    setActive: (id: number | null) => void setActive(id),
    duplicateGate: (id: number) => void duplicateGate(id),
    deleteTrade,
  }
}
