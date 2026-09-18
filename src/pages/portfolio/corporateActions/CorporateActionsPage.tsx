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
import { useQueries } from '@tanstack/react-query'
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
import { fetchCorporateActions, type CorporateActionRow } from '@/api/marketData/corporateActions'
import {
  CALENDAR_DAYS,
  CORPORATE_ACTIONS_UNRECORDED,
  HISTORY_DAYS,
  buildBookEvents,
  feedReach,
  recentHistory,
  upcoming,
  type BookEvent,
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

  /**
   * Every name the book touches, shares and legs alike: a split on a name held
   * only through an option still rewrites that contract.
   */
  const symbols = useMemo(
    () => [...new Set([...sharesBySymbol.keys(), ...legSymbols])].sort(),
    [sharesBySymbol, legSymbols],
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
  const history = useMemo(() => recentHistory(events), [events])
  const reshaping = useMemo(() => ahead.filter((e) => e.touchesAContract), [ahead])
  const shortCalls = useMemo(() => legs.filter((l) => l.right === 'C' && l.qty < 0), [legs])

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
                {reach.ahead > 0 ? `${reach.ahead} ahead` : '⚠ backfill only'}
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
                  ⚠ nothing ahead of today
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
                  sub={reach.ahead === 0 ? 'a backfill, not a calendar' : `inside and beyond ${CALENDAR_DAYS} days`}
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
                      {legs.map((l) => {
                        const hit = reshaping.find((e) => e.symbol === l.symbol)
                        return (
                          <tr key={l.contractKey} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                            {/* §14.4: the contract token, not the OCC string. */}
                            <td
                              className={cn(
                                positionsUi.td,
                                'pl-2 text-left font-bold text-[var(--color-entity-option)]',
                              )}
                            >
                              {shortOptContractKey(l.contractKey)}
                            </td>
                            <td className={cn(positionsUi.td, 'text-foreground')}>{fmtUsd(l.strike)}</td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                              {hit ? fmtUsd(l.strike) : 'unchanged'}
                            </td>
                            <td className={cn(positionsUi.td, l.qty < 0 ? 'text-warning' : 'text-foreground')}>
                              {l.qty}
                            </td>
                            <td className={cn(positionsUi.td, 'text-muted-foreground')}>{STANDARD_MULTIPLIER}</td>
                            <td
                              className={cn(
                                positionsUi.td,
                                'text-left font-sans whitespace-normal leading-normal text-muted-foreground',
                              )}
                            >
                              {hit ? (
                                `${kindLabel(hit)} on ${hit.symbol}, ex ${fmtIsoDateToken(hit.exDate ?? '')}`
                              ) : (
                                <span className="inline-flex items-start gap-1.5">
                                  <StatusLamp lamp="gray" variant="dot" title="No event known" className="mt-1 shrink-0" />
                                  nothing dated ahead of today reaches {fmtIsoDateToken(l.expiry)}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>{CORPORATE_ACTIONS_UNRECORDED.contract}</p>
            </section>

            <PositionsTier
              label="Calendar"
              note={`the book’s names only — ${CALENDAR_DAYS} days ahead, and ${HISTORY_DAYS} behind`}
            />
            <section
              className={cn(positionsUi.panel, ahead.length === 0 && 'border-warning/40')}
              aria-label={`Next ${CALENDAR_DAYS} days`}
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Next {CALENDAR_DAYS} days</span>
                <span className={positionsUi.panelTitle}>
                  {ahead.length === 0 ? 'nothing is known, which is not nothing is coming' : `${ahead.length} events`}
                </span>
                {ahead.length === 0 ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ the feed carries no future date
                  </DenseTag>
                ) : null}
              </header>
              {ahead.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  {reach.rows} rows reached {reach.covered} of the {reach.asked} names this book touches, and every one
                  of them is dated on or before today. A calendar drawn from them would be empty for a reason that has
                  nothing to do with whether an ex-date is coming.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: seven columns, the design's 980 floor. */}
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
                      {ahead.map((e) => (
                        <tr key={e.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-mono font-bold text-sky-300')}>
                            {e.symbol}
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
              )}
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
                      <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                        <StatusLamp lamp="gray" variant="dot" title="No dividend known" />
                        no dividend dated before {fmtIsoDateToken(l.expiry)}
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
                      <span className={cn(positionsUi.mono, 'text-xs font-bold text-sky-300')}>{e.symbol}</span>
                      <span className="text-dense-meta text-muted-foreground">{kindLabel(e)}</span>
                      <span className={cn(positionsUi.mono, 'text-xs text-secondary-foreground')}>
                        {amountLabel(e)}
                      </span>
                      <span className="min-w-0 flex-[1_1_9rem] text-dense-meta text-muted-foreground text-pretty">
                        {e.onTodaysHolding == null || e.shares == null || e.amount == null
                          ? 'no share count to size it against'
                          : `${fmtUsd(e.onTodaysHolding)} = ${fmtShares(e.shares)} sh × ${fmtPerShare(e.amount)} today`}
                        {e.paymentDate ? ` · paid ${fmtIsoDateToken(e.paymentDate)}` : ''}
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

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
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
