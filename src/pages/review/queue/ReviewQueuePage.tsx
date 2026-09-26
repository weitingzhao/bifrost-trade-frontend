/**
 * Review — every closed trade, and the two questions a single P&L blurs.
 *
 * Laid out as the design lays it out: one filter bar with the window, the
 * accounts and the review state; the 2×2 that separates plan quality from
 * adherence, because the fix differs in every cell; then the queue and, beside
 * it, the trade being reviewed and what the sample can support.
 *
 * Both halves of the method need something this side has not got — a plan
 * linked to the position, and a mark through the holding period — so every
 * figure that turns on either is marked rather than dropped or invented. The
 * shape is the page's argument; a queue with the argument removed is a P&L
 * list wearing Review's name.
 */
import { useMemo, useState } from 'react'
import { usePageViewState } from '@/lib/pageView'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { rowSelectProps } from '@/hooks/useRowLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { REVIEW_UNRECORDED, type ReviewTrade } from '@/utils/reviewTrades'
import { ReviewSelectedPanel } from './ReviewSelectedPanel'

const PAGE_LEAD =
  'Closed trades, newest first, each row carrying the gap between what the plan said and what I did. Reviewing here is what produces the labels — Habits is empty arithmetic without it.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The design's window on the queue. `all` is every closed trade the ledger has. */
const SINCE_MONTHS: Record<string, number | null> = { m: 1, q: 3, half: 6, all: null }
const SINCE_LABEL: Record<string, string> = { m: 'month', q: 'three months', half: 'six months' }

/** The design's sample floor: below it Habits shows counts and withholds conclusions. */
const SAMPLE_FLOOR = 20

function closedSince(months: number | null): string | null {
  if (months == null) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

/** The design's four cells, each with the fix it implies. */
const QUADRANTS = [
  {
    key: 'good-kept',
    name: 'Good plan, followed',
    action: 'This is the edge. Size it up, change nothing.',
    tone: 'text-profit',
  },
  {
    key: 'good-broken',
    name: 'Good plan, broke it',
    action: 'Breaking good plans costs money here. The fix is a resting exit order, not a new plan.',
    tone: 'text-warning',
  },
  {
    key: 'weak-kept',
    name: 'Weak plan, followed',
    action: 'I did what I said; what I said was the problem. Re-run the backtest and move the target.',
    tone: 'text-warning',
  },
  {
    key: 'weak-broken',
    name: 'Weak plan, broke it',
    action: 'Weak plan and broken too. Whatever the P&L, these teach nothing.',
    tone: 'text-warning',
  },
] as const

function QueueRow({
  t,
  picked,
  onPick,
}: {
  t: ReviewTrade
  picked: boolean
  onPick: () => void
}) {
  return (
    <tr
      {...rowSelectProps(
        picked,
        onPick,
        cn(
          'hover:[&>td]:bg-[var(--sk-raised2)]',
          picked && '[&>td]:bg-[var(--sk-raised2)]',
        ),
      )}
    >
      <td className={cn(positionsUi.td, 'pl-2 text-left whitespace-normal')}>
        <span className="inline-flex items-center gap-1.5">
          {/* The design lamps reviewed against unreviewed. Nothing records a review, so
              every row carries the same grey: unknown, not "to do". */}
          <StatusLamp lamp="gray" variant="dot" title="No review is recorded either way" />
          <span className={cn(positionsUi.mono, 'font-bold text-[var(--color-entity-option)]')}>{t.label}</span>
        </span>
      </td>
      {/* `symbol` on a closed option trade is the raw OCC string; the column wants the
          underlying, the way §14.4 draws one. The name is its own destination —
          and it sits inside a row that picks, so its click must stop there or
          both fire and the row wins. */}
      <td className={cn(positionsUi.td, 'text-left font-bold text-entity-option')}>
        <Link
          to={withSymbolParam(SYMBOL_PATH, extractUnderlyingRootSymbol(t.symbol))}
          onClick={(e) => e.stopPropagation()}
          className="hover:underline"
          title={`Open ${extractUnderlyingRootSymbol(t.symbol)} on Symbol`}
        >
          {extractUnderlyingRootSymbol(t.symbol)}
        </Link>
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}>
        {t.play ?? 'no play recorded'}
        <span className="text-muted-foreground/70"> → no rule</span>
      </td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>
        {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
      </td>
      <td className={cn(positionsUi.td, 'text-foreground')}>
        {t.daysHeld == null ? '—' : `${t.daysHeld}/${t.dteAtEntry ?? '—'}d`}
      </td>
      <td className={cn(positionsUi.td, pnlColorClass(t.realised))}>{fmtUsd(t.realised)}</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-left font-sans')}>
        {/* The design's five exit kinds (target, stop, early, late, expired) need the
            planned bar to tell four of them apart. The fills give two. */}
        <DenseTag variant="neutral" size="cell">
          {t.exitKind}
        </DenseTag>
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>none derivable</td>
    </tr>
  )
}

export default function ReviewQueuePage() {
  const [accountFilter, setAccountFilter] = useState('all')
  // The page's view (Rev .79 `since · quad · sel`), kept for the session.
  const [since, setSince] = usePageViewState('since', 'all')
  const [picked, setPicked] = usePageViewState<string | null>('sel', null)
  const [cell, setCell] = usePageViewState<string | null>('quad', null)
  const { trades, expiredUnbooked, accountIds, loading, error, refetch } = useReviewTrades(accountFilter)

  // The window first, so every figure on the page is about the same set of trades.
  const rows = useMemo(() => {
    const cut = closedSince(SINCE_MONTHS[since] ?? null)
    return cut == null ? trades : trades.filter((t) => (t.closedOn ?? '') >= cut)
  }, [trades, since])

  // A cell is a claim about the plan and the path. Neither reaches this side, so no
  // trade can be placed in one — the filter works, and answers with nothing every time.
  const queueRows = useMemo(() => (cell == null ? rows : rows.filter(() => false)), [rows, cell])
  const cellName = QUADRANTS.find((q) => q.key === cell)?.name ?? null

  const selected = useMemo(() => queueRows.find((t) => t.contractKey === picked) ?? null, [queueRows, picked])
  const realised = useMemo(() => rows.reduce((a, t) => a + t.realised, 0), [rows])
  const shortOfFloor = Math.max(0, SAMPLE_FLOOR - rows.length)

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Review Queue">
        <PageHeader
          // One level: the Queue is the Review layer's own page (§5a.1), so
          // naming Review twice would name the same place twice.
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review</p>}
          title="Review"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <Link to="/review/habits" className={positionsUi.link}>
                Habits →
              </Link>
              <Link to="/review/proposals" className={positionsUi.link}>
                Proposals →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full rounded-md" />
            <Skeleton className="h-40 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        ) : (
          <>
            {/* The design's one filter bar: the window, the accounts, the review state. */}
            <section className={positionsUi.panel} aria-label="Which closed trades">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className={positionsUi.cap}>Closed since</span>
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
                </span>
                {accountIds.length > 1 ? (
                  <span className="flex items-center gap-2">
                    <span className={positionsUi.cap}>Account</span>
                    <SegmentControl
                      size="xs"
                      ariaLabel="Account"
                      value={accountFilter}
                      onChange={setAccountFilter}
                      options={[{ value: 'all', label: 'Both' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
                    />
                  </span>
                ) : null}
                <span className="flex items-center gap-2">
                  <span className={positionsUi.cap}>State</span>
                  <SegmentControl
                    size="xs"
                    ariaLabel="Review state"
                    value="all"
                    onChange={() => {}}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'todo', label: 'To review', disabled: true },
                      { value: 'done', label: 'Reviewed', disabled: true },
                    ]}
                  />
                  <DenseTag variant="warning" size="cell">
                    ⚠ no review is recorded
                  </DenseTag>
                </span>
                <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>
                  <span className="text-muted-foreground">n/c awaiting</span> ·{' '}
                  <span className="text-foreground">{rows.length} in range</span> · realised{' '}
                  <span className={pnlColorClass(realised)}>{fmtUsd(realised)}</span> · discipline n/c · plan n/c
                </span>
              </div>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.reviewed}</p>
            </section>

            <PositionsTier
              label="Plan quality × adherence"
              note="four cells, four different fixes — and neither axis can be read yet"
            />
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Plan quality and adherence">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Four cells, four different fixes</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ both axes are missing
                </DenseTag>
                <span className="ml-auto text-dense-meta text-muted-foreground">click a cell to filter the queue</span>
              </header>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-2 px-3 py-2.5">
                {QUADRANTS.map((q) => (
                  <button
                    key={q.key}
                    type="button"
                    aria-pressed={cell === q.key}
                    onClick={() => setCell((cur) => (cur === q.key ? null : q.key))}
                    className={cn(
                      'min-w-0 cursor-pointer rounded-md border bg-transparent px-3 py-2 text-left font-[inherit]',
                      cell === q.key ? 'border-primary' : 'border-border hover:border-border/80',
                    )}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-dense-body font-semibold text-foreground">{q.name}</span>
                      <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>n 0</span>
                    </span>
                    <span className={cn(positionsUi.mono, 'block pt-0.5 text-dense-meta text-muted-foreground')}>
                      discipline n/c · plan cost n/c
                    </span>
                    <span className={cn('block pt-1 text-dense-meta leading-normal text-pretty', q.tone)}>
                      {q.action}
                    </span>
                  </button>
                ))}
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Plan quality is the plan&rsquo;s target against the best mark the trade printed; adherence is the exit
                landing within three bars of the planned one. The design leaves a plan-less trade out of the grid
                entirely — adherence needs a plan to adhere to — and on this side that is every one of them, which is
                why each cell reads n 0 and picking one empties the queue. {REVIEW_UNRECORDED.plan}
              </p>
            </section>

            {/* Queue and, beside it, the trade being reviewed — the design's own split,
                640px of queue against 360px of review before they stack. */}
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <section className={cn(positionsUi.panel, 'flex-[999_1_40rem]')} aria-label="Queue">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Queue</span>
                  <span className={positionsUi.panelTitle}>
                    {cellName ?? (since === 'all' ? 'All closed' : `Closed in the last ${SINCE_LABEL[since]}`)}
                  </span>
                  <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                    {queueRows.length}
                  </span>
                  {cellName ? (
                    <button type="button" className={positionsUi.link} onClick={() => setCell(null)}>
                      clear cell filter
                    </button>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">click a row to review it</span>
                </header>
                <div className="overflow-x-auto">
                  {/* §14.6: eleven columns. The design's floor is 1180, where its Trade column
                      is an id; ours is a whole contract token, so the table holds 1460 to keep
                      every cell unclipped at the measured widths. */}
                  <table className="w-full min-w-[1460px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '7%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Trade</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Structure → rule</th>
                        <th className={positionsUi.th}>Closed</th>
                        <th className={positionsUi.th} title="Days held over days to expiry at entry">
                          Held
                        </th>
                        <th className={positionsUi.th}>Realised</th>
                        <th className={positionsUi.th}>Plan said</th>
                        <th className={positionsUi.th}>Discipline</th>
                        <th className={positionsUi.th}>Plan cost</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Exit</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Auto tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={11}
                            className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}
                          >
                            {cellName
                              ? `No trade can be placed in “${cellName}”. Both axes need the plan a trade was opened under, and none of these ${rows.length} has one — clear the cell filter to see them again.`
                              : 'Nothing closed in this window.'}
                          </td>
                        </tr>
                      ) : (
                        queueRows.map((t) => (
                          <QueueRow
                            key={t.contractKey}
                            t={t}
                            picked={t.contractKey === picked}
                            onPick={() => setPicked((cur) => (cur === t.contractKey ? null : t.contractKey))}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className={cn(FOOT, 'm-0')}>
                  Discipline is realised minus what the plan&rsquo;s own exit would have produced; plan cost is that
                  planned exit minus the best mark the trade printed. A row can be green on realised and still carry a
                  cost in both — which is why they are separate columns, and why leaving them out rather than marking
                  them would hide the page&rsquo;s subject.
                </p>
              </section>

              <div className="flex min-w-0 flex-[1_1_22.5rem] flex-col gap-3">
                <PositionsTier label="Review" note={selected ? 'the trade picked in the queue' : 'pick a row'} />
                {selected ? (
                  <ReviewSelectedPanel trade={selected} />
                ) : (
                  <p className="m-0 border px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
                    No trade picked. Click a row in the queue to read it here.
                  </p>
                )}

                <section className={positionsUi.panel} aria-label="Sample">
                  <header className={positionsUi.panelHead}>
                    <span className={positionsUi.cap}>Sample</span>
                    <span className={positionsUi.panelTitle}>What this book can and cannot say</span>
                  </header>
                  <div className="flex flex-col gap-2 px-3 py-2.5">
                    <div className="flex min-w-0 gap-2.5">
                      <StatusLamp
                        lamp={shortOfFloor > 0 ? 'amber' : 'green'}
                        variant="dot"
                        title={shortOfFloor > 0 ? 'Below the floor' : 'At the floor'}
                      />
                      <span className="min-w-0">
                        <span className="block text-dense-body text-foreground">
                          n {rows.length} in range · floor {SAMPLE_FLOOR}
                        </span>
                        <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                          {shortOfFloor > 0
                            ? `Below the floor. Habits shows the counts and withholds the conclusions — ${shortOfFloor} more closed ${shortOfFloor === 1 ? 'trade' : 'trades'} to go.`
                            : 'At or above the floor, so a rate read here is worth quoting.'}
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-0 gap-2.5">
                      <StatusLamp lamp="gray" variant="dot" title="No reading" />
                      <span className="min-w-0">
                        <span className="block text-dense-body text-foreground">n/c of {rows.length} reviewed</span>
                        <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                          The design separates a confirmed review from an auto-tag, and counts only the confirmed.
                          Nothing here records either, so every label would be provisional.
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-0 gap-2.5">
                      <StatusLamp
                        lamp={expiredUnbooked > 0 ? 'amber' : 'green'}
                        variant="dot"
                        title="Over but unbooked"
                      />
                      <span className="min-w-0">
                        <span className="block text-dense-body text-foreground">
                          {expiredUnbooked} over but unbooked
                        </span>
                        <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                          Past expiry with no closing fill, in the whole ledger. Economically over, but with no
                          realised figure to read, so they are counted apart rather than folded in.
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
                </section>
              </div>
            </div>

            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
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
