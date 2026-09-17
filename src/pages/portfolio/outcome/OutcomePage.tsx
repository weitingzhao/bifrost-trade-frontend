/**
 * Outcome — where the ideas came from, and how much of the plan happened.
 *
 * The book stores no `closed_at`, so a finished idea is one whose option legs
 * net to zero; realised is the Trade Ledger's own signed cash flow summed over
 * its fills. Two of the prototype's readings have nothing behind them yet and
 * say so rather than showing a zero: the screener lens that found an idea (and
 * the run that argued for it) never reaches a trade instance, and Trade Plans
 * stores no entry, target or stop, so no exit can be measured against a plan.
 *
 * How a play performs and how the trader behaves are Review's questions, not
 * this page's — the boundary is written at the foot, where it can be read.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtSignedUsd0 } from '@/pages/portfolio/performance/performanceReading'
import { useExecutionsFinal } from '@/hooks/useExecutions'
import { useOpportunities } from '@/hooks/useStrategies'
import {
  OUTCOME_SAMPLE_FLOOR,
  OUTCOME_UNRECORDED,
  buildOutcomeInstances,
  cutBySource,
  outcomeExits,
  outcomeGaps,
  scopeOutcome,
  unattributedCloses,
  type OutcomeInstance,
} from './outcomeModel'

const PAGE_LEAD =
  'Where the ideas came from, and how much of the plan actually happened. How each play performs is Review’s question, not this page’s.'

const SINCE: { value: string; label: string; days: number | null }[] = [
  { value: 'm', label: '1 month', days: 31 },
  { value: 'q', label: '1 quarter', days: 92 },
  { value: 'half', label: 'Half-year', days: 183 },
  { value: 'all', label: 'All', days: null },
]

/** The footnote bar under a panel — the same raised2 strip Backing's basis row sits on. */
const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

// The tag is a state, not a direction: it takes the lamp four-state, never the
// P&L green (§14.7 — the same hex on both would make one read as the other).
const EXIT_TONE: Record<string, string> = {
  expired: 'border-lamp-green/45 text-lamp-green',
  closed_early: 'border-[var(--color-entity-option)]/45 text-[var(--color-entity-option)]',
  assigned: 'border-[var(--color-entity-instance)]/45 text-[var(--color-entity-instance)]',
  unknown: 'border-border text-muted-foreground',
}

function epochDay(sec: number | null): string {
  if (sec == null) return '—'
  const d = new Date(sec * 1000)
  return fmtIsoDateToken(
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  )
}

function Money({ v, bold = false }: { v: number; bold?: boolean }) {
  return <span className={cn(positionsUi.mono, bold && 'font-bold', pnlColorClass(v))}>{fmtSignedUsd0(v)}</span>
}

export default function OutcomePage() {
  const execQuery = useExecutionsFinal()
  const oppQuery = useOpportunities(false)

  const [since, setSince] = useState('q')
  const [account, setAccount] = useState('all')
  const [picked, setPicked] = useState<number | null>(null)

  const executions = useMemo(() => execQuery.data?.items ?? [], [execQuery.data?.items])
  const closed = useMemo(
    () =>
      buildOutcomeInstances({
        executions,
        opportunities: oppQuery.data?.items ?? [],
      }),
    [executions, oppQuery.data?.items],
  )

  const accounts = useMemo(() => [...new Set(closed.map((r) => r.accountId).filter(Boolean))].sort(), [closed])
  const days = SINCE.find((s) => s.value === since)?.days ?? null
  const rows = useMemo(
    () => scopeOutcome(closed, days).filter((r) => account === 'all' || r.accountId === account),
    [closed, days, account],
  )

  const groups = useMemo(() => cutBySource(rows), [rows])
  const unattributed = useMemo(() => unattributedCloses(executions), [executions])
  const exits = useMemo(() => outcomeExits(rows, unattributed), [rows, unattributed])
  const gaps = useMemo(() => outcomeGaps(rows, unattributed), [rows, unattributed])
  const total = rows.reduce((s, r) => s + r.realised, 0)
  const onOpportunity = rows.filter((r) => r.source !== 'No opportunity')
  const attributed = onOpportunity.reduce((s, r) => s + r.realised, 0)
  const pick: OutcomeInstance | null = rows.find((r) => r.instanceId === picked) ?? rows[0] ?? null
  const maxExit = Math.max(1, ...exits.map((e) => Math.abs(e.realised)))

  const loading = execQuery.isLoading || oppQuery.isLoading
  const error = execQuery.error ?? oppQuery.error

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Outcome">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Outcome</p>}
          title="Outcome"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <SegmentControl
                size="xs"
                ariaLabel="Closed since"
                value={since}
                onChange={setSince}
                options={SINCE.map((s) => ({ value: s.value, label: s.label }))}
              />
              {accounts.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={account}
                  onChange={setAccount}
                  options={[{ value: 'all', label: 'All' }, ...accounts.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {rows.length} closed · <Money v={total} />
              </span>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void execQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : (
          <>
            <PositionsTier
              label="Where the ideas came from"
              note="two cuts only — the play and the structure are Review’s"
            />
            <section className={positionsUi.panel} aria-label="Where the ideas came from">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Cut by</span>
                <span className="inline-flex h-5.5 items-center rounded-[5px] border border-primary px-2 text-dense-meta font-semibold text-primary">
                  Source
                </span>
                <span
                  className="inline-flex h-5.5 cursor-default items-center rounded-[5px] border border-border px-2 text-dense-meta font-semibold text-muted-foreground/70"
                  title={OUTCOME_UNRECORDED.lens}
                >
                  Lens · not recorded
                </span>
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  on an opportunity <Money v={attributed} /> · on none <Money v={total - attributed} />
                </span>
              </header>
              {groups.length === 0 ? (
                <p className={cn('m-0 px-3 py-3 text-dense-meta text-muted-foreground')}>
                  Nothing closed in this window.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: eight columns, the design's 940 floor. */}
                  <table className="w-full min-w-[940px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '26%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Source</th>
                        <th className={positionsUi.th}>n</th>
                        <th className={positionsUi.th}>Hit rate</th>
                        <th className={positionsUi.th}>Realised</th>
                        <th className={positionsUi.th}>Avg</th>
                        <th className={positionsUi.th}>Worst</th>
                        <th className={positionsUi.th} title={OUTCOME_UNRECORDED.run}>
                          vs backtest
                        </th>
                        <th className={cn(positionsUi.th, 'text-left')}>Sample</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) => (
                        <tr key={g.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-sans whitespace-normal')}>
                            <span className="flex flex-col gap-px">
                              <span className="text-xs leading-normal font-semibold text-foreground">{g.name}</span>
                              <span className="text-dense-caption leading-normal text-muted-foreground">{g.sub}</span>
                            </span>
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{g.n}</td>
                          <td className={cn(positionsUi.td, g.hitRate == null ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {g.hitRate == null ? `${g.wins} of ${g.n}` : `${Math.round(g.hitRate * 100)}%`}
                          </td>
                          <td className={cn(positionsUi.td, 'font-bold', pnlColorClass(g.realised))}>{fmtSignedUsd0(g.realised)}</td>
                          <td className={cn(positionsUi.td, pnlColorClass(g.avg))}>{fmtSignedUsd0(g.avg)}</td>
                          <td className={cn(positionsUi.td, pnlColorClass(g.worst))}>{fmtSignedUsd0(g.worst)}</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')} title={OUTCOME_UNRECORDED.run}>
                            no linked run
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                              <StatusLamp lamp={g.hitRate == null ? 'gray' : 'green'} variant="dot" title={g.hitRate == null ? 'Too few closes to rate' : 'Reportable'} />
                              {g.hitRate == null ? 'too few to rate' : 'reportable'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={cn(FOOT, 'flex flex-wrap gap-x-4 gap-y-1')}>
                <span className="text-pretty">
                  A sample under {OUTCOME_SAMPLE_FLOOR} closes is a count, not a hit rate. Nine wins out of nine is not a
                  100% strategy, it is nine trades.
                </span>
                <span className="ml-auto text-pretty">
                  The play and the structure are Review Playbook Stats&rsquo; cuts — two pages computing one win rate would
                  disagree eventually.
                </span>
              </div>
            </section>

            <PositionsTier label="Plan vs actual" note="how they ended is the book’s; what the plan said is not stored yet" />
            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="How they ended">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.panelTitle}>How they ended</span>
                  <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                    {rows.length} closes
                  </span>
                </header>
                {exits.map((e) => (
                  <div
                    key={e.key}
                    className="flex flex-wrap items-center gap-2 border-b border-border/55 px-3 py-1.5 last:border-b-0"
                  >
                    <span className="min-w-29.5 text-xs leading-normal text-foreground">{e.label}</span>
                    <span className={cn(positionsUi.mono, 'w-8.5 text-dense-meta text-muted-foreground')}>
                      {e.n > 0 ? e.n : '—'}
                    </span>
                    <span className="h-1.75 min-w-15 flex-[1_1_6rem] overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                      <span
                        className={cn('block h-full', e.realised < 0 ? 'bg-loss/60' : 'bg-profit/60')}
                        style={{ width: `${Math.round((Math.abs(e.realised) / maxExit) * 100)}%` }}
                      />
                    </span>
                    <span className={cn(positionsUi.mono, 'w-21 text-right text-xs font-semibold', e.n > 0 ? pnlColorClass(e.realised) : 'text-muted-foreground')}>
                      {e.key === 'none' ? '—' : e.n > 0 ? fmtSignedUsd0(e.realised) : '—'}
                    </span>
                    <span className={cn(positionsUi.mono, 'w-19 text-right text-dense-meta text-muted-foreground')}>
                      {e.avg != null ? `${fmtSignedUsd0(e.avg)} avg` : ''}
                    </span>
                  </div>
                ))}
                <p className={cn(FOOT, 'm-0')}>
                  A stop is not in this list: a stop is a plan, and the plan is not stored. What the book can tell apart is
                  a trade that bought the leg back, a journal row that closed it, and an assignment.
                </p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Did it do what the plan said">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.panelTitle}>Did it do what the plan said</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ needs plan storage
                  </DenseTag>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Against the plan</th>
                        <th className={positionsUi.th}>n</th>
                        <th className={positionsUi.th}>Realised</th>
                        <th className={positionsUi.th}>vs target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['Hit the target', 'Closed before target', 'Hit the stop'].map((label) => (
                        <tr key={label}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-muted-foreground')}>{label}</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                        </tr>
                      ))}
                      <tr>
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-secondary-foreground')}>
                          No plan recorded
                        </td>
                        <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{rows.length}</td>
                        <td className={cn(positionsUi.td, 'font-bold', pnlColorClass(total))}>{fmtSignedUsd0(total)}</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>no reading</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={cn(FOOT, 'm-0')}>
                  {OUTCOME_UNRECORDED.plan} Grey, never zero —{' '}
                  <Link to="/trade/plans" className={positionsUi.link}>
                    Trade Plans →
                  </Link>
                </p>
              </section>
            </div>

            <PositionsTier label="The chain" note="idea → plan → fills → close · click a row to trace it" />
            <section className={positionsUi.panel} aria-label="The chain">
              <div className="overflow-x-auto">
                {/* §14.6: eight columns, the design's 1000 floor. */}
                <table className="w-full min-w-[1000px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Instance</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Source → rule</th>
                      <th className={positionsUi.th}>Closed</th>
                      <th className={positionsUi.th}>Days</th>
                      <th className={positionsUi.th}>Realised</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Plan</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Exit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.instanceId}
                        className={cn(
                          'cursor-pointer',
                          pick?.instanceId === r.instanceId
                            ? '[&>td]:bg-[var(--sk-surface)]'
                            : 'hover:[&>td]:bg-[var(--sk-raised2)]',
                        )}
                        onClick={() => setPicked(r.instanceId)}
                        title="Trace this one below"
                      >
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-instance)]')}>
                          #{r.instanceId}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-bold text-[var(--color-entity-option)]')}>
                          {r.symbols.join(' ') || '—'}
                        </td>
                        <td
                          className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}
                          title={r.opportunityName ?? undefined}
                        >
                          {r.source} → {r.structureName ?? 'no rule recorded'}
                        </td>
                        <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{epochDay(r.closedAt)}</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>{r.daysHeld ?? '—'}</td>
                        <td className={cn(positionsUi.td, 'font-bold', pnlColorClass(r.realised))}>
                          {fmtSignedUsd0(r.realised)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left text-muted-foreground')} title={OUTCOME_UNRECORDED.plan}>
                          no reading
                        </td>
                        <td className={cn(positionsUi.td, 'text-left')}>
                          <span
                            className={cn(
                              'inline-flex h-4 items-center rounded-[3px] border px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em]',
                              EXIT_TONE[r.exit],
                            )}
                          >
                            {r.exit === 'closed_early' ? 'CLOSED EARLY' : r.exit === 'expired' ? 'EXPIRED' : r.exit.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Trace">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Trace</span>
                  {pick ? (
                    <>
                      <span className={cn(positionsUi.mono, 'text-dense-body font-bold text-[var(--color-entity-instance)]')}>
                        #{pick.instanceId}
                      </span>
                      <span className={cn(positionsUi.mono, 'text-dense-body font-bold text-[var(--color-entity-option)]')}>
                        {pick.symbols.join(' ')}
                      </span>
                      <span className="ml-auto">
                        <Money v={pick.realised} bold />
                      </span>
                    </>
                  ) : null}
                </header>
                {pick ? (
                  [
                    {
                      stage: 'Idea',
                      title: `${pick.source}${pick.opportunityName ? ` · ${pick.opportunityName}` : ''}`,
                      when: epochDay(pick.openedAt),
                      body: OUTCOME_UNRECORDED.run,
                      lamp: 'gray' as const,
                      out: null,
                    },
                    {
                      stage: 'Plan',
                      title: pick.structureName ?? 'no structure recorded',
                      when: '—',
                      body: OUTCOME_UNRECORDED.plan,
                      lamp: 'gray' as const,
                      out: { to: '/trade/plans', label: 'Trade Plans →' },
                    },
                    {
                      stage: 'Fills',
                      title: `${pick.fills} ${pick.fills === 1 ? 'fill' : 'fills'} on ${pick.contracts.join(' · ')}`,
                      when: `${epochDay(pick.openedAt)} → ${epochDay(pick.closedAt)}`,
                      body: 'Every fill on this instance, its FIFO pair and the stock it links to.',
                      lamp: 'green' as const,
                      out: { to: '/portfolio/ledger', label: 'the fills → Trade Ledger' },
                    },
                    {
                      stage: 'Close',
                      title: exits.find((e) => e.key === pick.exit)?.label ?? 'closed',
                      when: `${epochDay(pick.closedAt)} · ${pick.daysHeld ?? '—'} days`,
                      body: `Realised ${fmtSignedUsd0(pick.realised)}, commissions netted, on the ledger's own cash flow.`,
                      lamp: 'green' as const,
                      out: null,
                    },
                  ].map((st) => (
                    <div key={st.stage} className="flex gap-2.25 border-b border-border/55 px-3 py-1.75 last:border-b-0">
                      <StatusLamp lamp={st.lamp} variant="dot" className="mt-1.5 shrink-0" title={st.stage} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-2">
                          <span className={positionsUi.cap}>{st.stage}</span>
                          <span className="text-xs leading-normal font-semibold text-foreground">{st.title}</span>
                          <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>{st.when}</span>
                        </span>
                        <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">{st.body}</span>
                        {st.out ? (
                          <Link to={st.out.to} className={cn(positionsUi.link, 'self-start')}>
                            {st.out.label}
                          </Link>
                        ) : null}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">Nothing closed in this window to trace.</p>
                )}
              </section>

              <section className={positionsUi.panel} aria-label="Gaps">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Gaps</span>
                  <span className={positionsUi.panelTitle}>where the chain breaks</span>
                  <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-warning')}>
                    {unattributed} {unattributed === 1 ? 'close' : 'closes'} cannot be attributed
                  </span>
                </header>
                {gaps.map((g) => (
                  <div
                    key={g.what}
                    className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-foreground">
                      <StatusLamp lamp={g.tone === 'warn' ? 'yellow' : 'gray'} variant="dot" title={g.tone === 'warn' ? 'The book could answer this' : 'Nothing stores it yet'} />
                      {g.what}
                    </span>
                    <span className={cn(positionsUi.mono, 'text-xs font-semibold', g.tone === 'warn' ? 'text-warning' : 'text-muted-foreground')}>
                      {g.n}
                    </span>
                    <span className="min-w-0 flex-[1_1_12rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                      {g.why}
                    </span>
                    {g.to ? (
                      <Link to={g.to} className={positionsUi.link}>
                        {g.toLabel}
                      </Link>
                    ) : null}
                  </div>
                ))}
                <p className={cn(FOOT, 'm-0')}>
                  An unattributed close is not a loss of money, it is a loss of the lesson: nothing can say which idea it
                  belonged to.
                </p>
              </section>
            </div>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Outcome answers where an idea came
              from and how much of the plan happened. How a play performs, and how the trader behaves, are Review&rsquo;s —
              one win rate, computed once.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
