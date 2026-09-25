/**
 * One plan, opened — the design's five sections (Legs · Backing check ·
 * Source · Executions · Intent) plus the lifecycle strip on top.
 *
 * Everything drawn is the plan as written plus what the server says about it.
 * Backing cells that need the market or the account book are marked, not
 * guessed; actions live in the Intent section, and a refusal is shown in the
 * server's own words — the desk does not restate the rule.
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
  useUpdateStrategyPlan,
} from '@/hooks/useStrategyPlans'
import { instancesTradingSymbol } from '@/lib/plans/planLinkFill'
import { planEstCredit, planExitSummary, planStatusLabel } from '@/lib/plans/planMath'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { cn } from '@/lib/utils'
import { NOT_COMPUTED_HINT } from './PlansTable'
import { planActions, planStatusVariant } from './planRows'
import { SEND_TO_IB, planLineage } from './planLineage'
import {
  creditOnCash,
  extendedExpiry,
  planCashSecured,
  planIntentJson,
  planTimeline,
  twsCopyText,
} from './planCardModel'

/** One spelling of the chain chips' link, used three times in the Rules row. */
const LINK = 'text-dense-meta text-primary hover:underline'

const SECTIONS = [
  ['plan-legs', 'Legs'],
  ['plan-backing', 'Backing check'],
  ['plan-source', 'Source'],
  ['plan-execs', 'Executions'],
  ['plan-intent', 'Intent'],
] as const

function Section({
  id,
  title,
  meta,
  children,
}: {
  id?: string
  title: string
  meta?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="space-y-1 border-t border-border/60 px-3 py-2 first:border-t-0">
      <h3 className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        {meta ? <span className="ml-2 font-normal normal-case tracking-normal">{meta}</span> : null}
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

/** A backing cell: caption, value, and the one-line note under it. */
function BackingCell({
  label,
  value,
  note,
  muted,
}: {
  label: string
  value: React.ReactNode
  note: string
  muted?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('font-mono text-dense-label font-semibold', muted && 'text-muted-foreground')}>
        {value}
      </div>
      <div className="text-dense-micro text-muted-foreground">{note}</div>
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

const backingUsd = (n: number) => `$${Math.abs(Math.round(n)).toLocaleString('en-US')}`

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
  const [copied, setCopied] = useState(false)
  const intend = useIntendStrategyPlan()
  const cancel = useCancelStrategyPlan()
  const update = useUpdateStrategyPlan()
  const actions = planActions(plan.effective_status)
  const status = plan.effective_status

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
  const cashSecured = planCashSecured(plan)
  const onCash = creditOnCash(credit, cashSecured)
  const timeline = planTimeline(plan)

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }

  async function copyForTws() {
    try {
      await navigator.clipboard.writeText(twsCopyText(plan))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function pushExpiry() {
    update.mutate({
      id: plan.strategy_plan_id,
      payload: { expires_at: extendedExpiry(new Date().toISOString()) },
    })
  }

  const mutationError = (intend.error ?? cancel.error ?? update.error) as Error | null

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

      <nav
        aria-label="Plan sections"
        className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2"
      >
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="whitespace-nowrap border-b-2 border-transparent px-2 py-1.5 text-dense-meta text-muted-foreground hover:text-foreground"
            onClick={() => scrollTo(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 px-3 py-2">
        {timeline.map((t, i) => (
          <span
            key={t.label}
            className={cn(
              'flex items-center gap-1.5 text-dense-micro',
              t.on ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'inline-block size-1.5 rounded-full',
                t.on
                  ? t.label === 'Expired'
                    ? 'bg-warning'
                    : 'bg-success'
                  : 'bg-[var(--sk-line)]',
              )}
            />
            <span className="font-semibold">{t.label}</span>
            <span className="font-mono text-muted-foreground">{t.when ?? '—'}</span>
            {i < timeline.length - 1 ? <span className="text-border">→</span> : null}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section id="plan-legs" title="Legs" meta={`${plan.legs_json.length} · qty ${plan.qty}`}>
          <LegsTable plan={plan} />
        </Section>

        {/* Kept beyond the design's five: the exit is stored on the plan and
            Review compares against it — absence from the prototype is not
            deletion. */}
        <Section title="Exit">
          {exit ? (
            <p className="text-dense-meta">{exit}</p>
          ) : (
            <p className="text-dense-meta text-muted-foreground">
              No exit written — Review will have nothing to compare against
            </p>
          )}
        </Section>

        <Section id="plan-backing" title="Backing check">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-0.5 @[26rem]:grid-cols-3">
            <BackingCell
              label="Cash secured"
              value={cashSecured == null ? '—' : backingUsd(cashSecured)}
              note={cashSecured == null ? 'no short put pins cash' : 'strike × 100 × qty'}
              muted={cashSecured == null}
            />
            <BackingCell
              label="Est. credit"
              value={
                credit == null ? (
                  '—'
                ) : (
                  <span className={credit < 0 ? 'text-loss' : 'text-profit'}>
                    {credit < 0 ? '-' : '+'}
                    {backingUsd(credit)}
                  </span>
                )
              }
              note={credit == null ? 'no limit price yet' : (onCash ?? 'at the plan limit')}
              muted={credit == null}
            />
            <BackingCell
              label="Reg-T margin"
              value="—"
              note="needs a spot mark · not computed"
              muted
            />
            <BackingCell
              label="Free cash"
              value="—"
              note="the account book is not read here"
              muted
            />
            <BackingCell label="Pressure after" value="—" note="needs the two above" muted />
            <BackingCell label="Room left after" value="—" note="needs the two above" muted />
          </div>
          <p className="pt-1 text-dense-meta text-muted-foreground" title={NOT_COMPUTED_HINT}>
            No service prices a plan's margin yet — whether it fits is judged on{' '}
            <Link to={`/portfolio/backing?symbol=${plan.symbol}`} className={LINK}>
              Backing &amp; Model →
            </Link>
          </p>
        </Section>

        <Section id="plan-source" title="Where it came from">
          <div className="space-y-1 pt-0.5">
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-dense-meta">
              <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                {plan.source_kind}
              </span>
              <span>{plan.source_ref ?? '—'}</span>
            </div>
            {plan.source_json.map((entry, i) => (
              <div
                key={i}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-dense-meta"
              >
                <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                  {entry.kind ?? '·'}
                </span>
                {entry.to ? (
                  <Link to={entry.to} className="underline hover:no-underline">
                    {entry.text ?? entry.to}
                  </Link>
                ) : (
                  <span>{entry.text}</span>
                )}
              </div>
            ))}
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-dense-meta">
              <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                rules
              </span>
              <span
                className={cn(
                  'leading-normal text-pretty',
                  lineage.outsideRules ? 'text-warning' : 'text-secondary-foreground',
                )}
              >
                {lineage.read}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-[6rem] text-dense-meta">
              {lineage.structure ? (
                <Link to={`/trade/rules?pick=structure:${lineage.structure.id}`} className={LINK}>
                  {lineage.structure.name}
                </Link>
              ) : null}
              {lineage.opportunity ? (
                <>
                  <span className="text-muted-foreground">→</span>
                  <Link
                    to={`/trade/rules?pick=opportunity:${lineage.opportunity.id}`}
                    className={LINK}
                  >
                    {lineage.opportunity.name}
                  </Link>
                </>
              ) : null}
              {lineage.allocation ? (
                <>
                  <span className="text-muted-foreground">→</span>
                  <Link
                    to={`/trade/rules?pick=allocation:${lineage.allocation.id}`}
                    className={LINK}
                  >
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
            {plan.rationale ? (
              <p className="mt-1 rounded-md border border-dashed border-border px-2.5 py-2 text-dense-meta text-secondary-foreground text-pretty">
                {plan.rationale}
              </p>
            ) : null}
          </div>
        </Section>

        <Section
          id="plan-execs"
          title="Executions"
          meta={plan.strategy_instance_id ? 'linked' : 'none yet'}
        >
          {plan.strategy_instance_id ? (
            <>
              <Field
                label="Instance"
                value={
                  <Link
                    to={`/portfolio/positions?instance=${plan.strategy_instance_id}`}
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
              {status === 'intended'
                ? `No fill linked yet. Fills arrive on Orders & Fills; link one there or here — nothing links itself today.`
                : status === 'draft'
                  ? 'Drafts have no intent, so nothing is watched.'
                  : status === 'expired'
                    ? 'Intent lapsed with no linked fill.'
                    : 'Not linked to an instance. Orders are placed in TWS; linking is how the plan learns what happened.'}
            </p>
          )}
          {actions.canLinkFill ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-dense-micro"
              onClick={() => setPicking((open) => !open)}
            >
              Link fill
            </Button>
          ) : null}
          {picking ? <LinkFillPicker plan={plan} onDone={() => setPicking(false)} /> : null}
        </Section>

        <Section
          id="plan-intent"
          title="Intent"
          meta={`advisory · D10 · strategy_plan #${plan.strategy_plan_id}`}
        >
          <pre className="overflow-x-auto border px-2.5 py-2 font-mono text-dense-micro leading-relaxed text-secondary-foreground mat-card">
            {planIntentJson(plan)}
          </pre>
          {mutationError ? (
            <p className="text-dense-meta text-destructive">{mutationError.message}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
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
            {status === 'intended' ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-dense-meta"
                  title="Copies the legs as a TWS basket line — the desk copies, TWS places"
                  onClick={() => void copyForTws()}
                >
                  {copied ? 'Copied' : 'Copy for TWS'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-dense-meta"
                  disabled={update.isPending}
                  title="Pushes expires_at seven days out on this same plan"
                  onClick={pushExpiry}
                >
                  Extend 7 days
                </Button>
              </>
            ) : null}
            {status === 'expired' ? (
              <Button
                type="button"
                size="sm"
                className="h-7 text-dense-meta"
                disabled={update.isPending}
                title="Same legs, a new 7-day window — pushes expires_at on this same plan"
                onClick={pushExpiry}
              >
                Re-issue intent
              </Button>
            ) : null}
            {status === 'filled' ? (
              <>
                <Link
                  to={`/portfolio/positions?symbol=${plan.symbol}`}
                  className="inline-flex h-7 items-center border px-2.5 text-dense-meta mat-btn"
                >
                  Open in Positions
                </Link>
                <Link
                  to="/portfolio/ledger"
                  className="inline-flex h-7 items-center border px-2.5 text-dense-meta mat-btn"
                >
                  Open in Ledger
                </Link>
              </>
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
          </div>
        </Section>
      </div>
    </div>
  )
}
