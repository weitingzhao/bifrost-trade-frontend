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
import { useSearchParams } from 'react-router-dom'
import { ToolbarClear, ViewState } from '@bifrost/ui'
import { IncludeExcludeToggle, SegmentControl } from '@/components/data-display'
import { HeroCard, HeroRow, PageHead, PageHeadAction, PageHeadLink, PageShell } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import {
  INSPECTOR_WIDTH_READ_PX,
  INSPECTOR_WIDTH_WIDE_PX,
} from '@/components/layout/inspectorDock'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
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
import { planCashSecured } from './planCardModel'
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
  const preview = usePreviewState()
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

  /**
   * What the intended plans would tie up if they all filled (design Rev .84's
   * third hero): the cash each secured put reserves, strike × 100 × ratio ×
   * qty — read off the plan's own legs, the figure the plan card already
   * shows one plan at a time. Calls are covered by shares, as the design
   * counts them; drafts are not out yet.
   */
  const intended = useMemo(() => plans.filter((p) => p.effective_status === 'intended'), [plans])
  const cashIfAllFill = useMemo(
    () => intended.reduce((sum, p) => sum + (planCashSecured(p) ?? 0), 0),
    [intended],
  )
  const nearestExpiry = useMemo(
    () =>
      intended
        .map((p) => p.expires_at)
        .filter((d): d is string => Boolean(d))
        .sort()[0] ?? null,
    [intended],
  )

  // §17.3: what the toolbar's Clear N resets — status back to Open, both
  // accounts in, the symbol box empty.
  const resets = [
    ...(filter !== 'open' ? ['status'] : []),
    ...(!acctScope.host || !acctScope.secondary ? ['accounts'] : []),
    ...(symbol ? ['symbol'] : []),
  ]
  function clearScope() {
    setAcctScope({ host: true, secondary: true })
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('status')
        next.delete('symbol')
        return next
      },
      { replace: true },
    )
  }

  const pageState = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(query)

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
      {/* §16.10: the lead behind ⓘ; the Inbox import and the one primary
          action — ＋ Plan a trade — in the head. */}
      <PageHead
        // The menu's name (§5a.5); the prototype heads it "Trade Plans".
        title="Plans"
        info="Every trade you mean to make, from idea to fill: what I intend, how I exit, what filled, and which rule covers it. Advisory only — D10: nothing here places an order today, and the Send to IB action reserved on each intent is not wired."
        actions={
          <>
            <PageHeadLink
              to="/research/loop/decisions"
              title="Import intents the Copilot or Autopilot drafted — opens the Decision Inbox"
            >
              Import from Inbox{inboxCount > 0 ? ` · ${inboxCount}` : ''}
            </PageHeadLink>
            <PageHeadAction
              primary
              onClick={() => {
                setForm({ kind: 'new' })
                setParam('plan', null)
              }}
            >
              ＋ Plan a trade
            </PageHeadAction>
          </>
        }
      />

      {/* The design's Scope bar (§17.3): status, one Include/Exclude per
          account, the symbol box, Clear N, and the shown-of-total count. It
          parks at the top of the scroller as glass. */}
      <div data-sr-toolbar="" data-sticky="">
        <span data-sr-tb="label">Scope</span>
        <SegmentControl
          ariaLabel="Plan status"
          size="xs"
          value={filter}
          onChange={(v) => setParam('status', v === 'open' ? null : v)}
          options={PLAN_FILTERS.map((value) => ({ value, label: PLAN_FILTER_LABELS[value] }))}
        />
        {hostAccountId || secondaryAccountId ? <span data-sr-tb="sep" /> : null}
        {hostAccountId ? (
          <IncludeExcludeToggle
            label="HOST"
            size="xs"
            include={acctScope.host}
            onChange={(on) => setAcctScope({ ...acctScope, host: on })}
          />
        ) : null}
        {secondaryAccountId ? (
          <IncludeExcludeToggle
            label="Secondary"
            size="xs"
            include={acctScope.secondary}
            onChange={(on) => setAcctScope({ ...acctScope, secondary: on })}
          />
        ) : null}
        <span data-sr-tb="sep" />
        <input
          value={symbol}
          onChange={(e) => setParam('symbol', e.target.value.trim() ? e.target.value.trim().toUpperCase() : null)}
          placeholder="Symbol"
          aria-label="Symbol"
          className="h-6 w-24 border px-1.5 font-mono text-dense-meta uppercase outline-none mat-field"
        />
        <ToolbarClear resets={resets} onClear={clearScope} />
        <span data-sr-tb="meta">
          <span className="font-mono font-semibold text-foreground">{rows.length}</span> of {plans.length} plans
        </span>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh plans"
          detail={staleDetail(query, 'plans written since then are not shown.')}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {pageState === 'loading' ? (
        <section className="border mat-card">
          <ViewState kind="loading" title="Loading plans" rows={6} cols={8} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="border mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load plans"
            detail={failedDetail(query, 'No plan was read — this is not an empty book.')}
            onAction={() => void query.refetch()}
          />
        </section>
      ) : (
        <>
          {/* §16.2 (Rev .84): the four cells as heroes, lamp and sub-line kept.
              Pressure if all fill needs a per-plan margin, which no service
              estimates; it says so rather than borrowing the cash figure. */}
          <HeroRow label="The plans at a glance">
            <HeroCard
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusLamp lamp="green" variant="dot" title="Counted" />
                  Open plans
                </span>
              }
              value={String(counts.draft + counts.intended)}
              sub={`${counts.draft} draft · ${counts.intended} intended`}
            />
            <HeroCard
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusLamp
                    lamp={counts.intended > 0 ? 'yellow' : 'green'}
                    variant="dot"
                    title={counts.intended > 0 ? 'Waiting on TWS' : 'Nothing out'}
                  />
                  Awaiting fill
                </span>
              }
              value={String(counts.intended)}
              sub={
                counts.intended === 0
                  ? 'nothing is out — the desk copies, TWS places'
                  : `${nearestExpiry ? `nearest expiry ${nearestExpiry.slice(0, 10)} · ` : ''}copy into TWS, or let it lapse`
              }
            />
            <HeroCard
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusLamp lamp="green" variant="dot" title="Read off the legs" />
                  Cash if all fill
                </span>
              }
              value={`$${Math.round(cashIfAllFill).toLocaleString('en-US')}`}
              title="Σ over intended plans of each short put's strike × 100 × ratio × qty — the cash a secured put reserves."
              sub="secured puts only · calls are covered by shares"
            />
            <HeroCard
              label={
                <span className="inline-flex items-center gap-1.5">
                  <StatusLamp lamp="gray" variant="dot" title="Not computed" />
                  Pressure if all fill
                </span>
              }
              value="—"
              valueClassName="text-muted-foreground"
              sub="needs each plan's margin; the book's maintenance is read, a plan's is not"
            />
          </HeroRow>

          {rows.length === 0 ? (
            <section className="border mat-card">
              {plans.length === 0 ? (
                <ViewState
                  kind="empty"
                  title="No plans yet"
                  detail="Press ＋ Plan a trade, or send one over from Symbol with ＋ Plan this."
                />
              ) : (
                <ViewState
                  kind="filtered"
                  title="No plans in this scope"
                  detail={`${plans.length} plans exist · 0 match ${symbol ? `symbol ${symbol} ` : ''}in ${PLAN_FILTER_LABELS[filter]}.`}
                  actionTitle="Status back to Open, both accounts included, symbol cleared"
                  onAction={clearScope}
                />
              )}
            </section>
          ) : (
            <PlansTable
              plans={rows}
              selectedId={selected?.strategy_plan_id ?? null}
              onSelect={(plan) => openPlan(plan.strategy_plan_id)}
            />
          )}
        </>
      )}

      {/* The design's two footnotes, said the way they are true here: the
          pressure formula names a column this side does not compute (and no
          ceiling is quoted — the desk's is set in Risk, not fixed at a number),
          and matching is manual, not a rule that links by itself. */}
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-dense-meta text-muted-foreground">
        <span>
          Pressure after = (maintenance now + this plan's margin) / net liq, per account — not computed yet; the
          column says so. Cash / margin is the cash a secured put reserves.
        </span>
        <span>
          Matching is manual today: link a fill from the plan or from Orders &amp; Fills; nothing links itself.
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
