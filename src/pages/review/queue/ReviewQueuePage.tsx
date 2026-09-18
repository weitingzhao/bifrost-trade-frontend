/**
 * Review · Queue — closed trades, and the two questions a P&L blurs.
 *
 * The design's centrepiece is a 2×2: plan quality against adherence, because
 * "it made money" and "I did what I said" are different facts and the fix is
 * different in each cell. Both axes need something this side does not have —
 * a plan linked to the position, and the mark through the holding period — so
 * the grid keeps its place and says which number is missing in which cell,
 * rather than being dropped or filled with an estimate.
 *
 * The queue itself is real: sixty-odd closed trades out of the ledger, each
 * with what it made, how long it was held, how far out it was written and what
 * share of the credit it kept. Three of the design's eleven columns are the
 * ones that need the plan; they are marked in the header rather than removed.
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
import { PositionsStat } from '@/components/positions/PositionsStat'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'
import { ReviewTradeFit } from '@/components/review/ReviewTradeFit'

const PAGE_LEAD =
  'Every closed trade, and the two questions a single P&L blurs: was the plan any good, and did I follow it. The queue is the ledger’s; the two gaps need a plan this book has never linked to a position.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The design's four cells, each with the fix it implies and what it needs. */
const QUADRANTS = [
  {
    key: 'good-kept',
    name: 'Good plan, kept',
    detail: 'The plan aimed near the best the trade printed, and the exit landed on it.',
    action: 'Nothing to fix. This is the cell to widen.',
  },
  {
    key: 'good-broken',
    name: 'Good plan, broken',
    detail: 'The plan was right and the exit was not. The cost is discipline, not analysis.',
    action: 'Fix the exit, not the rule.',
  },
  {
    key: 'bad-kept',
    name: 'Bad plan, kept',
    detail: 'The exit did what the plan said, and the plan was aiming at the wrong number.',
    action: 'Fix the rule, not the exit.',
  },
  {
    key: 'bad-broken',
    name: 'Bad plan, broken',
    detail: 'Neither half held. The trade says nothing about either until they are separated.',
    action: 'Separate them before drawing a lesson.',
  },
] as const

/** The design's window on the queue. `all` is every closed trade the ledger has. */
const SINCE_MONTHS: Record<string, number | null> = { m: 1, q: 3, half: 6, all: null }
const SINCE_LABEL: Record<string, string> = { m: 'month', q: 'three months', half: 'six months' }

function closedSince(months: number | null): string | null {
  if (months == null) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

export default function ReviewQueuePage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const [side, setSide] = useState('all')
  const [since, setSince] = useState('all')
  const [picked, setPicked] = useState<string | null>(null)
  const { trades, expiredUnbooked, accountIds, loading, error, refetch } = useReviewTrades(accountFilter)

  // The window first, so every figure on the page is about the same set of trades.
  const inWindow = useMemo(() => {
    const cut = closedSince(SINCE_MONTHS[since] ?? null)
    return cut == null ? trades : trades.filter((t) => (t.closedOn ?? '') >= cut)
  }, [trades, since])

  const rows = useMemo(() => {
    if (side === 'wins') return inWindow.filter((t) => t.win)
    if (side === 'losses') return inWindow.filter((t) => !t.win)
    return inWindow
  }, [inWindow, side])

  // A row the window or the outcome filter has dropped is not a selection any more.
  const selected = useMemo(() => rows.find((t) => t.contractKey === picked) ?? null, [rows, picked])

  const realised = useMemo(() => inWindow.reduce((a, t) => a + t.realised, 0), [inWindow])
  const wins = inWindow.filter((t) => t.win).length

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Review Queue">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Queue</p>}
          title="Review"
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
              <SegmentControl
                size="xs"
                ariaLabel="Closed since"
                value={since}
                onChange={setSince}
                options={[
                  { value: 'm', label: '1M' },
                  { value: 'q', label: '3M' },
                  { value: 'half', label: '6M' },
                  { value: 'all', label: 'All' },
                ]}
              />
              <SegmentControl
                size="xs"
                ariaLabel="Outcome"
                value={side}
                onChange={setSide}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'wins', label: 'Wins' },
                  { value: 'losses', label: 'Losses' },
                ]}
              />
              <Link to="/review/habits" className={positionsUi.link}>
                Habits →
              </Link>
              <Link to="/review/playbook-stats" className={positionsUi.link}>
                Playbook stats →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="What is closed">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Closed</span>
                <span className={positionsUi.panelTitle}>
                  {inWindow.length} {inWindow.length === 1 ? 'trade' : 'trades'}
                  {since === 'all' ? ' in the ledger' : ` closed in the last ${SINCE_LABEL[since]}`}
                </span>
                <DenseTag variant="warning" size="cell">
                  ⚠ nothing records a review
                </DenseTag>
              </header>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-x-4 gap-y-2 px-3 py-2.5">
                <PositionsStat
                  cap="Closed trades"
                  value={String(inWindow.length)}
                  sub={
                    since === 'all'
                      ? 'taken flat by their own fills'
                      : `taken flat by their own fills · ${trades.length} in the ledger`
                  }
                />
                <PositionsStat
                  cap="Won"
                  value={inWindow.length === 0 ? '—' : `${wins} / ${inWindow.length}`}
                  sub={inWindow.length === 0 ? 'nothing closed' : `${fmtPct0(wins / inWindow.length)} of closed trades`}
                />
                <PositionsStat
                  cap="Realised"
                  value={fmtUsd(realised)}
                  ink={pnlColorClass(realised)}
                  sub="fills-based, fees included"
                />
                <PositionsStat
                  cap="Over but unbooked"
                  value={String(expiredUnbooked)}
                  ink={expiredUnbooked > 0 ? 'text-warning' : undefined}
                  sub="past expiry with no closing fill, in the whole ledger — no realised figure to read"
                />
              </div>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.reviewed}</p>
            </section>

            <PositionsTier
              label="Plan quality × adherence"
              note="four cells, four different fixes — and neither axis can be read yet"
            />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Plan quality and adherence">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>no trade can be placed in a cell</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ both axes are missing
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  plan quality is the plan’s target against the best mark · adherence is the exit landing on the planned
                  one
                </span>
              </header>
              <div className={positionsUi.bandGrid}>
                {QUADRANTS.map((q) => (
                  <div key={q.key} className="min-w-0 border-b border-border/55 px-3 py-2 last:border-b-0">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="text-xs leading-normal font-semibold text-foreground">{q.name}</span>
                      <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                        <StatusLamp lamp="gray" variant="dot" title="No trade placed" />n —
                      </span>
                    </div>
                    <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">{q.detail}</p>
                    <p className="m-0 text-dense-meta leading-normal text-secondary-foreground text-pretty">
                      {q.action}
                    </p>
                  </div>
                ))}
              </div>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.plan}</p>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
            </section>

            <PositionsTier label="Queue" note="newest close first · a row is one contract the fills took flat" />
            <section className={positionsUi.panel} aria-label="Queue">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {rows.length} {side === 'all' ? 'trades' : side}
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  Plan said · Discipline · Plan cost are the three columns the missing plan would fill
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: ten columns, the design's 1120 floor. */}
                <table className="w-full min-w-[1120px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '5%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Trade</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Play</th>
                      <th className={positionsUi.th}>Closed</th>
                      <th className={positionsUi.th}>Held</th>
                      <th className={positionsUi.th}>DTE at entry</th>
                      <th className={positionsUi.th}>Realised</th>
                      <th className={positionsUi.th}>Credit kept</th>
                      <th className={positionsUi.th}>Plan said</th>
                      <th className={positionsUi.th}>Discipline</th>
                      <th className={positionsUi.th}>Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr
                        key={t.contractKey}
                        onClick={() => setPicked((cur) => (cur === t.contractKey ? null : t.contractKey))}
                        aria-selected={t.contractKey === picked}
                        className={cn(
                          'cursor-pointer hover:[&>td]:bg-[var(--sk-raised2)]',
                          t.contractKey === picked && '[&>td]:bg-[var(--sk-raised2)]',
                        )}
                      >
                        <td
                          className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}
                        >
                          {t.label}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans truncate text-muted-foreground')}>
                          {t.play ?? 'no play recorded'}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
                        </td>
                        <td className={cn(positionsUi.td, 'text-foreground')}>
                          {t.daysHeld == null ? '—' : `${t.daysHeld}d`}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {t.dteAtEntry == null ? '—' : `${t.dteAtEntry}d`}
                        </td>
                        <td className={cn(positionsUi.td, pnlColorClass(t.realised))}>{fmtUsd(t.realised)}</td>
                        <td
                          className={cn(
                            positionsUi.td,
                            t.creditKept == null ? 'text-muted-foreground' : 'text-secondary-foreground',
                          )}
                        >
                          {t.creditKept == null ? 'debit' : fmtPct0(t.creditKept)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          <span className="inline-flex items-center gap-1.5">
                            <StatusLamp lamp="gray" variant="dot" title="No plan" />
                            no plan
                          </span>
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
                        <td className={cn(positionsUi.td, 'text-left font-sans')}>
                          <Link to={`/review/fit?trade=${encodeURIComponent(t.contractKey)}`} className={positionsUi.link}>
                            open →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Discipline is realised minus what the plan&rsquo;s own exit would have produced; plan cost is that
                planned exit minus the best mark the trade printed. A row can be green on realised and still carry a
                cost in both — which is exactly why they are separate columns, and why leaving them out rather than
                marking them would hide the page&rsquo;s subject.
              </p>
            </section>

            {/* The design reviews in place: the queue picks a trade and the panels open
                under it. Single trade is the same component on its own page, so the two
                cannot drift apart. */}
            <PositionsTier label="Review" note="pick a row above — the same reading Single trade opens on its own page" />
            {selected ? (
              <>
                <ReviewTradeFit trade={selected} tier={false} />
                <p className={cn(FOOT, 'm-0 rounded-md border border-border')}>
                  <Link
                    to={`/review/fit?trade=${encodeURIComponent(selected.contractKey)}`}
                    className={positionsUi.link}
                  >
                    Open {selected.label} on its own page →
                  </Link>
                </p>
              </>
            ) : (
              <p className="m-0 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                No trade picked. Click a row in the queue to read it here, or open it on its own page from the last
                column.
              </p>
            )}

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Closed trades only,
              fills-based, fees included. An open position never counts toward a win rate — that is how a book talks
              itself into holding losers. Nothing on this page writes.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
