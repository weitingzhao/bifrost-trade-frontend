/**
 * Portfolio · Corporate Actions — events that reshape what the book holds
 * (design `Portfolio Corporate Actions.dc.html`; §16 refinement at Rev .91).
 *
 * The design's subject is the forward half: a split rewrites a strike
 * overnight, a dividend before expiry is what makes an early assignment on a
 * short call rational, and three other pages move at once with nobody saying
 * why. Measured on DEV 2026-09-17 the feed carried deep history and nothing
 * dated ahead; re-measured 2026-09-26 it carries one declared event past the
 * 30-day window on the 26 names the book and watchlist touch. So every forward
 * sentence here is decided by the counts, an event past the window is listed
 * rather than dropped, and the history panel is real.
 *
 * Cash is not this page's subject: a dividend already booked is Transfer &
 * Pay's record. The extrinsic-versus-dividend test is Assignment's, cited here
 * and never recomputed (§14.2).
 */
import { useMemo, useState } from 'react'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { PageHead, PageHeadLink, PageShell, SectionHead } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { fmtIsoDateToken } from '@/lib/format'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { useAssignmentLegs } from '@/hooks/useAssignmentLegs'
import { usePreviewState } from '@/hooks/usePreviewState'
import { fetchWatchlist } from '@/api/market'
import { fetchCorporateActions, type CorporateActionRow } from '@/api/marketData/corporateActions'
import {
  CALENDAR_DAYS,
  CORPORATE_ACTIONS_UNRECORDED,
  buildBookEvents,
  declaredBeyond,
  feedReach,
  recentHistory,
  sliceByUnderlying,
  upcoming,
  type BookEvent,
  type UnderlyingSlice,
} from './corporateActionsModel'
import { AMBER_EDGE, amountLabel, FOOT, fmtShares, kindLabel, ROW_HOVER, STANDARD_MULTIPLIER } from './corporateActionsFormat'
import { KindTag, Ticker } from './corporateActionsMarks'
import { CorporateActionsCalendar } from './CorporateActionsCalendar'
import { CorporateActionsBand } from './CorporateActionsBand'

const PAGE_LEAD =
  'Events that reshape what you hold — and what they turn each contract into. A split changes a strike overnight; three other pages move at once and nobody says why.'

/** The design's due mark: an event this close is amber on its contract row. */
const DUE_SOON_DAYS = 25

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

export default function CorporateActionsPage() {
  const preview = usePreviewState()
  const statusQ = useMonitorStatus()
  const status = statusQ.data
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
  const watchQuery = useQuery({ queryKey: QUERY_KEYS.market.watchlist, queryFn: fetchWatchlist })
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
  // Errors move the stamp too: an unread name leaves the counts below.
  const feedStamp = feedQueries.map((q) => `${q.dataUpdatedAt}:${q.errorUpdatedAt}`).join(',')
  const feedLoading = feedQueries.some((q) => q.isLoading)
  /** Names whose feed read failed with nothing held — silent, not "carries nothing". */
  const feedUnread = symbols.filter((_, i) => feedQueries[i]?.isError && !feedQueries[i]?.data)

  /** Today, taken once — a render must not read a moving clock. */
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const bySymbol = useMemo(() => {
    const by = new Map<string, CorporateActionRow[]>()
    // An unread name is left out rather than counted as silent.
    symbols.forEach((symbol, i) => {
      const q = feedQueries[i]
      if (q?.isError && !q.data) return
      by.set(symbol, q?.data?.rows ?? [])
    })
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
  const beyond = useMemo(() => declaredBeyond(events), [events])
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

  // §17.1: the book (monitor status) and the feed are both needed to say
  // anything; the watchlist only widens the ask, so it fails as a strip.
  const bookState = sourceState(statusQ)
  const feedAllUnread = symbols.length > 0 && feedUnread.length === symbols.length
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : bookState === 'failed'
        ? 'failed'
        : bookState === 'loading' || feedLoading
          ? 'loading'
          : feedAllUnread
            ? 'failed'
            : bookState
  const aheadTag =
    reach.ahead === 0
      ? { variant: 'warning' as const, text: '⚠ none declared ahead' }
      : ahead.length === 0
        ? { variant: 'neutral' as const, text: `${reach.ahead} declared · past ${CALENDAR_DAYS} days` }
        : { variant: 'neutral' as const, text: `${ahead.length} in ${CALENDAR_DAYS} days` }

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the feed's forward reach as the stamp
          (the design's feed chip — this feed is wired, so the chip says what
          it has declared), the one door out as the head's action. */}
      <PageHead
        title="Corporate Actions"
        info={PAGE_LEAD}
        stamp={
          pageState === 'ready' || pageState === 'stale' ? (
            <DenseTag variant={aheadTag.variant} size="cell" title={CORPORATE_ACTIONS_UNRECORDED.forward}>
              {aheadTag.text}
            </DenseTag>
          ) : null
        }
        meta={pageState === 'ready' || pageState === 'stale' ? `${reach.covered} / ${reach.asked} names · ${reach.rows} rows` : undefined}
        actions={
          <PageHeadLink to="/trade/expiration#assignment" title="Assignment risk → Trading › Expiry">
            Assignment risk →
          </PageHeadLink>
        }
      />
      {accountIds.length > 1 ? (
        <div data-sr-toolbar="">
          <span data-sr-tb="label">Account</span>
          <SegmentControl
            size="xs"
            ariaLabel="Account"
            value={accountFilter}
            onChange={setAccountFilter}
            options={[{ value: 'all', label: 'All' }, ...accountIds.map((a) => ({ value: a, label: a }))]}
          />
        </div>
      ) : null}

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the book"
          detail={staleDetail(statusQ, 'a position opened or closed since is not shown.')}
          onAction={() => void statusQ.refetch()}
        />
      ) : null}
      {(pageState === 'ready' || pageState === 'stale') && feedUnread.length > 0 ? (
        <ViewState
          kind="stale"
          layout="strip"
          title={`Couldn’t read the feed for ${feedUnread.length} of ${symbols.length} names`}
          detail={`${feedUnread.join(', ')} — left out of every count below; unread is not “carries nothing”.`}
          onAction={() => feedQueries.forEach((q) => void q.refetch())}
        />
      ) : null}
      {(pageState === 'ready' || pageState === 'stale') && watchQuery.isError && !watchQuery.data ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read the watchlist"
          detail="Only the book’s own names were asked — a watched name’s split is not shown."
          onAction={() => void watchQuery.refetch()}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the book and the feed" rows={6} cols={6} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title={bookState === 'failed' ? 'Couldn’t load the book' : 'Couldn’t read the corporate-action feed'}
            detail={
              bookState === 'failed'
                ? failedDetail(statusQ, 'No leg was checked — this is not a book no event reaches.')
                : 'Every name’s feed read failed. No event was checked — this is not a quiet calendar.'
            }
            onAction={() => {
              void statusQ.refetch()
              feedQueries.forEach((q) => void q.refetch())
            }}
          />
        </section>
      ) : (
        <>
          {/* The design's feed notice (Rev .91 #4): amber in color-mix, radius 12,
              the edge inline because mat-card clears a border class. Here the
              feed is wired, so the panel says what it reaches; the edge shows
              only while nothing is declared inside the window. */}
          <section
            className={positionsUi.panel}
            style={
              ahead.length === 0
                ? { ...AMBER_EDGE, background: 'color-mix(in srgb, var(--color-warning) 5%, transparent)' }
                : undefined
            }
            aria-label="What the feed carries"
          >
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>The feed</span>
              <span className={positionsUi.panelTitle}>what it can and cannot say</span>
              <DenseTag variant={aheadTag.variant} size="cell">
                {aheadTag.text}
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
                sub={
                  reach.ahead === 0
                    ? 'none of these names has declared one'
                    : `${ahead.length} inside ${CALENDAR_DAYS} days · ${beyond.length} past it`
                }
              />
              <PositionsStat
                cap="Backfilled thinly"
                value={String(reach.shallow.length)}
                ink={reach.shallow.length > 0 ? 'text-warning' : undefined}
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

          {/* §17.8 (Rev .119): the two bands sit in their own box, so folding the last one
              never takes the page's Boundary line with it. */}
          <div className="space-y-3">
          <SectionHead note="The only page that says what an event does to an option you already hold">
            Contract changes
          </SectionHead>
          <section
            className={positionsUi.panel}
            style={reshaping.length === 0 && legs.length > 0 ? AMBER_EDGE : undefined}
            aria-label="Before and after"
          >
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.panelTitle}>Before → after</span>
              <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                {reshaping.length === 0
                  ? `no declared event reaches these ${legs.length} legs`
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
                        // The name's head row: a group label, no band (Rev .84).
                        <tr key={sl.symbol}>
                          <td className={cn(positionsUi.td, 'pl-2 pt-2 text-left')} colSpan={6}>
                            <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                              <Ticker symbol={sl.symbol} className="text-xs" />
                              {ev ? (
                                <>
                                  <KindTag e={ev} />
                                  <span
                                    className={cn(
                                      positionsUi.mono,
                                      'text-dense-meta',
                                      ev.daysAway != null && ev.daysAway <= DUE_SOON_DAYS ? 'text-warning' : 'text-muted-foreground',
                                    )}
                                  >
                                    {amountLabel(ev)} · effective {fmtIsoDateToken(ev.exDate ?? '')} · in {ev.daysAway} days
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 font-sans text-dense-meta text-muted-foreground">
                                  <StatusLamp lamp="gray" variant="dot" title="No event declared" />
                                  nothing declared inside {CALENDAR_DAYS} days
                                </span>
                              )}
                            </span>
                          </td>
                        </tr>,
                        ...sl.roles.map((r) => (
                          <tr key={`${sl.symbol}:${r.role}`} className={ROW_HOVER}>
                            <td className={cn(positionsUi.td, 'border-border pl-4 text-left font-sans text-secondary-foreground')}>
                              {r.role}
                            </td>
                            {/* §14.4: the contract token, not the OCC string. */}
                            <td className={cn(positionsUi.td, 'border-border font-bold text-[var(--color-entity-option)]')}>
                              {r.label ?? `${r.distinct} contracts`}
                            </td>
                            <td className={cn(positionsUi.td, 'border-border text-muted-foreground')}>
                              {ev ? 'see the event' : 'unchanged'}
                            </td>
                            <td className={cn(positionsUi.td, 'border-border text-foreground')}>{r.contracts}</td>
                            <td className={cn(positionsUi.td, 'border-border text-muted-foreground')}>
                              {STANDARD_MULTIPLIER}
                            </td>
                            <td
                              className={cn(
                                positionsUi.td,
                                'border-border text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                              )}
                            >
                              {ev
                                ? `${kindLabel(ev)} lands before ${fmtIsoDateToken(r.nearestExpiry ?? '')}`
                                : `nothing declared ahead reaches ${fmtIsoDateToken(r.nearestExpiry ?? '')}`}
                            </td>
                          </tr>
                        )),
                        <tr key={`${sl.symbol}:shares`} className={ROW_HOVER}>
                          <td className={cn(positionsUi.td, 'border-border pl-4 text-left font-sans text-secondary-foreground')}>
                            Shares
                          </td>
                          <td className={cn(positionsUi.td, 'border-border', sl.shares > 0 ? 'text-foreground' : 'text-muted-foreground')}>
                            {sl.shares > 0 ? `${fmtShares(sl.shares)} sh` : 'none'}
                          </td>
                          <td className={cn(positionsUi.td, 'border-border text-muted-foreground')}>
                            {ev ? 'see the event' : 'unchanged'}
                          </td>
                          <td className={cn(positionsUi.td, 'border-border text-muted-foreground')}>—</td>
                          <td className={cn(positionsUi.td, 'border-border text-muted-foreground')}>—</td>
                          <td
                            className={cn(
                              positionsUi.td,
                              'border-border text-left font-sans whitespace-normal leading-normal text-muted-foreground',
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

          <SectionHead note="Book and watchlist · a watchlist name matters because a split distorts its chain and its backtest">
            Calendar
          </SectionHead>
          <CorporateActionsCalendar ahead={ahead} beyond={beyond} reach={reach} bookSymbols={bookSymbols} />

          <CorporateActionsBand shortCalls={shortCalls} events={events} history={history} legSymbols={legSymbols} />
          </div>

          <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
            <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here reaches the
            broker. A roll in response to an event is a plan, not an order, and the design opens it in Trade Plans
            with the dates filled in — which this page does not do yet
            {reshaping.length === 0 ? (
              ', because no declared event reaches a leg to fill them with.'
            ) : (
              <>
                ; draft the roll in{' '}
                <Link to="/trade/plans" className={positionsUi.link}>
                  Trade Plans
                </Link>{' '}
                from the rows above.
              </>
            )}
          </p>
        </>
      )}
    </PageShell>
  )
}
