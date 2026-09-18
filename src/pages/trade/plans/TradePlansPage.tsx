/**
 * Trade › Plans — the structured plan desk (`Trade Plans.dc.html`).
 *
 * A plan is a record: what I intend, how I exit, what filled. It is stored on
 * the server (`strategy_plan`, core 0.22.0), so a plan written on one machine is
 * there on the next, and Review has something to compare a fill against.
 *
 * `Import from Inbox` is absent on purpose: it writes an order intent, which
 * D10 forbids, and an unresponsive button would be worse than no button. The
 * design's own reserved action is different — it keeps a `Send to IB` on every
 * intent and marks it `not wired` (DECISIONS 2026-09-18), so that one is drawn
 * and disabled rather than hidden: the desk copies and TWS places, and omitting
 * it would read as "there is no such thing" rather than "it is not connected". And `Cash / margin` /
 * `Pressure after` are grey: nothing computes what one plan would cost in
 * margin, so the column says so.
 */
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, SegmentControl } from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import {
  INSPECTOR_WIDTH_READ_PX,
  INSPECTOR_WIDTH_WIDE_PX,
} from '@/components/layout/inspectorDock'
import { Button } from '@/components/ui/button'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { useStrategyPlans } from '@/hooks/useStrategyPlans'
import { PlanCard } from './PlanCard'
import { PlanForm } from './PlanForm'
import { PlansTable } from './PlansTable'
import {
  PLAN_FILTERS,
  PLAN_FILTER_LABELS,
  filterPlans,
  isPlanFilter,
  planFilterCounts,
  sortPlans,
  type PlanFilterValue,
} from './planRows'

/** The form is a local mode; which card is open is the URL's business. */
type Form = { kind: 'new' } | { kind: 'edit'; id: number } | null

export default function TradePlansPage() {
  const [params, setParams] = useSearchParams()
  const symbol = (params.get('symbol') ?? '').trim().toUpperCase()
  const statusParam = params.get('status')
  const filter: PlanFilterValue = isPlanFilter(statusParam) ? statusParam : 'all'
  const planParam = Number(params.get('plan'))
  const openId = Number.isFinite(planParam) && planParam > 0 ? planParam : null
  const [form, setForm] = useState<Form>(null)

  const query = useStrategyPlans({ symbol: symbol || undefined })
  const plans = useMemo(() => query.data?.items ?? [], [query.data])

  const counts = useMemo(() => planFilterCounts(plans), [plans])
  const rows = useMemo(() => sortPlans(filterPlans(plans, filter)), [plans, filter])
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
        description="Every trade you mean to make, from idea to fill: what I intend, how I exit, what filled, and which rule covers it. Advisory only — nothing here places an order today, and the Send to IB action reserved on each intent is not wired (D10)."
        actions={
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
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentControl
          ariaLabel="Plan status"
          size="sm"
          value={filter}
          onChange={(v) => setParam('status', v === 'all' ? null : v)}
          options={PLAN_FILTERS.map((value) => ({
            value,
            label: `${PLAN_FILTER_LABELS[value]} ${counts[value]}`,
          }))}
        />
        {symbol ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 text-dense-micro"
            onClick={() => setParam('symbol', null)}
          >
            {symbol} ✕
          </Button>
        ) : null}
      </div>

      {query.isError ? (
        <QueryErrorAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isLoading ? <Skeleton className="h-32 w-full" /> : null}

      {!query.isLoading && rows.length === 0 ? (
        <EmptyState
          title="No plans here yet"
          description={
            filter === 'all'
              ? 'Press ＋ Plan a trade, or send one over from Symbol with ＋ Plan this.'
              : `No plan is ${PLAN_FILTER_LABELS[filter].toLowerCase()} right now.`
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
