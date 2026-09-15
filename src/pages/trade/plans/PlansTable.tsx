/**
 * The plan table.
 *
 * Two columns the design asks for are grey: no service estimates the margin a
 * single plan would add, so `Cash / margin` and `Pressure after` say
 * `Not computed` with the reason in the tooltip rather than showing a number
 * the desk would trade on. The prototype's "Ceiling 70%" footnote is not here:
 * the Owner's pressure ceiling is 50% and adjustable, and neither column is
 * computed this round anyway.
 */
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
} from '@/components/data-display'
import { planEstCredit, planStatusLabel } from '@/lib/plans/planMath'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { cn } from '@/lib/utils'
import { planLegsText, planSourceText, planStatusVariant, planWhenText } from './planRows'

export const NOT_COMPUTED = 'Not computed'
export const NOT_COMPUTED_HINT =
  'Needs a per-plan margin estimate; no service computes it yet.'

function CreditCell({ plan }: { plan: StrategyPlan }) {
  const credit = planEstCredit(plan)
  if (credit == null) {
    return <span className="text-muted-foreground" title="No limit price on this plan yet.">—</span>
  }
  return (
    <span className={cn('font-mono', credit < 0 ? 'text-loss' : 'text-profit')}>
      {credit < 0 ? '-' : '+'}${Math.abs(credit).toLocaleString('en-US')}
    </span>
  )
}

function NotComputedCell() {
  return (
    <span className="text-muted-foreground" title={NOT_COMPUTED_HINT}>
      {NOT_COMPUTED}
    </span>
  )
}

export function PlansTable({
  plans,
  selectedId,
  onSelect,
}: {
  plans: readonly StrategyPlan[]
  selectedId: number | null
  onSelect: (plan: StrategyPlan) => void
}) {
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Status</DenseTableHead>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead>Structure</DenseTableHead>
          <DenseTableHead>Legs</DenseTableHead>
          <DenseTableHead className="text-right">Qty</DenseTableHead>
          <DenseTableHead>Acct</DenseTableHead>
          <DenseTableHead className="text-right">Est. credit</DenseTableHead>
          <DenseTableHead>Cash / margin</DenseTableHead>
          <DenseTableHead>Pressure after</DenseTableHead>
          <DenseTableHead>Source</DenseTableHead>
          <DenseTableHead>Expires / filled</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {plans.map((plan) => (
          <DenseTableRow
            key={plan.strategy_plan_id}
            onClick={() => onSelect(plan)}
            className={cn(
              'cursor-pointer',
              plan.strategy_plan_id === selectedId && 'bg-primary/5',
            )}
          >
            <DenseTableCell>
              <DenseTag variant={planStatusVariant(plan.effective_status)}>
                {planStatusLabel(plan.effective_status)}
              </DenseTag>
            </DenseTableCell>
            <DenseTableCell className="font-mono font-semibold">{plan.symbol}</DenseTableCell>
            <DenseTableCell>{plan.structure_label}</DenseTableCell>
            <DenseTableCell className="font-mono text-dense-micro">
              {planLegsText(plan.legs_json)}
            </DenseTableCell>
            <DenseTableCell className="text-right font-mono">{plan.qty}</DenseTableCell>
            <DenseTableCell className="font-mono text-dense-micro">{plan.account_id}</DenseTableCell>
            <DenseTableCell className="text-right">
              <CreditCell plan={plan} />
            </DenseTableCell>
            <DenseTableCell>
              <NotComputedCell />
            </DenseTableCell>
            <DenseTableCell>
              <NotComputedCell />
            </DenseTableCell>
            <DenseTableCell className="text-dense-micro text-muted-foreground">
              {planSourceText(plan)}
            </DenseTableCell>
            <DenseTableCell className="font-mono text-dense-micro text-muted-foreground">
              {planWhenText(plan)}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
