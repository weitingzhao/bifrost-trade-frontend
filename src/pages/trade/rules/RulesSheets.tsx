/**
 * The sheets the Rules page still opens: New (＋ in a column, and ＋ New
 * gate), the Desk's Plan-this hand-over, and New trade (design Rev .140:
 * "new = sheet"). Editing moved to the inspectors (`inspector/*`, select =
 * edit); the sheets and the inspectors share each object's field mapping
 * (allocationForm · opportunityForm · gateForm · structureForm), so a rule
 * made here and one edited there are one definition of valid.
 *
 * D10 is not in play — a rule is a rulebook entry, not an order.
 */
import { useQueryClient } from '@tanstack/react-query'
import { AllocationFormModal } from '@/components/strategy/AllocationFormModal'
import { TradeCreateModal } from '@/components/strategy/TradeCreateModal'
import { OpportunityFormModal, type PrefillData } from '@/components/strategy/OpportunityFormModal'
import { StructureFormSheet, type StructureFormMode } from '@/components/strategy/StructureFormSheet'
import { GateSetFormSheet, type GateSheetMode } from '@/components/strategy/gates/GateSetFormSheet'
import type { StatusResponse } from '@/types/monitor'
import type { StrategyOpportunity } from '@/types/strategy'

/** Which sheet is open, and on what. */
export type RulesSheet =
  | { kind: 'none' }
  | { kind: 'structure'; mode: StructureFormMode }
  | { kind: 'opportunity'; initial?: StrategyOpportunity; prefill?: PrefillData }
  | { kind: 'allocation'; mode: 'create' | 'edit'; editId: number | null }
  | { kind: 'gate'; mode: GateSheetMode }
  | { kind: 'instance' }

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
    return <GateSetFormSheet mode={sheet.mode} onClose={saved} />
  }
  if (sheet.kind === 'instance') {
    return <TradeCreateModal open onOpenChange={(next) => (next ? undefined : saved())} status={status} />
  }
  return null
}
