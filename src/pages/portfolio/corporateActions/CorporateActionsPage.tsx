/**
 * Portfolio · Corporate Actions — events that reshape what the book holds.
 *
 * The design's subject is the forward half: a split rewrites a strike
 * overnight, a dividend before expiry is what makes an early assignment on a
 * short call rational, and three other pages move at once with nobody saying
 * why. Measured on DEV 2026-09-17, the feed carries deep history and not one
 * row dated ahead of today — on this book and on the largest payers checked
 * beside it. So the forward panels keep their shape and say what is missing;
 * the history panel is real.
 *
 * Cash is not this page's subject: a dividend already booked is Transfer &
 * Pay's record. The extrinsic-versus-dividend test is Assignment's, cited here
 * and never recomputed (§14.2).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { useAssignmentLegs } from '@/hooks/useAssignmentLegs'
import { fetchWatchlist } from '@/api/market'
import { fetchCorporateActions, type CorporateActionRow } from '@/api/marketData/corporateActions'
import {
  CALENDAR_DAYS,
  CORPORATE_ACTIONS_UNRECORDED,
  HISTORY_DAYS,
  buildBookEvents,
  feedReach,
  recentHistory,
  sliceByUnderlying,
  upcoming,
  type BookEvent,
  type UnderlyingSlice,
} from './corporateActionsModel'

const PAGE_LEAD =
  'Events that reshape what you hold — and what they turn each contract into. A split changes a strike overnight; three other pages move at once and nobody says why.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The contract multiplier every leg in this book carries — and what a split changes. */
const STANDARD_MULTIPLIER = 100

function kindLabel(e: BookEvent): string {
  if (e.kind === 'split') {
    return e.ratioFrom != null && e.ratioTo != null ? `split ${e.ratioFrom} : ${e.ratioTo}` : 'split'
  }
  return e.kind
}

/**
 * A per-share distribution, at the precision the vendor states it.
 *
 * Rounding $0.147242 to two places makes the row unreproducible: the reader
 * multiplies the printed figures and gets a different total from the one
 * beside them. Six places, trailing zeros trimmed, and the arithmetic holds.
 */
function fmtPerShare(v: number): string {
  return `$${v.toFixed(6).replace(/0+$/, '').replace(/\.$/, '.00')}`
}

/** A share count that may be fractional, at the precision the broker holds it. */
function fmtShares(v: number): string {
  const s = v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return Number(s).toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/**
 * How many of a name's shares already stand behind a call.
 *
 * The sentence the design prints under a split ("coverage ratio unchanged:
 * 3,200 of 5,200 shares back the calls"). The numbers are Backing & Model's,
 * passed through the slice rather than recomputed here.
 */
function coverageLine(sl: UnderlyingSlice): string {
  const shortCalls = sl.roles.find((r) => r.role === 'Short calls')
  if (!shortCalls) return sl.shares > 0 ? 'no short call to back' : 'nothing held in shares'
  // No shares is a fact, not a missing reading — say which it is.
  if (sl.shares === 0) return `${shortCalls.contracts} short calls with no shares behind them`
  if (sl.backing == null) return 'Backing has no reading for this name'
  return `${fmtShares(sl.backing)} of ${fmtShares(sl.shares)} shares back the calls${
    sl.spare != null && sl.spare > 0 ? ` · ${fmtShares(sl.spare)} spare` : ''
  }`
}

/**
 * What a past event did to the book, in the design's own register.
 *
 * Only what can be said from today's position: the size against the shares
 * held now, and whether a contract on that name is open at all. Whether a leg
 * was open on the ex-date is a different question, and the book carries no
 * position history to answer it — so the sentence does not try.
 */
function historyMeaning(e: BookEvent, hasLeg: boolean): string {
  const size =
    e.onTodaysHolding == null || e.shares == null || e.amount == null
      ? 'no share count to size it against'
      : `${fmtUsd(e.onTodaysHolding)} = ${fmtShares(e.shares)} sh × ${fmtPerShare(e.amount)} on today’s holding`
  const paid = e.paymentDate ? ` · paid ${fmtIsoDateToken(e.paymentDate)}` : ''
  if (e.kind === 'split') {
    return hasLeg
      ? `${size}${paid} · a leg is open on this name, so its strike and count were restruck`
      : `${size}${paid} · no option leg is open on this name today`
  }
  return `${size}${paid}${hasLeg ? ' · an option leg is open on this name' : ''}`
}

function amountLabel(e: BookEvent): string {
  if (e.kind === 'split') {
    return e.ratioFrom != null && e.ratioTo != null ? `${e.ratioFrom} : ${e.ratioTo}` : '—'
  }
  return e.amount == null ? '—' : `${fmtPerShare(e.amount)} / sh`
}

export default function CorporateActionsPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const [accountFilter, setAccountFilter] = useState('all')

  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )

  const book = usePositionsBook(
    {
      accountFilter:
        accountFilter === 'all'
          ? { host: true, secondary: true }
          : { host: accountFilter === accountIds[0], secondary: accountFilter !== accountIds[0] },
      filterSymbol: '',
      filterExpiry: '',
    },
    0,
  )

  /** Shares the book holds, by name — the count an event is sized against. */
  const sharesBySymbol = useMemo(() => {
    const by = new Map<string, number>()
    for (const p of book.allStocks) {
      const symbol = (p.symbol ?? '').trim().toUpperCase()
      if (!symbol) continue
      by.set(symbol, (by.get(symbol) ?? 0) + (Number(p.position ?? 0) || 0))
    }
    return by
  }, [book.allStocks])

  /** Open option legs — what a split would actually rewrite. */
  const legs = useMemo(
    () =>
      book.filteredOptions
        .map((p) => ({
          contractKey: p.contract_key,
          label: shortOptContractKey(p.contract_key),
          symbol: extractUnderlyingRootSymbol(p.symbol),
          expiry: p.expiry,
          strike: p.strike,
          right: (p.right ?? '').toUpperCase(),
          qty: Number(p.qty ?? 0),
        }))
        .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.symbol.localeCompare(b.symbol)),
    [book.filteredOptions],
  )
  const legSymbols = useMemo(() => new Set(legs.map((l) => l.symbol)), [legs])

  /** Shares already standing behind a short call — Backing & Model's own reading. */
  const coverBySymbol = useMemo(() => {
    const by = new Map<string, { backing: number; spare: number }>()
    for (const r of book.coverRows) {
      const prev = by.get(r.symbol)
      by.set(r.symbol, {
        backing: (prev?.backing ?? 0) + r.backing,
        spare: (prev?.spare ?? 0) + r.spare,
      })
    }
    return by
  }, [book.coverRows])

  /**
   * The design watches the watchlist too: a split distorts a name's chain and
   * its backtest whether or not the book holds it.
   */
  const watchQuery = useQuery({ queryKey: ['market', 'watchlist'], queryFn: fetchWatchlist })
  const watchSymbols = useMemo(() => {
    const out = new Set<string>()
    for (const i of watchQuery.data?.items ?? []) {
      const symbol = (i.symbol ?? '').trim().toUpperCase()
      if (symbol) out.add(symbol)
    }
    return out
  }, [watchQuery.data?.items])

  /**
   * Every name the book touches, shares and legs alike, plus the watchlist: a
   * split on a name held only through an option still rewrites that contract.
   */
  const bookSymbols = useMemo(
    () => new Set([...sharesBySymbol.keys(), ...legSymbols]),
    [sharesBySymbol, legSymbols],
  )
  const symbols = useMemo(
    () => [...new Set([...bookSymbols, ...watchSymbols])].sort(),
    [bookSymbols, watchSymbols],
  )

  const feedQueries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ['market-data', 'corporate-actions', symbol],
      queryFn: () => fetchCorporateActions(symbol),
      enabled: Boolean(symbol),
      staleTime: 60 * 60_000,
    })),
  })
  const feedStamp = feedQueries.map((q) => q.dataUpdatedAt).join(',')
  const feedLoading = feedQueries.some((q) => q.isLoading)

  /** Today, taken once — a render must not read a moving clock. */
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const bySymbol = useMemo(() => {
    const by = new Map<string, CorporateActionRow[]>()
    symbols.forEach((symbol, i) => by.set(symbol, feedQueries[i]?.data?.rows ?? []))
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedStamp, symbols])

  const reach = useMemo(() => feedReach({ bySymbol, today }), [bySymbol, today])
  const events = useMemo(
    () =>
      buildBookEvents({
        rows: [...bySymbol.values()].flat(),
        sharesBySymbol,
        legSymbols,
        today,
      }),
    [bySymbol, sharesBySymbol, legSymbols, today],
  )
  const ahead = useMemo(() => upcoming(events), [events])
  const history = useMemo(() => recentHistory(events).filter((e) => bookSymbols.has(e.symbol)), [events, bookSymbols])
  const reshaping = useMemo(() => ahead.filter((e) => e.touchesAContract), [ahead])
  const eventBySymbol = useMemo(() => {
    const by = new Map<string, BookEvent>()
    // The nearest one: it is the deadline, and the panel is about a window.
    for (const e of [...ahead].reverse()) by.set(e.symbol, e)
    return by
  }, [ahead])
  const slices = useMemo(
    () => sliceByUnderlying({ legs, sharesBySymbol, coverBySymbol, eventBySymbol }),
    [legs, sharesBySymbol, coverBySymbol, eventBySymbol],
  )

  /**
   * The extrinsic per short call, read off Assignment's own computation.
   *
   * The design's words: this panel reads the test, it does not recompute it.
   * Both pages call one hook, so there is nothing that could disagree.
   */
  const assignment = useAssignmentLegs()
  const shortCalls = useMemo(
    () => assignment.legs.filter((l) => l.right === 'C'),
    [assignment.legs],
  )

  const [calendarShow, setCalendarShow] = useState('all')
  const calendarRows = useMemo(() => {
    if (calendarShow === 'book') return ahead.filter((e) => bookSymbols.has(e.symbol))
    if (calendarShow === 'reshaping') return reshaping
    return ahead
  }, [ahead, reshaping, bookSymbols, calendarShow])

  const loading = statusLoading || feedLoading

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Corporate Actions">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Accounts / Corporate Actions</p>}
          title="Corporate Actions"
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
              <DenseTag variant={reach.ahead > 0 ? 'info' : 'warning'} size="cell">
                {reach.ahead > 0 ? `${reach.ahead} ahead` : '⚠ none declared ahead'}
              </DenseTag>
              <Link to="/trade/assignment" className={positionsUi.link}>
                assignment risk → Assignment
              </Link>
            </span>
          }
        />

        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ) : (
          <>
            <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="What the feed carries">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>The feed</span>
                <span className={positionsUi.panelTitle}>what it can and cannot say</span>
                <DenseTag variant="warning" size="cell">
                  ⚠ none declared ahead
                </DenseTag>
              </header>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-x-4 gap-y-2 px-3 py-2.5">
                <PositionsStat
                  cap="Names covered"
                  value={`${reach.covered} / ${reach.asked}`}
                  sub={
                    reach.silent.length > 0
                      ? `${reach.silent.length} carry nothing at all: ${reach.silent.join(', ')}`
                      : 'every name the book touches answers'
                  }
                />
                <PositionsStat
                  cap="Rows held"
                  value={String(reach.rows)}
                  sub={
                    reach.oldest && reach.newest
                      ? `${fmtIsoDateToken(reach.oldest)} → ${fmtIsoDateToken(reach.newest)}`
                      : 'no dated row'
                  }
                />
                <PositionsStat
                  cap="Dated ahead"
                  value={String(reach.ahead)}
                  ink={reach.ahead === 0 ? 'text-warning' : undefined}
                  sub={reach.ahead === 0 ? 'none of these names has declared one' : `inside and beyond ${CALENDAR_DAYS} days`}
                />
                <PositionsStat
                  cap="Backfilled thinly"
                  value={String(reach.shallow.length)}
                  sub={
                    reach.shallow.length > 0
                      ? `one row each: ${reach.shallow.join(', ')}`
                      : 'every covered name carries a series'
                  }
                />
              </div>
              <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.forward}</p>
              <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.cash}</p>
            </section>

            <PositionsTier
              label="Contract changes"
              note="the only page that says what an event does to an option already held"
            />
            <section
              className={cn(positionsUi.panel, reshaping.length === 0 && 'border-warning/40')}
              aria-label="Before and after"
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Before → after</span>
                <span className={positionsUi.panelTitle}>
                  {reshaping.length === 0
                    ? `no event reaches these ${legs.length} legs`
                    : `${reshaping.length} would rewrite a contract`}
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  OCC adjusts the contract; the ticker stays the same and the position is not the same
                </span>
              </header>
              {legs.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">The book holds no option leg.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: six columns, the design's 900 floor. */}
                  <table className="w-full min-w-[900px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '8%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '32%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Leg</th>
                        <th className={positionsUi.th}>Now</th>
                        <th className={positionsUi.th}>After the event</th>
                        <th className={positionsUi.th}>Qty</th>
                        <th className={positionsUi.th}>Multiplier</th>
                        <th className={cn(positionsUi.th, 'text-left')}>What it means</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slices.flatMap((sl) => {
                        const ev = sl.event
                        return [
                          <tr key={sl.symbol} className="bg-[var(--sk-raised2)]">
                            <td className={cn(positionsUi.td, 'pl-2 text-left')} colSpan={6}>
                              <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                <span className="font-mono text-xs font-bold text-entity-option">{sl.symbol}</span>
                                {ev ? (
                                  <>
                                    <DenseTag variant="info" size="cell">
                                      {ev.kind}
                                    </DenseTag>
                                    <span className={cn(positionsUi.mono, 'text-dense-meta text-warning')}>
                                      {amountLabel(ev)} · effective {fmtIsoDateToken(ev.exDate ?? '')} · in{' '}
                                      {ev.daysAway} days
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 font-sans text-dense-meta text-muted-foreground">
                                    <StatusLamp lamp="gray" variant="dot" title="No event known" />
                                    no event known ahead of today
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr>,
                          ...sl.roles.map((r) => (
                            <tr key={`${sl.symbol}:${r.role}`} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                              <td className={cn(positionsUi.td, 'pl-4 text-left font-sans text-secondary-foreground')}>
                                {r.role}
                              </td>
                              {/* §14.4: the contract token, not the OCC string. */}
                              <td
                                className={cn(
                                  positionsUi.td,
                                  'font-bold text-[var(--color-entity-option)]',
                                )}
                              >
                                {r.label ?? `${r.distinct} contracts`}
                              </td>
                              <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                                {ev ? 'see the event' : 'unchanged'}
                              </td>
                              <td className={cn(positionsUi.td, 'text-foreground')}>{r.contracts}</td>
                              <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                                {STANDARD_MULTIPLIER}
                              </td>
                              <td
                                className={cn(
                                  positionsUi.td,
                                  'text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                                )}
                              >
                                {ev
                                  ? `${kindLabel(ev)} lands before ${fmtIsoDateToken(r.nearestExpiry ?? '')}`
                                  : `nothing dated ahead of today reaches ${fmtIsoDateToken(r.nearestExpiry ?? '')}`}
                              </td>
                            </tr>
                          )),
                          <tr key={`${sl.symbol}:shares`} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                            <td className={cn(positionsUi.td, 'pl-4 text-left font-sans text-secondary-foreground')}>
                              Shares
                            </td>
                            <td className={cn(positionsUi.td, sl.shares > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                              {sl.shares > 0 ? `${fmtShares(sl.shares)} sh` : 'none'}
                            </td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                              {ev ? 'see the event' : 'unchanged'}
                            </td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>—</td>
                            <td
                              className={cn(
                                positionsUi.td,
                                'text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                              )}
                            >
                              {coverageLine(sl)}
                            </td>
                          </tr>,
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.contract}</p>
            </section>

            <PositionsTier
              label="Calendar"
              note={`book and watchlist \u00b7 a watchlist name matters because a split distorts its chain and its backtest`}
            />
            <section
              className={cn(positionsUi.panel, ahead.length === 0 && 'border-warning/40')}
              aria-label={`Next ${CALENDAR_DAYS} days`}
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Next {CALENDAR_DAYS} days</span>
                <span className={positionsUi.panelTitle}>
                  {ahead.length === 0
                    ? 'nothing is known, which is not nothing is coming'
                    : `${calendarRows.length} of ${ahead.length} events`}
                </span>
                {ahead.length === 0 ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ none declared ahead
                  </DenseTag>
                ) : null}
                <span className="ml-auto inline-flex items-center gap-2">
                  <span className={positionsUi.cap}>Show</span>
                  <SegmentControl
                    size="xs"
                    ariaLabel="Which events"
                    value={calendarShow}
                    onChange={setCalendarShow}
                    options={[
                      { value: 'all', label: 'All' },
                      { value: 'book', label: 'Book only' },
                      { value: 'reshaping', label: 'Reshaping' },
                    ]}
                  />
                </span>
              </header>
              {ahead.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  {reach.rows} rows reached {reach.covered} of the {reach.asked} names this book touches, and not one
                  of them is dated after today. The pull that fetched them asks the whole market for a −7 / +60 day
                  window every night, so this is not the feed failing to look ahead — it is that none of these issuers
                  has declared its next ex-date yet.
                </p>
              ) : null}
              <div className={cn('overflow-x-auto', ahead.length === 0 && 'border-t border-border')}>
                {/* §14.6: seven columns, held at 980 — above the design's 900 floor. The shape stays drawn
                    when no event is dated ahead, the way the other marked bands keep theirs. */}
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Event</th>
                      <th className={positionsUi.th}>Ex / effective</th>
                      <th className={positionsUi.th}>Amount · ratio</th>
                      <th className={positionsUi.th}>Held</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Reshapes a contract</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Where it lands</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ahead.length === 0 ? (
                      <tr>
                        <td className={cn(positionsUi.td, 'pl-2 text-left')}>
                          <span className="inline-flex h-4 items-center border px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em] text-muted-foreground mat-tag">
                            NO FUTURE-DATED EVENT
                          </span>
                        </td>
                        {['event', 'date', 'amount', 'held', 'reshapes'].map((k) => (
                          <td key={k} className={cn(positionsUi.td, 'text-muted-foreground')}>
                            —
                          </td>
                        ))}
                        <td
                          className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}
                        >
                          nothing to place — no ex-date has been declared on these names yet
                        </td>
                      </tr>
                    ) : null}
                    {calendarRows.map((e) => (
                      <tr key={e.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-mono font-bold text-entity-option')}>
                          {e.symbol}
                          {bookSymbols.has(e.symbol) ? null : (
                            <span className="ml-1.5 font-sans text-dense-meta font-normal text-muted-foreground">
                              watchlist
                            </span>
                          )}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                          {kindLabel(e)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-foreground')}>
                          {fmtIsoDateToken(e.exDate ?? '')}
                        </td>
                        <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{amountLabel(e)}</td>
                        <td className={cn(positionsUi.td, e.shares ? 'text-foreground' : 'text-muted-foreground')}>
                          {e.shares == null || e.shares === 0 ? 'legs only' : fmtShares(e.shares)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                          {e.touchesAContract ? 'yes — see above' : 'no open leg'}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                          {e.kind === 'dividend' ? (
                            <Link to="/portfolio/transfer" className={positionsUi.link}>
                              Transfer &amp; Pay
                            </Link>
                          ) : (
                            <Link to="/portfolio/positions" className={positionsUi.link}>
                              Positions
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.watchlist}</p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Cited, not computed">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Cited, not computed</span>
                  <span className={positionsUi.panelTitle}>assignment risk over an ex-date</span>
                  <Link to="/trade/assignment" className={cn(positionsUi.link, 'ml-auto')}>
                    Assignment →
                  </Link>
                </header>
                {shortCalls.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    The book holds no short call, so no leg can be exercised early for a dividend.
                  </p>
                ) : (
                  shortCalls.map((l) => (
                    <div
                      key={l.contractKey}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                    >
                      <span className={cn(positionsUi.mono, 'text-xs font-bold text-[var(--color-entity-option)]')}>
                        {shortOptContractKey(l.contractKey)}
                      </span>
                      {/* Assignment's own extrinsic, through the shared hook. */}
                      <span className={cn(positionsUi.mono, 'text-dense-meta text-secondary-foreground')}>
                        extrinsic {l.extrinsic == null ? 'n/c' : fmtUsd(l.extrinsic)} vs dividend —
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                        <StatusLamp lamp="gray" variant="dot" title="No dividend known" />
                        {l.extrinsic == null
                          ? 'the vendor priced no close, so there is no time value to weigh either'
                          : `no dividend dated before ${fmtIsoDateToken(l.expiry)} — nothing to weigh it against`}
                      </span>
                    </div>
                  ))
                )}
                <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.assignment}</p>
              </section>

              <section className={positionsUi.panel} aria-label={`History, last ${HISTORY_DAYS} days`}>
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>History</span>
                  <span className={positionsUi.panelTitle}>last {HISTORY_DAYS} days</span>
                  <span className="ml-auto text-dense-meta text-muted-foreground">
                    a candidate cause for an unexplained day
                  </span>
                </header>
                {history.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    No event in the window touched a name this book holds.
                  </p>
                ) : (
                  history.map((e) => (
                    <div
                      key={e.key}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0"
                    >
                      <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                        {fmtIsoDateToken(e.exDate ?? '')}
                      </span>
                      <span className={cn(positionsUi.mono, 'text-xs font-bold text-entity-option')}>{e.symbol}</span>
                      <DenseTag variant={e.kind === 'split' ? 'category' : 'neutral'} size="cell">
                        {e.kind === 'split' ? 'SPLIT' : 'DIV'}
                      </DenseTag>
                      <span className={cn(positionsUi.mono, 'text-xs text-secondary-foreground')}>
                        {amountLabel(e)}
                      </span>
                      <span className="min-w-0 flex-[1_1_9rem] text-dense-meta text-muted-foreground text-pretty">
                        {historyMeaning(e, legSymbols.has(e.symbol))}
                      </span>
                    </div>
                  ))
                )}
                <p className={cn(FOOT, 'm-0')}>
                  When{' '}
                  <Link to="/portfolio/pnl-explain" className={positionsUi.link}>
                    P&amp;L Explain
                  </Link>{' '}
                  shows a residual it cannot account for, this list is one of the places the answer usually is. The
                  amount is computed on today’s share count, not the count on the ex-date — what actually landed is on{' '}
                  <Link to="/portfolio/transfer" className={positionsUi.link}>
                    Transfer &amp; Pay
                  </Link>
                  .
                </p>
              </section>
            </div>

            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here reaches the
              broker. A roll in response to an event is a plan, not an order, and the design opens it in Trade Plans
              with the dates filled in — which this page does not do yet, because no event ahead of today exists to fill
              them with.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
