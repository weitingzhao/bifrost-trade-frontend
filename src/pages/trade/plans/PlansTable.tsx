/**
 * The plan table.
 *
 * `Cash / margin` is the cash a secured put reserves — strike × 100 × ratio ×
 * qty, off the plan's own legs (the figure the plan card shows). A plan with
 * no short put reserves no cash; its margin is what no service estimates, so
 * it reads `—` with that reason. `Pressure after` needs that margin and stays
 * `Not computed`. The prototype's "Ceiling 70%" footnote is not here: the
 * Owner's pressure ceiling is 50% and adjustable.
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
import { planLegsText, planSourceText, planStatusVariant, planWhenText, planWhenTone } from './planRows'
import { planCashSecured } from './planCardModel'

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

/** The cash a secured put reserves; `—` with the reason for anything else. */
function CashCell({ plan }: { plan: StrategyPlan }) {
  const cash = planCashSecured(plan)
  if (cash == null) {
    return (
      <span className="text-muted-foreground" title="No short put — no cash reserved. A plan's margin is not estimated.">
        —
      </span>
    )
  }
  return (
    <span className="font-mono text-foreground" title="Cash secured: strike × 100 × ratio × qty">
      ${Math.round(cash).toLocaleString('en-US')}
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
          <DenseTableHead className="text-right">Cash / margin</DenseTableHead>
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
              // Rev .84: the picked row is the accent, mixed — never a lime fallback.
              plan.strategy_plan_id === selectedId && 'bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)]',
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
            <DenseTableCell className="text-right">
              <CashCell plan={plan} />
            </DenseTableCell>
            <DenseTableCell>
              <NotComputedCell />
            </DenseTableCell>
            <DenseTableCell className="text-dense-micro text-muted-foreground">
              {planSourceText(plan)}
            </DenseTableCell>
            <DenseTableCell
              className={cn(
                'font-mono text-dense-micro',
                planWhenTone(plan.effective_status) === 'warning'
                  ? 'text-warning'
                  : 'text-muted-foreground',
              )}
            >
              {planWhenText(plan)}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
