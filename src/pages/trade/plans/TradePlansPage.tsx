/**
 * Trade › Plans — the structured plan desk (`Trade Plans.dc.html`).
 *
 * A plan is a record: what I intend, how I exit, what filled. It is stored on
 * the server (`strategy_plan`, core 0.22.0), so a plan written on one machine is
 * there on the next, and Review has something to compare a fill against.
 *
 * `Import from Inbox` is a signpost, not a write: the prototype's own button
 * navigates to the Decision Inbox, where drafted intents wait — the earlier
 * walk read it as an order-intent write and left it out, which was wrong. The
 * design's reserved action is `Send to IB` on every intent, drawn and marked
 * `not wired` (DECISIONS 2026-09-18): the desk copies and TWS places, and
 * omitting it would read as "there is no such thing" rather than "it is not
 * connected". `Cash / margin` / `Pressure after` are grey: nothing computes
 * what one plan would cost in margin, so the column says so.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState, IncludeExcludeToggle, SegmentControl } from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import {
  INSPECTOR_WIDTH_READ_PX,
  INSPECTOR_WIDTH_WIDE_PX,
} from '@/components/layout/inspectorDock'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { Skeleton } from '@/components/ui/skeleton'
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useFollowedAccountPair } from '@/hooks/useFollowedAccountPair'
import type { AccountPair } from '@/lib/accountScope'
import { keepHeldSymbol } from '@/lib/symbolContext'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { useHeldRemoval } from '@/hooks/useHeldRemoval'
import { usePageViewParams } from '@/lib/pageView'
import { PlanCard } from './PlanCard'
import { PlanForm } from './PlanForm'
import { PlansTable } from './PlansTable'
import {
  HELD_PLAN_SCOPE,
  PLAN_FILTERS,
  PLAN_FILTER_LABELS,
  coercePlanFilter,
  filterPlans,
  planFilterCounts,
  planInAccountScope,
  sortPlans,
  type PlanFilterValue,
} from './planRows'

/** The form is a local mode; which card is open is the URL's business. */
type Form = { kind: 'new' } | { kind: 'edit'; id: number } | null

const PLANS_VIEW_PARAMS = ['status', 'plan'] as const

export default function TradePlansPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const symbol = (params.get('symbol') ?? '').trim().toUpperCase()
  const filter: PlanFilterValue = coercePlanFilter(params.get('status'))
  // The account toggles follow the shell's account scope (Rev .58): a link
  // that names one is honoured and becomes the scope; a toggle writes it.
  const writeAcct = useCallback(
    (pair: AccountPair | null, arrival?: boolean) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('host')
          next.delete('sec')
          if (pair && !pair.host) next.set('host', '0')
          if (pair && !pair.secondary) next.set('sec', '0')
          return arrival ? keepHeldSymbol(next) : next
        },
        { replace: true },
      ),
    [setParams],
  )
  const { pair: acctScope, setPair: setAcctScope } = useFollowedAccountPair(
    params.has('host') || params.has('sec')
      ? { host: params.get('host') !== '0', secondary: params.get('sec') !== '0' }
      : null,
    writeAcct,
  )
  const planParam = Number(params.get('plan'))
  const openId = Number.isFinite(planParam) && planParam > 0 ? planParam : null
  // `?new=1` opens the form on arrival — the Desk's "＋ Plan a trade" lands
  // here, and a button that only exists on this page would have made the desk
  // a signpost rather than a start.
  const [form, setForm] = useState<Form>(params.get('new') === '1' ? { kind: 'new' } : null)

  // The whole book, filtered client-side, so `N of M plans` can name the true
  // denominator and the Symbol box answers as you type.
  // The filter and the open plan are the page's view (Rev .79): reached again
  // without them, the page comes back as it was left. Account and symbol are
  // the shell's and are not kept twice.
  usePageViewParams(PLANS_VIEW_PARAMS)
  const query = useStrategyPlans()
  // A plan whose Cancel is still behind its toast's Undo reads cancelled here.
  const { isHeld } = useHeldRemoval(HELD_PLAN_SCOPE)
  const plans = useMemo(
    () =>
      (query.data?.items ?? []).map((p) =>
        isHeld(p.strategy_plan_id) ? { ...p, status: 'cancelled' as const } : p,
      ),
    [query.data, isHeld],
  )
  const monitor = useMonitorStatus()
  const hostAccountId = monitor.data?.config?.ib_client?.account?.event_host ?? ''
  const secondaryAccountId = monitor.data?.config?.ib_client?.account?.event_secondary ?? ''
  // The same reading the sidebar badge uses: drafted calls waiting in the Inbox.
  const standing = useAutopilotStanding().data
  const inboxCount = standing?.pending_decisions?.calls ?? standing?.pending_memos ?? 0

  const counts = useMemo(() => planFilterCounts(plans), [plans])
  const rows = useMemo(
    () =>
      sortPlans(
        filterPlans(plans, filter)
          .filter((plan) => planInAccountScope(plan, acctScope, hostAccountId, secondaryAccountId))
          .filter((plan) => !symbol || plan.symbol.startsWith(symbol)),
      ),
    [plans, filter, acctScope, hostAccountId, secondaryAccountId, symbol],
  )
  const cardId = form?.kind === 'edit' ? form.id : openId
  const selected = useMemo(
    () => (cardId == null ? null : (plans.find((p) => p.strategy_plan_id === cardId) ?? null)),
    [cardId, plans],
  )

  function setParam(key: string, value: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value == null) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  function openPlan(strategyPlanId: number) {
    setForm(null)
    setParam('plan', String(strategyPlanId))
  }

  function closePanel() {
    setForm(null)
    setParam('plan', null)
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Plans"
        description="Every trade you mean to make, from idea to fill: what I intend, how I exit, what filled, and which rule covers it. Advisory only — nothing here places an order today, and the Send to IB action reserved on each intent is not wired."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              title="Import intents the Copilot or Autopilot drafted — opens the Decision Inbox"
              onClick={() => void navigate('/research/loop/decisions')}
            >
              Import from Inbox
              {inboxCount > 0 ? (
                <span className="ml-1.5 font-mono text-dense-micro font-semibold text-warning">
                  {inboxCount}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-dense-meta"
              onClick={() => {
                setForm({ kind: 'new' })
                setParam('plan', null)
              }}
            >
              ＋ Plan a trade
            </Button>
          </div>
        }
      />

      {/* The design's Scope bar: status, one Include/Exclude per account, the
          symbol box, and the shown-of-total count on the right. */}
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-border bg-[var(--sk-raised)] px-2.5 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Scope
        </span>
        <SegmentControl
          ariaLabel="Plan status"
          size="sm"
          value={filter}
          onChange={(v) => setParam('status', v === 'open' ? null : v)}
          options={PLAN_FILTERS.map((value) => ({ value, label: PLAN_FILTER_LABELS[value] }))}
        />
        {hostAccountId ? (
          <IncludeExcludeToggle
            label="HOST"
            size="sm"
            include={acctScope.host}
            onChange={(on) => setAcctScope({ ...acctScope, host: on })}
          />
        ) : null}
        {secondaryAccountId ? (
          <IncludeExcludeToggle
            label="Secondary"
            size="sm"
            include={acctScope.secondary}
            onChange={(on) => setAcctScope({ ...acctScope, secondary: on })}
          />
        ) : null}
        <input
          value={symbol}
          onChange={(e) => setParam('symbol', e.target.value.trim() ? e.target.value.trim().toUpperCase() : null)}
          placeholder="Symbol"
          aria-label="Symbol"
          className="h-6 w-24 rounded border border-border bg-background px-1.5 font-mono text-dense-meta uppercase outline-none focus:border-ring"
        />
        <span className="ml-auto whitespace-nowrap text-dense-meta text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{rows.length}</span> of{' '}
          {plans.length} plans
        </span>
      </div>

      {/* The design's four-cell strip. Two of them count plans, which this
          side has; two ask what the open intents would consume if they all
          filled, and no plan field carries an intent's collateral — the same
          gap Risk › Sizing marks on its own strip, said once here rather than
          guessed at per cell. */}
      {query.isLoading ? null : (
        <div className="flex flex-wrap items-start gap-x-7 gap-y-2 border px-3 py-2.5 mat-card">
          <PositionsStat
            cap="Open plans"
            value={String(counts.draft + counts.intended)}
            sub={`${counts.draft} draft · ${counts.intended} intended`}
          />
          <PositionsStat
            cap="Awaiting fill"
            value={String(counts.intended)}
            ink={counts.intended > 0 ? 'text-warning' : undefined}
            sub={
              counts.intended === 0
                ? 'nothing is out — the desk copies, TWS places'
                : 'copy each into TWS, or let it lapse'
            }
          />
          <PositionsStat
            cap="Cash if all fill"
            value="—"
            ink="text-muted-foreground"
            sub="a plan stores its target, stop and limit — never its collateral"
          />
          <PositionsStat
            cap="Pressure if all fill"
            value="—"
            ink="text-muted-foreground"
            sub="needs the cash above before it can be added to today’s"
          />
        </div>
      )}

      {query.isError ? (
        <QueryErrorAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? <Skeleton className="h-32 w-full" /> : null}

      {!query.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No plans in this scope"
          description={
            plans.length === 0
              ? 'Press ＋ Plan a trade, or send one over from Symbol with ＋ Plan this.'
              : `${plans.length} plans exist · 0 match ${symbol ? `symbol ${symbol} ` : ''}in ${PLAN_FILTER_LABELS[filter]}. Widen the scope or plan a trade.`
          }
        />
      ) : null}

      {rows.length > 0 ? (
        <PlansTable
          plans={rows}
          selectedId={selected?.strategy_plan_id ?? null}
          onSelect={(plan) => openPlan(plan.strategy_plan_id)}
        />
      ) : null}

      {/* The design's two footnotes, said the way they are true here: the
          pressure formula names columns this side does not compute (and no
          ceiling is quoted — the desk's is set in Risk, not fixed at a number),
          and matching is manual, not a rule that links by itself. */}
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-dense-meta text-muted-foreground">
        <span>
          Pressure after = (maintenance now + this plan's margin) / net liq, per account — not
          computed yet; the column says so.
        </span>
        <span>
          Matching is manual today: link a fill from the plan or from Orders &amp; Fills; nothing
          links itself.
        </span>
      </div>

      <RightInspectorShell
        open={form != null || selected != null}
        ariaLabel={form == null ? 'Plan' : 'Plan a trade'}
        panelWidthPx={form == null ? INSPECTOR_WIDTH_READ_PX : INSPECTOR_WIDTH_WIDE_PX}
        onClose={closePanel}
      >
        {form == null && selected ? (
          <PlanCard
            plan={selected}
            onClose={closePanel}
            onEdit={(plan) => setForm({ kind: 'edit', id: plan.strategy_plan_id })}
          />
        ) : null}
        {form != null ? (
          <PlanForm
            editing={form.kind === 'edit' ? selected : null}
            onDone={openPlan}
            onCancel={closePanel}
          />
        ) : null}
      </RightInspectorShell>
    </PageShell>
  )
}
