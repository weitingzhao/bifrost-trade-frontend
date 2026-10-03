/**
 * Review — every closed trade, and the two questions a single P&L blurs.
 *
 * Laid out as the design lays it out: one filter bar with the window, the
 * accounts and the review state; the 2×2 that separates plan quality from
 * adherence, because the fix differs in every cell; then the queue and, beside
 * it, the trade being reviewed and what the sample can support.
 *
 * One half of the method needs something this side has not got — a plan
 * linked to the position (DEV 2026-09-26: three plans on file, all
 * cancelled, none filled) — so every figure that turns on it is marked rather
 * than dropped or invented. The other half, the mark through the holding
 * period, is read: the tags, in the queue and on the picked trade, come off
 * the contract's own daily bars. The shape is the page's argument; a queue
 * with the argument removed is a P&L list wearing Review's name.
 */
import { useMemo, useState } from 'react'
import { usePageViewState } from '@/lib/pageView'
import { Link } from 'react-router-dom'
import { ToolbarClear, ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { PageHead, PageHeadLink, PageShell } from '@/components/layout'
import { rowSelectProps } from '@/hooks/useRowLink'
import { useExecutionsAll } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { useBookMarkPaths } from '@/hooks/useBookMarkPaths'
import { useReviewContracts } from '@/hooks/useReviewContracts'
import { EXIT_LABEL, REVIEW_UNRECORDED, type ExitKind } from '@/utils/reviewContracts'
import { useTradeOrigins } from '@/hooks/useTradeOrigins'
import { ORIGIN_UNRECORDED, type TradeOrigin } from '@/utils/tradeOrigin'
import { derivedTags, exitTags } from '@/pages/review/fit/tradeFitModel'
import { useNavigate } from 'react-router-dom'
import { tradeReviewPath } from '@/components/layout'
import { useTradeReviews } from '@/hooks/useTradeReviews'
import { useTradeStates } from '@/hooks/useStrategies'
import { buildReviewedTrades, type ReviewedTrade } from '@/utils/reviewedTrades'
import type { TradeReview } from '@/api/tradeReviews'

const PAGE_LEAD =
  'Closed trades, newest first, each row carrying the gap between what the plan said and what I did. Reviewing here is what produces the labels — Habits is empty arithmetic without it.'

// Rev .62: a foot is a rule, not a band.
const FOOT = 'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'
/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

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

/** Rev .112: the bar each ending draws in How they ended — its ink says what kind of ending it was. */
const EXIT_BAR: Record<ExitKind, string> = {
  expired: 'var(--color-profit)',
  closed: 'var(--sk-contract)',
  assigned: 'var(--sk-trade)',
  stop: 'var(--color-loss)',
  early: 'var(--color-warning)',
  late: 'var(--color-warning)',
  open: 'var(--sk-mute)',
}
const EXIT_ORDER: ExitKind[] = ['expired', 'closed', 'assigned', 'stop', 'early', 'late']

function exitVariant(k: ExitKind): 'danger' | 'warning' | 'neutral' {
  return k === 'assigned' || k === 'stop' ? 'danger' : k === 'early' || k === 'late' ? 'warning' : 'neutral'
}

/**
 * The path tags are per contract; the ending is per trade (Rev .112), so the
 * two tags it names — assigned, stopped out — are put in front here.
 */
function withExitTag(
  t: ReviewedTrade,
  tags: { text: string; title: string } | null,
): { text: string; title: string } | null {
  const exit = exitTags(t)
  if (tags == null || exit.length === 0) return tags
  return {
    text: [...exit.map((g) => g.label), tags.text === 'none' ? null : tags.text].filter(Boolean).join(' · '),
    title: [...exit.map((g) => g.why), tags.title].join('\n'),
  }
}

/** Rev .112 Gaps: the two holes Outcome used to count, as filters on the queue. */
const GAPS = {
  noplan: {
    label: 'No plan',
    title: 'Trades with no written plan — adherence cannot be measured',
  },
  norun: {
    label: 'No run',
    title: `Ideas with no backtest run behind them — nothing to compare the result against. ${ORIGIN_UNRECORDED.run}`,
  },
} as const
type GapKey = keyof typeof GAPS

/** The design's four cells, each with the fix it implies. */
const QUADRANTS = [
  {
    key: 'good-kept',
    name: 'Good plan, followed',
    action: 'This is the edge. Size it up, change nothing.',
  },
  {
    key: 'good-broken',
    name: 'Good plan, broke it',
    action: 'Breaking good plans costs money here. The fix is a resting exit order, not a new plan.',
  },
  {
    key: 'weak-kept',
    name: 'Weak plan, followed',
    action: 'I did what I said; what I said was the problem. Re-run the backtest and move the target.',
  },
  {
    key: 'weak-broken',
    name: 'Weak plan, broke it',
    action: 'Weak plan and broken too. Whatever the P&L, these teach nothing.',
  },
] as const

function QueueRow({
  t,
  review,
  origin,
  onOpen,
  tags,
}: {
  t: ReviewedTrade
  review: TradeReview | undefined
  /** The plan the trade was opened under, when one names it (Rev .112 Source). */
  origin: TradeOrigin | undefined
  onOpen: () => void
  /** The path-derived tags, summarised; null while the book's bars are read. */
  tags: { text: string; title: string } | null
}) {
  const sym = extractUnderlyingRootSymbol(t.symbol)
  const done = Boolean(review?.reviewed)
  return (
    <tr
      {...rowSelectProps(false, onOpen, 'hover:[&>td]:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]')}
      title="Open this trade on Trade review"
    >
      <td className={cn(positionsUi.td, 'pl-2 text-left whitespace-normal')}>
        <span className="inline-flex items-center gap-1.5">
          {/* Rev .110: the lamp reads the review record — green reviewed, yellow awaiting. */}
          <StatusLamp
            lamp={t.tradeId == null ? 'gray' : done ? 'green' : 'yellow'}
            variant="dot"
            title={t.tradeId == null ? 'Booked to no trade — a review is kept per trade' : done ? 'Reviewed' : 'Awaiting review'}
          />
          <span className={cn(positionsUi.mono, 'font-bold text-[var(--color-entity-option)]')}>
            {t.tradeId != null ? `#${t.tradeId} · ` : ''}
            {t.label}
          </span>
        </span>
      </td>
      {/* `symbol` on a closed option trade is the raw OCC string; the column wants the
          underlying — a ticker, in the ticker's ink. The name is its own destination —
          and it sits inside a row that picks, so its click must stop there or
          both fire and the row wins. */}
      <td className={cn(positionsUi.td, 'text-left font-bold')}>
        <Link
          to={withSymbolParam(SYMBOL_PATH, sym)}
          onClick={(e) => e.stopPropagation()}
          className="text-entity-symbol hover:underline"
          title={`Open ${sym} on Symbol`}
        >
          {sym}
        </Link>
      </td>
      <td
        className={cn(positionsUi.td, 'text-left font-sans', origin ? 'text-[var(--sk-soft)]' : 'text-muted-foreground')}
        title={
          origin
            ? [origin.source, origin.ref, 'no lens recorded', 'no run linked'].filter(Boolean).join(' · ')
            : 'No plan names this trade, so nothing records where the idea came from'
        }
      >
        {origin?.source ?? '—'}
      </td>
      <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-[var(--sk-soft)]')}>
        {t.play ?? 'no play recorded'}
        <span className="text-muted-foreground"> → no rule</span>
      </td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>
        {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
      </td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>
        {t.daysHeld == null ? '—' : `${t.daysHeld}/${t.dteAtEntry ?? '—'}d`}
      </td>
      <td className={cn(positionsUi.td, 'font-semibold', pnlColorClass(t.realised))}>{fmtUsd(t.realised)}</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-muted-foreground')}>n/c</td>
      <td className={cn(positionsUi.td, 'text-left font-sans')}>
        {/* Rev .112: six endings. Expired and assigned come from the broker's own
            booking, stop from the credit; early and late need a plan's date. */}
        <DenseTag variant={exitVariant(t.exitKind)} size="cell" title={EXIT_LABEL[t.exitKind]}>
          {t.exitKind}
        </DenseTag>
      </td>
      <td className={cn(positionsUi.td, 'truncate text-left font-sans text-dense-meta text-muted-foreground')} title={tags?.title}>
        {tags == null ? '…' : tags.text}
      </td>
    </tr>
  )
}

export default function ReviewQueuePage() {
  const [accountFilter, setAccountFilter] = useState('all')
  // The page's view (Rev .79 `since · quad · sel`), kept for the session.
  const [since, setSince] = usePageViewState('since', 'all')
  const [cell, setCell] = usePageViewState<string | null>('quad', null)
  const [reviewFilter, setReviewFilter] = usePageViewState('state', 'all')
  const [exitFilter, setExitFilter] = usePageViewState<ExitKind | null>('exit', null)
  const [gap, setGap] = usePageViewState<GapKey | null>('gap', null)
  const origins = useTradeOrigins()
  const navigate = useNavigate()
  const { trades, expiredUnbooked, accountIds } = useReviewContracts(accountFilter)
  const reviews = useTradeReviews()
  // Rev .110: the queue reads instances — the same #NNN Trade review and the
  // Instance page read. Contract-level trades stay for the book's daily bars.
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  // The Auto tags column reads each contract's own daily bars — the same
  // book-wide read (and cache entry) Habits and Playbook stats use. The two
  // plan tags (held past plan · exited early) stay out: no plan is linked.
  const marks = useBookMarkPaths(trades)
  const tagsByKey = useMemo(() => {
    const by = new Map<string, { text: string; title: string }>()
    for (const t of trades) {
      const path = marks.paths.get(t.contractKey) ?? null
      const read = derivedTags(t, path).filter((g) => !g.unreadable)
      by.set(
        t.contractKey,
        path == null
          ? { text: 'no path', title: 'No daily bar covers this contract’s holding period, so nothing is derived.' }
          : { text: read.map((g) => g.label).join(' · ') || 'none', title: read.map((g) => g.why).join('\n') },
      )
    }
    return by
  }, [trades, marks.paths])
  // The same cache entry useReviewContracts reads — held here for its §17 state.
  const execQuery = useExecutionsAll()
  // Open / closed is the instance list's state (core 0.41.0, TD-43).
  const states = useTradeStates()
  const reviewed = useMemo(() => {
    const items = execQuery.data?.items ?? []
    const scoped = accountFilter === 'all' ? items : items.filter((e) => (e.account_id ?? '').trim() === accountFilter)
    return buildReviewedTrades(scoped, today, origins.exitBy, states).filter((t) => !t.open)
  }, [execQuery.data?.items, accountFilter, today, origins.exitBy, states])

  // The window first, so every figure on the page is about the same set of trades.
  const rows = useMemo(() => {
    const cut = closedSince(SINCE_MONTHS[since] ?? null)
    return cut == null ? reviewed : reviewed.filter((t) => (t.closedOn ?? '') >= cut)
  }, [reviewed, since])
  const isReviewed = (t: ReviewedTrade) => t.tradeId != null && Boolean(reviews.byTrade.get(t.tradeId)?.reviewed)
  const reviewedN = rows.filter(isReviewed).length
  const awaitingN = rows.filter((t) => t.tradeId != null && !isReviewed(t)).length

  // A cell is a claim about the plan and the path. The plan never reaches this
  // side, so no trade can be placed in one — the filter works, and answers
  // with nothing every time.
  const baseRows = useMemo(() => {
    if (cell != null) return rows.filter(() => false)
    if (reviewFilter === 'todo') return rows.filter((t) => t.tradeId != null && !isReviewed(t))
    if (reviewFilter === 'done') return rows.filter(isReviewed)
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cell, reviewFilter, reviews.byTrade])
  const hasPlan = (t: ReviewedTrade) => t.tradeId != null && origins.byTrade.has(t.tradeId)
  // No store holds a backtest run, so every idea is one with no run behind it.
  const gapTest: Record<GapKey, (t: ReviewedTrade) => boolean> = { noplan: (t) => !hasPlan(t), norun: () => true }
  const queueRows = baseRows.filter((t) => (!exitFilter || t.exitKind === exitFilter) && (!gap || gapTest[gap](t)))
  // Rev .112 How they ended: the endings of the trades in range, widest first by count.
  const exits = EXIT_ORDER.map((k) => {
    const items = baseRows.filter((t) => t.exitKind === k)
    return { key: k, n: items.length, realised: items.reduce((a, t) => a + t.realised, 0) }
  }).filter((e) => e.n > 0)
  const baseRealised = baseRows.reduce((a, t) => a + t.realised, 0)
  const cellName = QUADRANTS.find((q) => q.key === cell)?.name ?? null

  /** A row opens Trade review on it, walking the queue in the order shown (Rev .110). */
  const openRow = (t: ReviewedTrade) => {
    if (t.tradeId == null) {
      navigate(`/review/trade?trade=${encodeURIComponent(t.contractKey)}`)
      return
    }
    const list = shown.map((x) => x.tradeId).filter((id): id is number => id != null)
    navigate(tradeReviewPath(t.tradeId, { in: 'list', list: list.join(',') }))
  }
  const realised = useMemo(() => rows.reduce((a, t) => a + t.realised, 0), [rows])
  const shortOfFloor = Math.max(0, SAMPLE_FLOOR - rows.length)

  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(execQuery)
  const shown = preview === 'empty' || preview === 'filtered' ? [] : queueRows
  // §17.3: Clear resets every filter axis — the window and the cell. The
  // account is scope, not a filter.
  const resets = [
    since !== 'all' ? 'range' : null,
    cell != null ? 'cell' : null,
    reviewFilter !== 'all' ? 'state' : null,
    exitFilter != null ? 'ending' : null,
    gap != null ? 'gap' : null,
  ].filter((r): r is string => r != null)
  const clearAll = () => {
    setSince('all')
    setCell(null)
    setReviewFilter('all')
    setExitFilter(null)
    setGap(null)
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, Habits and the proposals as the head's doors. */}
      <PageHead
        title="Review"
        info={PAGE_LEAD}
        actions={
          <>
            <PageHeadLink to="/review/habits" title="What the closed trades add up to">
              Habits →
            </PageHeadLink>
            <PageHeadLink to="/review/proposals" title="Rule proposals are decided in the Decision Inbox">
              Rule proposals →
            </PageHeadLink>
          </>
        }
      />

      {/* The design's one filter bar: the window, the accounts, the review state. */}
      <div data-sr-toolbar="">
        <span data-sr-tb="label">Closed since</span>
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
        {accountIds.length > 1 ? (
          <>
            <span data-sr-tb="sep" />
            <span data-sr-tb="label">Account</span>
            <SegmentControl
              size="xs"
              ariaLabel="Account"
              value={accountFilter}
              onChange={setAccountFilter}
              options={[{ value: 'all', label: 'Both' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
            />
          </>
        ) : null}
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">State</span>
        <SegmentControl
          size="xs"
          ariaLabel="Review state"
          value={reviewFilter}
          onChange={setReviewFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'todo', label: 'To review' },
            { value: 'done', label: 'Reviewed' },
          ]}
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">Gaps</span>
        {(Object.keys(GAPS) as GapKey[]).map((k) => {
          const on = gap === k
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              title={GAPS[k].title}
              onClick={() => setGap(on ? null : k)}
              className={cn(positionsUi.btn, on && 'bg-[color-mix(in_srgb,var(--sk-accent)_18%,transparent)] text-foreground')}
            >
              {GAPS[k].label}{' '}
              <span className={cn(positionsUi.mono, 'text-muted-foreground')}>{baseRows.filter(gapTest[k]).length}</span>
            </button>
          )
        })}
        <ToolbarClear resets={resets} onClear={clearAll} />
        <span data-sr-tb="meta" className={positionsUi.mono}>
          <span className={awaitingN > 0 ? 'text-warning' : 'text-muted-foreground'}>{awaitingN} awaiting</span> ·{' '}
          <span className="text-foreground">{rows.length} in range</span> · realised{' '}
          <span className={pnlColorClass(realised)}>{fmtUsd(realised)}</span> · discipline n/c · plan n/c
        </span>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the closed book"
          detail={staleDetail(execQuery, 'a trade closed since then is not in the queue.')}
          onAction={() => void execQuery.refetch()}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the closed trades" rows={8} cols={8} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the closed trades"
            detail={failedDetail(execQuery, 'Nothing was evaluated — this is not an empty queue.')}
            onAction={() => void execQuery.refetch()}
          />
        </section>
      ) : (
        <>
          <section className={positionsUi.panel} style={WARN_EDGE} aria-label="Plan quality and adherence">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>Plan quality × adherence</span>
              <span className={positionsUi.panelTitle}>Four cells, four different fixes</span>
              <DenseTag variant="warning" size="cell">
                both axes need a plan
              </DenseTag>
              <span className="ml-auto text-dense-meta text-muted-foreground">click a cell to filter the queue</span>
            </header>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-2 px-3 py-2.5">
              {QUADRANTS.map((q) => {
                const on = cell === q.key
                return (
                  <button
                    key={q.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCell((cur) => (cur === q.key ? null : q.key))}
                    className={cn(
                      // Rev .142: a clickable card is group material, no frame.
                      'flex min-w-0 cursor-pointer flex-col gap-1 border px-3 py-2 text-left font-[inherit] mat-card',
                      // The picked cell is a selection: the accent outline and a 10% ground.
                      on
                        ? 'bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)] ring-1 ring-[var(--sk-accent)]'
                        : 'hover:bg-[var(--mat-card-fill-hover)]',
                    )}
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      {/* n 0 in every cell, so the names read muted, as the design draws an empty cell. */}
                      <span className="text-dense-body font-semibold text-muted-foreground">{q.name}</span>
                      <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta text-muted-foreground')}>n 0</span>
                    </span>
                    <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                      discipline n/c · plan cost n/c
                    </span>
                    <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">{q.action}</span>
                  </button>
                )
              })}
            </div>
            <p className={cn(FOOT, 'm-0')}>
              Plan quality is the plan&rsquo;s target against the best mark the trade printed; adherence is the exit
              landing within three bars of the planned one. The design leaves a plan-less trade out of the grid
              entirely — adherence needs a plan to adhere to — and on this side that is every one of them, which is
              why each cell reads n 0 and picking one empties the queue. {REVIEW_UNRECORDED.plan}
            </p>
          </section>

          {/* Rev .112: how the closed trades ended — from Outcome, now a filter on the queue. */}
          <section className={positionsUi.panel} aria-label="How they ended">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>How they ended</span>
              <span className={positionsUi.panelTitle}>
                {baseRows.length ? `${baseRows.length} closed · ${fmtUsd(baseRealised)}` : 'nothing closed in range'}
              </span>
              <span className="ml-auto text-dense-meta text-muted-foreground">click a segment to filter the queue</span>
            </header>
            <div className="flex min-w-0 gap-1 px-3 py-2.5">
              {exits.map((e) => {
                const on = exitFilter === e.key
                return (
                  <button
                    key={e.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setExitFilter(on ? null : e.key)}
                    title={`${e.n} ${EXIT_LABEL[e.key].toLowerCase()} · ${fmtUsd(e.realised)} realised`}
                    style={{ flex: `${e.n} 1 0` }}
                    className="flex min-w-24 cursor-pointer flex-col gap-1 border-0 bg-transparent p-0 pb-0.5 text-left font-[inherit] text-inherit"
                  >
                    <span
                      className="block h-1.5 rounded-sm"
                      style={{ background: EXIT_BAR[e.key], outline: on ? '1px solid var(--sk-accent)' : 'none', outlineOffset: 2 }}
                    />
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span className={cn('text-dense-meta font-semibold', !exitFilter || on ? 'text-foreground' : 'text-muted-foreground')}>
                        {EXIT_LABEL[e.key]}
                      </span>
                      <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{e.n}</span>
                      <span className={cn(positionsUi.mono, 'ml-auto text-dense-meta', pnlColorClass(e.realised))}>{fmtUsd(e.realised)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className={cn(FOOT, 'm-0')}>
              Expired and assigned are the broker&rsquo;s own bookings — assigned when it delivered the stock at a short
              leg&rsquo;s strike that day. Stopped lost more than the credit taken in. Closed early and closed late read
              the exit against a written plan&rsquo;s date (±3 days) and need a plan linked to the trade.
            </p>
          </section>

          {/* Queue and, beside it, the trade being reviewed — the design's own split,
              640px of queue against 360px of review before they stack. */}
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <section className={cn(positionsUi.panel, 'flex-[999_1_40rem]')} aria-label="Queue">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Queue</span>
                <span className={positionsUi.panelTitle}>
                  {cellName ??
                    (exitFilter
                      ? EXIT_LABEL[exitFilter]
                      : gap
                        ? GAPS[gap].label
                        : since === 'all'
                          ? 'All closed'
                          : `Closed in the last ${SINCE_LABEL[since]}`)}
                </span>
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>{shown.length}</span>
                {cellName ? (
                  <button type="button" className={positionsUi.link} onClick={() => setCell(null)}>
                    clear cell filter
                  </button>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">click a row to review it</span>
              </header>
              {shown.length === 0 ? (
                cellName || preview === 'filtered' ? (
                  <ViewState
                    kind="filtered"
                    title={cellName ? `No trades in “${cellName}”` : undefined}
                    detail={`Both axes need the plan a trade was opened under, and none of these ${rows.length} has one.`}
                    actionLabel="Clear cell"
                    onAction={() => setCell(null)}
                  />
                ) : exitFilter || gap ? (
                  <ViewState
                    kind="filtered"
                    title={`No trades match “${exitFilter ? EXIT_LABEL[exitFilter] : GAPS[gap as GapKey].label}”`}
                    detail="The ending and the gap filters narrow the queue together."
                    onAction={clearAll}
                  />
                ) : since !== 'all' ? (
                  <ViewState
                    kind="filtered"
                    title="Nothing closed in this window"
                    detail="Widen the range to see every closed trade."
                    onAction={clearAll}
                  />
                ) : (
                  <ViewState
                    kind="empty"
                    title="No closed trades yet"
                    detail="A trade reaches the queue once its own fills have taken the contract flat."
                  />
                )
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: twelve columns (Rev .112 adds Source). The design's floor is 1180, where
                      its Trade column is an id; ours is a whole contract token, so the table holds
                      1560 to keep every cell unclipped at the measured widths. */}
                  <table className="w-full min-w-[1560px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '7%' }} />
                      <col style={{ width: '13%' }} />
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
                        <th className={cn(positionsUi.th, 'text-left')} title="Where the idea came from, as its plan records it">
                          Source
                        </th>
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
                      {shown.map((t) => (
                        <QueueRow
                          key={t.contractKey}
                          t={t}
                          review={t.tradeId != null ? reviews.byTrade.get(t.tradeId) : undefined}
                          origin={t.tradeId != null ? origins.byTrade.get(t.tradeId) : undefined}
                          onOpen={() => openRow(t)}
                          tags={withExitTag(
                            t,
                            marks.loading
                              ? null
                              : t.legs.length === 1
                                ? (tagsByKey.get(t.legs[0].contractKey) ?? null)
                                : { text: `${t.legs.length} legs · on its page`, title: 'Tags are derived per contract path; a multi-leg trade reads them on Trade review.' },
                          )}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>
                Discipline is realised minus what the plan&rsquo;s own exit would have produced; plan cost is that
                planned exit minus the best mark the trade printed. A row can be green on realised and still carry a
                cost in both — which is why they are separate columns, and why leaving them out rather than marking
                them would hide the page&rsquo;s subject.
              </p>
            </section>

            <aside className="flex min-w-0 max-w-[28.75rem] flex-[1_1_22.5rem] flex-col gap-3">
              <section className={positionsUi.panel} aria-label="Sample">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Sample</span>
                  <span className={positionsUi.panelTitle}>What this book can and cannot say</span>
                </header>
                <div className="flex flex-col">
                  {[
                    {
                      key: 'floor',
                      lamp: shortOfFloor > 0 ? ('yellow' as const) : ('green' as const),
                      title: `n ${rows.length} in range · floor ${SAMPLE_FLOOR}`,
                      sub:
                        shortOfFloor > 0
                          ? `Below the floor. Habits shows the counts and withholds the conclusions — ${shortOfFloor} more closed ${shortOfFloor === 1 ? 'trade' : 'trades'} to go.`
                          : 'At or above the floor, so a rate read here is worth quoting.',
                    },
                    {
                      key: 'reviewed',
                      lamp: awaitingN > 0 ? ('yellow' as const) : ('green' as const),
                      title: `${reviewedN} of ${rows.length} reviewed`,
                      sub: 'Only a confirmed review counts — an auto-tag is the path’s read, not yours. Confirm one on Trade review.',
                    },
                    {
                      key: 'plan',
                      lamp: rows.length > 0 ? ('yellow' as const) : ('green' as const),
                      title: `${rows.filter((t) => !hasPlan(t)).length} of ${rows.length} with no linked plan`,
                      sub: 'Adherence needs a plan to measure against. These count toward P&L and toward nothing else — the No plan gap above filters to them.',
                    },
                    {
                      key: 'unbooked',
                      lamp: expiredUnbooked > 0 ? ('yellow' as const) : ('green' as const),
                      title: `${expiredUnbooked} over but unbooked`,
                      sub: 'Past expiry with no closing fill, in the whole ledger. Economically over, but with no realised figure to read, so they are counted apart rather than folded in.',
                    },
                    {
                      key: 'execution',
                      lamp: 'gray' as const,
                      title: 'Execution quality not in this view',
                      sub: 'Fill against the mid at submit is per fill, not per trade, and the mid is not recorded — Trade review shows the fills and says so.',
                    },
                  ].map((cv) => (
                    <div
                      key={cv.key}
                      className="grid grid-cols-[0.75rem_minmax(0,1fr)] items-start gap-2.5 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <span className="pt-1">
                        <StatusLamp lamp={cv.lamp} variant="dot" title={cv.title} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-dense-body text-foreground">{cv.title}</span>
                        <span className="block text-dense-meta leading-normal text-muted-foreground text-pretty">
                          {cv.sub}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
              </section>
            </aside>
          </div>

        </>
      )}
    </PageShell>
  )
}
