/**
 * Review · Playbook stats — what each play has actually done.
 *
 * The most answerable page in the group, because it asks only of closed fills:
 * how many, how many won, what share of the credit was kept, how long they were
 * held, and what the gross win was against the gross loss. All of that is in the
 * ledger.
 *
 * Two of the design's columns are not. Maximum adverse excursion needs the mark
 * through the holding period, and the size cap a play earns is a policy with no
 * store on this side — the same one Risk Budget is missing. Both keep their
 * column and say so.
 *
 * The design's other half — a play's record bucketed by market regime, so a
 * play is only quoted for the regime you are in — has no regime read on this
 * side at all. It is marked rather than drawn flat, because a single blended
 * number flatters a play that only works in one regime.
 */
import { useState } from 'react'
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
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { REVIEW_UNRECORDED, THIN_SAMPLE } from '@/utils/reviewTrades'

const PAGE_LEAD =
  'What each play has actually done — closed trades from the ledger, fills-based and fees included. Under twenty trades the band is the reading, not the point.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function PlaybookStatsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const { trades, plays, accountIds, loading, error, refetch } = useReviewTrades(accountFilter)
  const thin = plays.filter((p) => p.thin).length

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Playbook stats">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Playbook stats</p>}
          title="Playbook stats"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {accountIds.length > 1 ? (
                <SegmentControl
                  size="xs"
                  ariaLabel="Account"
                  value={accountFilter}
                  onChange={setAccountFilter}
                  options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                />
              ) : null}
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {plays.length} plays · {trades.length} closed trades
              </span>
              <Link to="/portfolio/ledger" className={positionsUi.link}>
                Trade Ledger →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="By play">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>By play</span>
                <span className={positionsUi.panelTitle}>{plays.length} plays</span>
                {thin > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Thin sample" />
                    {thin} under {THIN_SAMPLE} trades
                  </span>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  credit kept = 1 − exit ÷ entry premium
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: ten columns, the design's 1120 floor. */}
                <table className="w-full min-w-[1120px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '11%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Play</th>
                      <th className={positionsUi.th}>n</th>
                      <th className={positionsUi.th}>Win</th>
                      <th className={positionsUi.th}>95% band</th>
                      <th className={positionsUi.th}>Credit kept</th>
                      <th className={positionsUi.th}>Avg days</th>
                      <th className={positionsUi.th}>Avg P&amp;L</th>
                      <th className={positionsUi.th}>Best</th>
                      <th className={positionsUi.th}>Worst</th>
                      <th className={positionsUi.th}>Profit factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plays.map((p) => (
                      <tr key={p.play} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-sans truncate text-foreground')}>
                          {p.play}
                        </td>
                        <td className={cn(positionsUi.td, p.thin ? 'text-warning' : 'text-foreground')}>{p.n}</td>
                        <td className={cn(positionsUi.td, 'text-foreground')}>{fmtPct0(p.winRate)}</td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {fmtPct0(p.bandLow)}–{fmtPct0(p.bandHigh)}
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            p.creditKept == null ? 'text-muted-foreground' : 'text-secondary-foreground',
                          )}
                        >
                          {p.creditKept == null ? 'debit' : fmtPct0(p.creditKept)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {p.avgDaysHeld == null ? '—' : p.avgDaysHeld.toFixed(0)}
                        </td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.avgRealised))}>{fmtUsd(p.avgRealised)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.best))}>{fmtUsd(p.best)}</td>
                        <td className={cn(positionsUi.td, pnlColorClass(p.worst))}>{fmtUsd(p.worst)}</td>
                        <td
                          className={cn(
                            positionsUi.td,
                            p.profitFactor == null
                              ? 'text-muted-foreground'
                              : p.profitFactor >= 1.2
                                ? 'text-profit'
                                : 'text-warning',
                          )}
                        >
                          {p.profitFactor == null ? 'no loser yet' : p.profitFactor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Every play here is under {THIN_SAMPLE} trades, so every band is wide — that is the reading, not a
                shortcoming of the table. A win rate quoted as a point on eleven trades is a guess wearing a number.
              </p>
            </section>

            <PositionsTier label="What this table cannot say" note="two columns and one whole half of the design" />
            <div className={positionsUi.bandGrid}>
              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="By regime">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Play × regime</span>
                  <span className={positionsUi.panelTitle}>no regime reaches this side</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ the sample is not sliced
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  The pattern the design is after is that short-premium plays lose their edge in a vol spike and earn it
                  back in calm-but-high-IV. Every row above is the whole sample instead, which is the one reading that
                  can flatter a play that only works in one regime.
                </p>
                <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.regime}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Size cap and MAE">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Two columns</span>
                  <span className={positionsUi.panelTitle}>MAE and the size cap a play earns</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ neither is stored
                  </DenseTag>
                </header>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2.5 border-b border-border/55 px-3 py-2">
                  <span className="text-dense-caption font-semibold uppercase tracking-[0.08em] text-secondary-foreground">
                    MAE
                  </span>
                  <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
                    The worst a trade went before it came back needs the mark through the holding period, which nothing
                    stores. Without it a play that wins often and hurts badly on the way reads the same as one that
                    never moves against you.
                  </span>
                </div>
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2.5 px-3 py-2">
                  <span className="text-dense-caption font-semibold uppercase tracking-[0.08em] text-secondary-foreground">
                    Size cap
                  </span>
                  <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
                    Full allowance, half under {THIN_SAMPLE} trades, none under a profit factor of 1.2 — a policy, and
                    the same store{' '}
                    <Link to="/risk/budget" className={positionsUi.link}>
                      Risk Budget
                    </Link>{' '}
                    is missing. The stats above are what such a rule would read; nothing reads them yet.
                  </span>
                </div>
                <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.cap}</p>
              </section>
            </div>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Closed trades only,
              fills-based, fees included. Open positions never count toward a win rate — that is how a book talks
              itself into holding losers.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
