/**
 * Trade · Orders & Fills — the work side of the ledger.
 *
 * The Trade Ledger is the record: every fill the book has ever taken,
 * reconciled. This is the desk's window on the same fills — the last few
 * sessions, what claims each one, and the ones nothing claims. One source, two
 * questions, and the Ledger owns the reconciliation (§14.2).
 *
 * Nothing here sends an order. Orders are worked in TWS; this page reads what
 * IB is working and what came back. The design reserves a Send action and marks
 * it `not wired`, and it lives on Plans rather than here — D10 governs either
 * way (design DECISIONS 2026-09-18).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { fetchStrategyPlans } from '@/api/strategyPlans'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { useOpenOrders } from '@/hooks/useOpenOrders'
import { FILLS_UNRECORDED, buildFillRows, buildPlanRows, scopeFills, summarize } from './fillsModel'

const PAGE_LEAD =
  'The work side of the ledger: what IB is working right now, what came back, and which fills still need a home. Nothing here sends an order — TWS does that, and the reserved Send action lives on Plans, not wired.'

const WINDOWS: { value: string; label: string; days: number | null }[] = [
  { value: 'today', label: 'Today', days: 1 },
  { value: 'week', label: '1 week', days: 7 },
  { value: 'month', label: '1 month', days: 31 },
  { value: 'all', label: 'All', days: null },
]

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The source's own word, kept verbatim — it is how a reader tells the paths apart. */
const SOURCE_LABEL: Record<string, string> = {
  flex_trades: 'Flex',
  tws_client: 'TWS',
  journal_closed: 'Journal',
}

function contractToken(row: { secType: string; contractKey: string; symbol: string }): string {
  if (row.secType !== 'OPT') return row.symbol || '—'
  return shortOptContractKey(row.contractKey)
}

export default function FillsPage() {
  const [windowKey, setWindowKey] = useState('week')
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const execQuery = useExecutionsCanonical()
  const ordersQuery = useOpenOrders()
  const plansQuery = useQuery({
    queryKey: ['strategy', 'plans', 'fills'],
    queryFn: () => fetchStrategyPlans({}),
  })

  const plans = useMemo(() => plansQuery.data?.items ?? [], [plansQuery.data?.items])
  const all = useMemo(
    () => buildFillRows(execQuery.data?.items ?? [], plans),
    [execQuery.data?.items, plans],
  )
  const days = WINDOWS.find((w) => w.value === windowKey)?.days ?? null
  const rows = useMemo(() => scopeFills(all, days, today), [all, days, today])
  const summary = useMemo(() => summarize(rows, all), [rows, all])
  const planRows = useMemo(() => buildPlanRows(plans), [plans])
  const orders = ordersQuery.data ?? []

  const loading = execQuery.isLoading
  const error = execQuery.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Orders and Fills">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Trade / Orders &amp; Fills</p>}
          title="Orders & Fills"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <SegmentControl
                size="xs"
                ariaLabel="Window"
                value={windowKey}
                onChange={setWindowKey}
                options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
              />
              {summary.newestTradeDate ? (
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  newest fill {fmtIsoDateToken(summary.newestTradeDate)}
                </span>
              ) : null}
              <Link to="/portfolio/ledger" className={positionsUi.link}>
                the record → Trade Ledger
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void execQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ) : (
          <>
            <PositionsTier label="Open orders in IB" note="what the broker is working right now · TWS sends, this reads" />
            <section className={positionsUi.panel} aria-label="Open orders in IB">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'} working
                </span>
                {ordersQuery.isError ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ the broker did not answer
                  </DenseTag>
                ) : null}
                <span className="ml-auto inline-flex items-center gap-2.5 text-dense-meta text-muted-foreground">
                  read from the broker · cancel and amend in TWS
                  <Link to="/market/live" className={positionsUi.link}>
                    Live →
                  </Link>
                </span>
              </header>
              {orders.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground text-pretty">
                  IB is working nothing right now. An order that filled leaves this list the moment it fills — what came
                  back is below.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: seven columns, the design's 820 floor. */}
                  <table className="w-full min-w-[820px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Contract</th>
                        <th className={positionsUi.th}>Side</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Account</th>
                        <th className={positionsUi.th}>Qty</th>
                        <th className={positionsUi.th}>Filled</th>
                        <th className={positionsUi.th}>Limit</th>
                        <th className={cn(positionsUi.th, 'text-left')}>IB status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={`${o.order_id ?? i}`}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {o.symbol ?? '—'}
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{o.action ?? '—'}</td>
                          <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>{o.account_id ?? '—'}</td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{o.total_quantity ?? '—'}</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>{o.filled ?? '—'}</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {o.limit_price == null ? '—' : fmtUsd(o.limit_price)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                            {o.status ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{FILLS_UNRECORDED.order}</p>
            </section>

            <PositionsTier label="Executions" note="what came back, and what claims it" />
            <section className={positionsUi.panel} aria-label="Executions">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {summary.rows} {summary.rows === 1 ? 'fill' : 'fills'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <StatusLamp lamp="green" variant="dot" title="Linked to an instance" />
                  {summary.linked} linked
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-dense-meta',
                    summary.orphan > 0 ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  <StatusLamp lamp={summary.orphan > 0 ? 'yellow' : 'gray'} variant="dot" title="Nothing claims it" />
                  {summary.orphan} with no home
                </span>
                <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>
                  {summary.bySource.map((s) => `${SOURCE_LABEL[s.source] ?? s.source} ${s.n}`).join(' · ')}
                </span>
              </header>
              {rows.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground text-pretty">
                  Nothing came back in this window
                  {summary.newestTradeDate
                    ? ` — the newest fill the book has is ${fmtIsoDateToken(summary.newestTradeDate)}.`
                    : '.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: nine columns, the design's 980 floor. */}
                  <table className="w-full min-w-[980px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={positionsUi.th}>Date</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Contract</th>
                        <th className={positionsUi.th}>Side</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Account</th>
                        <th className={positionsUi.th}>Qty</th>
                        <th className={positionsUi.th}>Price</th>
                        <th className={positionsUi.th}>Fees</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Src</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Linked to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>
                            {r.tradeDate ? fmtIsoDateToken(r.tradeDate) : '—'}
                          </td>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {contractToken(r)}
                          </td>
                          <td className={cn(positionsUi.td, r.side === 'SELL' ? 'text-warning' : 'text-secondary-foreground')}>
                            {r.side}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>{r.accountId || '—'}</td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{r.qty}</td>
                          <td className={cn(positionsUi.td, 'text-foreground')}>{fmtUsd(r.price)}</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {r.fees > 0 ? fmtUsd(r.fees) : '—'}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                            {SOURCE_LABEL[r.source] ?? r.source}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal')}>
                            {r.state === 'linked' ? (
                              <span className="inline-flex flex-wrap items-center gap-1.5 text-dense-meta">
                                <StatusLamp lamp="green" variant="dot" title="Linked" />
                                {/* The chain opens already lit on this instance. */}
                                <Link
                                  to={`/trade/rules?pick=instance:${r.instanceId}`}
                                  className={cn(
                                    positionsUi.mono,
                                    'font-bold text-[var(--color-entity-instance)] hover:underline',
                                  )}
                                  title="Open it in the rules chain"
                                >
                                  #{r.instanceId}
                                </Link>
                                <span className="text-muted-foreground">
                                  {r.opportunityName ?? r.instanceLabel ?? 'on an instance'}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex flex-wrap items-center gap-1.5 text-dense-meta text-warning">
                                <StatusLamp lamp="yellow" variant="dot" title="Nothing claims it" />
                                {r.why}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={cn(FOOT, 'flex flex-wrap gap-x-4 gap-y-1')}>
                <span>
                  Src is the path the fill arrived by, in the source&rsquo;s own word — Flex is the broker&rsquo;s
                  statement, TWS the terminal, Journal a row the desk wrote.
                </span>
                <Link to="/portfolio/ledger" className={cn(positionsUi.link, 'ml-auto')}>
                  reconcile → Trade Ledger
                </Link>
              </div>
            </section>

            <PositionsTier label="Intended plans" note="what was written down before the fill" />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Intended plans">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {planRows.length} {planRows.length === 1 ? 'plan' : 'plans'}
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ none has filled
                </DenseTag>
                <Link to="/trade/plans" className={cn(positionsUi.link, 'ml-auto')}>
                  Trade Plans →
                </Link>
              </header>
              {planRows.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No plan has been written.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: six columns, the design's 700 floor. */}
                  <table className="w-full min-w-[700px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Plan</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Structure</th>
                        <th className={positionsUi.th}>Limit</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Target · stop</th>
                        <th className={cn(positionsUi.th, 'text-left')}>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planRows.map((p) => (
                        <tr key={p.id}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-instance)]')}>
                            TP-{String(p.id).padStart(4, '0')}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-bold text-[var(--color-entity-option)]')}>
                            {p.symbol || '—'}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans text-secondary-foreground')}>
                            {p.structure ?? '—'}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {p.limit == null ? '—' : fmtUsd(p.limit)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                            {[p.target, p.stop].filter(Boolean).join(' · ') || 'none written'}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                              <StatusLamp lamp={p.filled ? 'green' : 'gray'} variant="dot" title={p.status} />
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{FILLS_UNRECORDED.plan}</p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page is the desk&rsquo;s
              window on the last few sessions. The record, its reconciliation and every write that fixes a fill are{' '}
              <Link to="/portfolio/ledger" className={positionsUi.link}>
                Trade Ledger&rsquo;s
              </Link>
              ; the order itself is TWS&rsquo;.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
