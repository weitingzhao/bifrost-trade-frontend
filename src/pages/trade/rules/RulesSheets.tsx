/**
 * The edit sheets behind the four columns.
 *
 * Design DECISIONS 2026-09-18: the seven `/strategy/*` CRUD pages become edit
 * entries behind each column of the chain. They are **not rewritten** here —
 * the forms already exist and are the same ones those pages open, so a rule
 * edited from the chain and one edited from the old page are the same write
 * with the same validation. Rewriting them would have produced a second
 * definition of what a valid structure is, which is the thing the chain exists
 * to prevent.
 *
 * What this file adds is the mapping: which column opens which sheet, for a new
 * one and for the one that is selected. One place holds it, so the column
 * headers and the detail panel cannot disagree about what "Edit" means.
 *
 * D10 is not in play — a rule is a rulebook entry, not an order. Activating an
 * allocation is what the daemon reads on its next start, and that is why it
 * lives behind a form with a confirm rather than behind a card click.
 */
import { useQueryClient } from '@tanstack/react-query'
import { AllocationFormModal } from '@/components/strategy/AllocationFormModal'
import { InstanceCreateModal } from '@/components/strategy/InstanceCreateModal'
import { OpportunityFormModal, type PrefillData } from '@/components/strategy/OpportunityFormModal'
import { StructureFormSheet, type StructureFormMode } from '@/components/strategy/StructureFormSheet'
import { GateSafetyFormSheet, type GateSheetMode } from '@/components/strategy/gates/GateSafetyFormSheet'
import type { StatusResponse } from '@/types/monitor'
import { InstanceDeleteModal } from '@/components/strategy/InstanceDeleteModal'
import type { StrategyInstance, StrategyOpportunity } from '@/types/strategy'

/** Which sheet is open, and on what. */
export type RulesSheet =
  | { kind: 'none' }
  | { kind: 'structure'; mode: StructureFormMode }
  | { kind: 'opportunity'; initial?: StrategyOpportunity; prefill?: PrefillData }
  | { kind: 'allocation'; mode: 'create' | 'edit'; editId: number | null }
  | { kind: 'gate'; mode: GateSheetMode }
  | { kind: 'instance' }
  | { kind: 'instanceDelete'; instance: StrategyInstance }

export const NO_SHEET: RulesSheet = { kind: 'none' }

export function RulesSheets({
  sheet,
  onClose,
  status,
}: {
  sheet: RulesSheet
  onClose: () => void
  status: StatusResponse | undefined
}) {
  const queryClient = useQueryClient()

  /**
   * A write anywhere in the chain moves the chain, so the page's own read is
   * invalidated alongside whatever the form invalidates for its old page.
   */
  const saved = () => {
    void queryClient.invalidateQueries({ queryKey: ['trade', 'rulesChain'] })
    void queryClient.invalidateQueries({ queryKey: ['strategy'] })
    onClose()
  }

  if (sheet.kind === 'structure') {
    return <StructureFormSheet mode={sheet.mode} onClose={onClose} onSaved={saved} />
  }
  if (sheet.kind === 'opportunity') {
    return <OpportunityFormModal open onClose={saved} initial={sheet.initial} prefill={sheet.prefill} />
  }
  if (sheet.kind === 'allocation') {
    return (
      <AllocationFormModal mode={sheet.mode} editId={sheet.editId} open onClose={onClose} onSaved={saved} />
    )
  }
  if (sheet.kind === 'gate') {
    return <GateSafetyFormSheet mode={sheet.mode} onClose={saved} />
  }
  if (sheet.kind === 'instanceDelete') {
    return (
      <InstanceDeleteModal instance={sheet.instance} onOpenChange={(next) => (next ? undefined : saved())} />
    )
  }
  if (sheet.kind === 'instance') {
    return <InstanceCreateModal open onOpenChange={(next) => (next ? undefined : saved())} status={status} />
  }
  return null
}
