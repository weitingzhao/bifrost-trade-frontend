/**
 * One plan, opened.
 *
 * Everything here is the plan as written plus what the server says about it.
 * The actions that appear are the ones the plan's state allows, and a refusal
 * is shown in the server's own words — the desk does not restate the rule.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { useAllocations, useStrategyInstances, useOpportunities } from '@/hooks/useStrategies'
import {
  useCancelStrategyPlan,
  useIntendStrategyPlan,
  useLinkStrategyPlanFill,
} from '@/hooks/useStrategyPlans'
import { instancesTradingSymbol } from '@/lib/plans/planLinkFill'
import { planEstCredit, planExitSummary, planStatusLabel } from '@/lib/plans/planMath'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { cn } from '@/lib/utils'
import { NOT_COMPUTED, NOT_COMPUTED_HINT } from './PlansTable'
import { planActions, planStatusVariant } from './planRows'
import { SEND_TO_IB, planLineage } from './planLineage'

/** One spelling of the chain chips' link, used three times in the Rules row. */
const LINK = 'text-dense-meta text-primary hover:underline'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1 border-t border-border/60 px-3 py-2 first:border-t-0">
      <h3 className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-dense-meta">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function LegsTable({ plan }: { plan: StrategyPlan }) {
  if (plan.legs_json.length === 0) {
    return (
      <p className="text-dense-meta text-muted-foreground">
        No legs written yet — a plan needs at least one before it can be marked intended.
      </p>
    )
  }
  return (
    <table className="w-full text-dense-meta">
      <thead className="text-dense-micro uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-2 text-left font-medium">Side</th>
          <th className="px-2 text-left font-medium">Right</th>
          <th className="px-2 text-right font-medium">Strike</th>
          <th className="px-2 text-left font-medium">Expiry</th>
          <th className="px-2 text-right font-medium">Ratio</th>
          <th className="px-2 text-right font-medium">Mid at plan</th>
          <th className="px-2 text-left font-medium">Quote as of</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {plan.legs_json.map((leg, i) => (
          <tr key={`${leg.contract_key ?? 'leg'}-${i}`}>
            <td className={cn('px-2 text-left', leg.side === 'sell' ? 'text-loss' : 'text-profit')}>
              {leg.side === 'sell' ? 'Sell' : 'Buy'}
            </td>
            <td className="px-2 text-left">{leg.right ?? (leg.sec_type === 'STK' ? 'STK' : '—')}</td>
            <td className="px-2 text-right">{leg.strike ?? '—'}</td>
            <td className="px-2 text-left">{leg.expiry ?? '—'}</td>
            <td className="px-2 text-right">{leg.ratio}</td>
            <td className="px-2 text-right">{leg.mid_at_plan ?? '—'}</td>
            <td className="px-2 text-left text-muted-foreground">{leg.quote_asof ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LinkFillPicker({ plan, onDone }: { plan: StrategyPlan; onDone: () => void }) {
  const link = useLinkStrategyPlanFill()
  const since = plan.intended_at ? Date.parse(plan.intended_at) / 1000 : undefined
  const instances = useStrategyInstances({
    accountId: plan.account_id,
    openedAtFrom: Number.isFinite(since) ? since : undefined,
  })
  const opportunities = useOpportunities()
  const candidates = useMemo(
    () =>
      instancesTradingSymbol(
        instances.data?.items ?? [],
        opportunities.data?.items ?? [],
        plan.symbol,
      ),
    [instances.data, opportunities.data, plan.symbol],
  )

  return (
    <div className="space-y-1">
      {link.error ? (
        <p className="text-dense-meta text-destructive">{(link.error as Error).message}</p>
      ) : null}
      {candidates.length === 0 ? (
        <p className="text-dense-meta text-muted-foreground">
          No instance in this account opened after the plan was intended trades {plan.symbol}.
        </p>
      ) : (
        <ul className="space-y-1">
          {candidates.map((row) => (
            <li key={row.strategy_instance_id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-dense-meta">
                {row.label ?? row.strategy_opportunity_name ?? `#${row.strategy_instance_id}`}
                <span className="ml-2 font-mono text-dense-micro text-muted-foreground">
                  {row.opened_at?.slice(0, 16) ?? ''}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-dense-micro"
                disabled={link.isPending}
                onClick={() =>
                  link.mutate(
                    {
                      id: plan.strategy_plan_id,
                      strategyInstanceId: row.strategy_instance_id,
                    },
                    { onSuccess: onDone },
                  )
                }
              >
                Link
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PlanCard({
  plan,
  onClose,
  onEdit,
}: {
  plan: StrategyPlan
  onClose: () => void
  onEdit: (plan: StrategyPlan) => void
}) {
  const [picking, setPicking] = useState(false)
  const intend = useIntendStrategyPlan()
  const cancel = useCancelStrategyPlan()
  const actions = planActions(plan.effective_status)

  /**
   * Which rule covers this plan. A hand plan still goes through — it just says
   * so, because the daemon's book and the hand book have to stay
   * distinguishable (design DECISIONS 2026-09-18).
   */
  const opportunities = useOpportunities()
  const allocations = useAllocations()
  const lineage = useMemo(
    () => planLineage(plan, opportunities.data?.items ?? [], allocations.data?.items ?? []),
    [plan, opportunities.data?.items, allocations.data?.items],
  )
  const exit = planExitSummary(plan)
  const credit = planEstCredit(plan)

  return (
    <div className="flex min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-sm font-semibold">{plan.symbol}</span>
        <span className="text-dense-meta text-muted-foreground">{plan.structure_label}</span>
        <DenseTag variant={planStatusVariant(plan.effective_status)}>
          {planStatusLabel(plan.effective_status)}
        </DenseTag>
        <span className="ml-auto font-mono text-dense-micro text-muted-foreground">
          #{plan.strategy_plan_id}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-1 text-dense-meta"
          onClick={onClose}
          aria-label="Close plan"
        >
          ✕
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title={`Legs · ${plan.legs_json.length} · qty ${plan.qty}`}>
          <LegsTable plan={plan} />
        </Section>

        <Section title="Exit">
          {exit ? (
            <p className="text-dense-meta">{exit}</p>
          ) : (
            <p className="text-dense-meta text-muted-foreground">
              No exit written — Review will have nothing to compare against
            </p>
          )}
          <Field
            label="Est. credit"
            value={
              credit == null ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className={cn('font-mono', credit < 0 ? 'text-loss' : 'text-profit')}>
                  {credit < 0 ? '-' : '+'}${Math.abs(credit).toLocaleString('en-US')}
                </span>
              )
            }
          />
          <Field
            label="Cash / margin"
            value={
              <span className="text-muted-foreground" title={NOT_COMPUTED_HINT}>
                {NOT_COMPUTED}
              </span>
            }
          />
        </Section>

        {plan.rationale ? (
          <Section title="Rationale">
            <p className="text-dense-meta">{plan.rationale}</p>
          </Section>
        ) : null}

        <Section title="Rules">
          <p
            className={cn(
              'text-dense-meta leading-normal text-pretty',
              lineage.outsideRules ? 'text-warning' : 'text-secondary-foreground',
            )}
          >
            {lineage.read}
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 text-dense-meta">
            {lineage.structure ? (
              <Link to={`/trade/rules?pick=structure:${lineage.structure.id}`} className={LINK}>
                {lineage.structure.name}
              </Link>
            ) : null}
            {lineage.opportunity ? (
              <>
                <span className="text-muted-foreground">→</span>
                <Link to={`/trade/rules?pick=opportunity:${lineage.opportunity.id}`} className={LINK}>
                  {lineage.opportunity.name}
                </Link>
              </>
            ) : null}
            {lineage.allocation ? (
              <>
                <span className="text-muted-foreground">→</span>
                <Link to={`/trade/rules?pick=allocation:${lineage.allocation.id}`} className={LINK}>
                  {lineage.allocation.name}
                </Link>
              </>
            ) : null}
            {lineage.outsideRules ? (
              <DenseTag variant="warning" size="cell">
                OUTSIDE RULES
              </DenseTag>
            ) : null}
          </div>
        </Section>

        <Section title="Source">
          <Field label="Kind" value={plan.source_kind} />
          {plan.source_ref ? <Field label="Ref" value={plan.source_ref} /> : null}
          {plan.source_json.length > 0 ? (
            <ul className="space-y-1 pt-1">
              {plan.source_json.map((entry, i) => (
                <li key={i} className="text-dense-meta">
                  {entry.kind ? (
                    <span className="mr-1 text-dense-micro uppercase text-muted-foreground">
                      {entry.kind}
                    </span>
                  ) : null}
                  {entry.to ? (
                    <Link to={entry.to} className="underline hover:no-underline">
                      {entry.text ?? entry.to}
                    </Link>
                  ) : (
                    <span>{entry.text}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Fill">
          {plan.strategy_instance_id ? (
            <>
              <Field
                label="Instance"
                value={
                  <Link
                    to={`/strategy/instances/${plan.strategy_instance_id}`}
                    className="underline hover:no-underline"
                  >
                    #{plan.strategy_instance_id}
                  </Link>
                }
              />
              <Field label="Filled at" value={plan.filled_at?.slice(0, 16) ?? '—'} />
            </>
          ) : (
            <p className="text-dense-meta text-muted-foreground">
              Not linked to an instance. Orders are placed in TWS; linking is how the plan learns
              what happened.
            </p>
          )}
          {picking ? <LinkFillPicker plan={plan} onDone={() => setPicking(false)} /> : null}
        </Section>
      </div>

      {intend.error ? (
        <p className="border-t border-border px-3 py-2 text-dense-meta text-destructive">
          {(intend.error as Error).message}
        </p>
      ) : null}
      {cancel.error ? (
        <p className="border-t border-border px-3 py-2 text-dense-meta text-destructive">
          {(cancel.error as Error).message}
        </p>
      ) : null}

      {actions.canEdit || actions.canIntend || actions.canLinkFill || actions.canCancel ? (
        <footer className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
          {actions.canEdit ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              onClick={() => onEdit(plan)}
            >
              Edit
            </Button>
          ) : null}
          {actions.canIntend ? (
            <Button
              type="button"
              size="sm"
              className="h-7 text-dense-meta"
              disabled={intend.isPending}
              onClick={() => intend.mutate(plan.strategy_plan_id)}
            >
              Mark intended
            </Button>
          ) : null}
          {actions.canLinkFill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              onClick={() => setPicking((open) => !open)}
            >
              Link fill
            </Button>
          ) : null}
          {actions.canIntend || plan.effective_status === 'intended' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled
              title={SEND_TO_IB.title}
              className="h-7 cursor-not-allowed text-dense-meta opacity-50"
            >
              {SEND_TO_IB.label}
            </Button>
          ) : null}
          {actions.canCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-dense-meta text-muted-foreground"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(plan.strategy_plan_id)}
            >
              Cancel
            </Button>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}
