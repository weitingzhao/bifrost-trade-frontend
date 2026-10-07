/**
 * P&L Explain — why the number moved, and what part of it nothing accounts for.
 *
 * The amount belongs to Performance; this page only takes it apart, and where
 * it cannot, it says so. The leads band reads the book on its own; the
 * attribution band reads the nightly snapshot (api 0.12.0, TD-138) and keeps the
 * design's marked shape for any window it cannot read — never by dimming the
 * text, which would drop these cells under the contrast floor.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ViewState } from '@bifrost/ui'
import { HeroCard, HeroRow, PageHead, PageHeadLink, PageShell, SectionHead } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { TIME_RANGE_OPTIONS } from '@/pages/portfolio/performance/performanceConstants'
import { getTimeRangeDates, type PerformanceTimeRange } from '@/utils/ledger/performanceUtils'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { useExecutionsAll, useExecutionsPerformanceBook } from '@/hooks/useExecutions'
import { useQuery } from '@tanstack/react-query'
import { getTransactions } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { usePositionsBook } from '@/hooks/usePositionsBook'
import { usePnlAttribution } from '@/hooks/useSnapshots'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, staleDetail } from '@/lib/viewState'
import {
  PNL_UNEXPLAINED_THRESHOLD,
  PNL_UNRECORDED,
  attributionCoverage,
  bookGapFills,
  cashInWindow,
  explainedOf,
  leadsTotal,
  pnlLeads,
  windowBookPnl,
} from './pnlExplainModel'
import { PnlAttributionBand } from './PnlAttributionBand'

const PAGE_LEAD =
  'Why the number moved, and what part of it nothing can account for. The amount itself belongs to Performance; this page only takes it apart.'

const READING_TONE: Record<string, string> = {
  'worth a look': 'text-warning',
  'inside tolerance': 'text-muted-foreground',
  'no reading': 'text-muted-foreground',
}

const READING_LAMP: Record<string, 'yellow' | 'green' | 'gray'> = {
  'worth a look': 'yellow',
  'inside tolerance': 'green',
  'no reading': 'gray',
}

const FOOT =
  'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function PnlExplainPage() {
  const [timeRange, setTimeRange] = useState<PerformanceTimeRange>('quarter')
  const preview = usePreviewState()
  // The range ends in the month the reader is in — the same anchor Performance
  // uses, so the two pages ask for the same window.
  const [calendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const { sinceStr, untilStr } = useMemo(
    () => getTimeRangeDates(timeRange, calendarMonth),
    [timeRange, calendarMonth],
  )

  const bulk = usePerformanceBulk({
    timeRange,
    calendarMonth,
    strategyOpportunityId: null,
    tradeId: null,
  })
  const canonicalQuery = useExecutionsAll()
  const bookQuery = useExecutionsPerformanceBook()
  const cashQuery = useQuery({
    queryKey: [...QUERY_KEYS.trading.transactions, 'pnl-explain'],
    queryFn: () => getTransactions({ limit: 500 }),
  })
  // Both accounts, no symbol or expiry narrowing — this page reads the whole book.
  const book = usePositionsBook(
    { accountFilter: { host: true, secondary: true }, filterSymbol: '', filterExpiry: '' },
    0,
  )

  const attrQuery = usePnlAttribution({ from: sinceStr, to: untilStr })
  const attr = attrQuery.data
  const readSessions = attributionCoverage(attr).read.length
  const explained = attr && readSessions > 0 ? explainedOf(attr.totals) : null
  const unexplained = attr && readSessions > 0 ? attr.totals.unexplained : null
  const attributionNote =
    attr === null ? PNL_UNRECORDED.notServed : readSessions === 0 ? PNL_UNRECORDED.noPair : PNL_UNRECORDED.heldBook

  const windowPnl = useMemo(
    () => windowBookPnl(bulk.data?.byDayRangeData, sinceStr, untilStr),
    [bulk.data?.byDayRangeData, sinceStr, untilStr],
  )

  const gaps = useMemo(
    () => bookGapFills(canonicalQuery.data?.items ?? [], bookQuery.data?.items ?? []),
    [canonicalQuery.data?.items, bookQuery.data?.items],
  )

  const cash = useMemo(() => {
    const sinceSec = Date.parse(`${sinceStr}T00:00:00Z`) / 1000
    const untilSec = Date.parse(`${untilStr}T23:59:59Z`) / 1000
    return cashInWindow(cashQuery.data?.transactions ?? [], sinceSec, untilSec)
  }, [cashQuery.data?.transactions, sinceStr, untilStr])

  const unpricedLegs = book.alarm?.riskCounts?.unpriced ?? 0
  const leads = useMemo(
    () => pnlLeads({ gaps, cash, unpricedLegs, windowPnl }),
    [gaps, cash, unpricedLegs, windowPnl],
  )
  const total = leadsTotal(leads)

  /** The names carrying option legs, which is what an attribution would speak about. */
  const legNames = useMemo(() => {
    const names = new Map<string, number>()
    for (const p of book.allPositions ?? []) {
      if ((p.secType ?? '') !== 'OPT') continue
      const s = (p.symbol ?? '').trim().toUpperCase().split(/\s+/)[0]
      if (s) names.set(s, (names.get(s) ?? 0) + 1)
    }
    return [...names.entries()].map(([symbol, legs]) => ({ symbol, legs })).sort((a, b) => b.legs - a.legs)
  }, [book.allPositions])

  const loading = bulk.isLoading || canonicalQuery.isLoading
  const error = bulk.error ?? canonicalQuery.error ?? bookQuery.error
  const hasData = bulk.data != null || canonicalQuery.data != null
  // §17.1: Performance's bulk read is the figure this page takes apart.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : loading && !hasData
        ? 'loading'
        : error != null
          ? hasData
            ? 'stale'
            : 'failed'
          : 'ready'
  const failedQ = { data: null, isPending: false, isError: true, error }
  const retry = () => {
    void bulk.refetch()
    void canonicalQuery.refetch()
  }

  return (
    <PageShell padding="compact" className="space-y-3">
        {/* §16.10: the lead behind ⓘ, Performance — which owns the amount — as
            the head's door, the window in the toolbar. */}
        <PageHead
          title="P&L Explain"
          info={PAGE_LEAD}
          actions={
            <PageHeadLink to="/portfolio/performance" title="The amount itself belongs to Performance">
              The amount → Performance
            </PageHeadLink>
          }
        />
        <div data-sr-toolbar="">
          <span data-sr-tb="label">Window</span>
          <SegmentControl
            size="xs"
            ariaLabel="Window"
            value={timeRange}
            onChange={(v) => setTimeRange(v as PerformanceTimeRange)}
            options={TIME_RANGE_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          />
          <span data-sr-tb="meta">
            {fmtIsoDateToken(sinceStr)} → {fmtIsoDateToken(untilStr)}
          </span>
        </div>

        {pageState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh performance"
            detail={staleDetail(failedQ, 'the window reads the last copy.')}
            onAction={retry}
          />
        ) : null}
        {pageState === 'loading' ? (
          <section className={positionsUi.panel}>
            <ViewState kind="loading" title="Loading the window" rows={6} cols={6} />
          </section>
        ) : pageState === 'failed' ? (
          <section className={positionsUi.panel}>
            <ViewState
              kind="failed"
              title="Couldn’t load performance"
              detail={failedDetail(failedQ, 'Nothing was taken apart — this is not a window that ties out.')}
              onAction={retry}
            />
          </section>
        ) : (
          <>
            <SectionHead note="One number, one source — Performance is the source.">Does it tie out</SectionHead>
            {/* §16.2 (Rev .86): the four figures as heroes; the Ties / Off
                reading stays beside them. */}
            <div className="flex flex-wrap items-start gap-2.5">
              <HeroRow label="Does it tie out" className="min-w-0 flex-1">
                <HeroCard
                  label="Window P&L · book"
                  value={fmtSignedUsd0(windowPnl)}
                  valueClassName={pnlColorClass(windowPnl)}
                  sub="Performance’s own figure, taken apart here"
                />
                <HeroCard
                  label="Explained · Δ Γ vega θ"
                  value={explained == null ? '—' : fmtSignedUsd0(explained)}
                  valueClassName={explained == null ? 'text-muted-foreground' : pnlColorClass(explained)}
                  sub={
                    explained == null
                      ? 'the four attributions, summed'
                      : `held book · ${readSessions} ${readSessions === 1 ? 'session' : 'sessions'} read`
                  }
                  title={attributionNote}
                />
                <HeroCard
                  label="Unexplained"
                  value={unexplained == null ? '—' : fmtSignedUsd0(unexplained)}
                  valueClassName={unexplained == null ? 'text-muted-foreground' : pnlColorClass(unexplained)}
                  sub={
                    unexplained == null
                      ? 'defined as the difference — so it needs the four'
                      : 'held P&L less the four — always shown, even at zero'
                  }
                />
                <HeroCard
                  label="Leads that carry an amount"
                  value={fmtSignedUsd0(total.amount)}
                  valueClassName={pnlColorClass(total.amount)}
                  sub={`${total.withAmount} with a figure · ${total.countOnly} a count only`}
                />
              </HeroRow>
              {unexplained == null ? (
                <DenseTag variant="warning" size="cell" className="mt-3">
                  ⚠ the difference is not taken
                </DenseTag>
              ) : null}
            </div>
            <section className={positionsUi.panel} aria-label="Does it tie out">
              <p className={cn(FOOT, 'm-0')}>
                <span className={positionsUi.mono}>Window P&amp;L = Δ + Γ + vega + θ + Unexplained.</span> Performance
                owns the amount — FIFO realized plus unrealized — and this page only takes it apart; Performance is the
                source. {attributionNote} The leads below are not that difference: they are the leaks
                the book can name on its own.
              </p>
            </section>

            <SectionHead note="Available today — this half needs no Greeks, only the daily marks.">Unexplained</SectionHead>
            <section className={positionsUi.panel} aria-label="What nothing accounts for">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>What nothing accounts for</span>
                <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(total.amount))}>
                  {fmtSignedUsd0(total.amount)}
                </span>
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  {leads.length} {leads.length === 1 ? 'lead' : 'leads'} in this window
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  a residual is a lead, not a rounding error
                </span>
              </header>
              {leads.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                  Nothing in this window that the book cannot place — every fill reached the performance book, no cash
                  moved without a position behind it, and every leg carries a mark.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: six columns, the design's 900 floor. */}
                  <table className="w-full min-w-[900px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '35%' }} />
                      <col style={{ width: '18%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Symbol</th>
                        <th className={positionsUi.th}>Amount</th>
                        <th className={positionsUi.th}>of the window</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Reading</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Most likely cause</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Where it is settled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.key}>
                          <td
                            className={cn(
                              positionsUi.td,
                              'pl-2 text-left font-bold',
                              l.symbol ? 'text-[var(--color-entity-option)]' : 'font-sans font-normal text-muted-foreground',
                            )}
                          >
                            {l.symbol ?? 'no symbol'}
                          </td>
                          <td className={cn(positionsUi.td, 'font-bold', l.amount == null ? 'text-muted-foreground' : pnlColorClass(l.amount))}>
                            {l.amount == null ? '—' : fmtSignedUsd0(l.amount)}
                          </td>
                          <td className={cn(positionsUi.td, l.reading === 'worth a look' ? 'text-warning' : 'text-muted-foreground')}>
                            {l.amount == null || Math.abs(windowPnl) <= 0
                              ? '—'
                              : `${((Math.abs(l.amount) / Math.abs(windowPnl)) * 100).toFixed(1)}%`}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <span className={cn('inline-flex items-center gap-1.5 text-dense-meta', READING_TONE[l.reading])}>
                              <StatusLamp lamp={READING_LAMP[l.reading]} variant="dot" title={l.reading} />
                              {l.reading}
                            </span>
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-muted-foreground')}>
                            {l.cause}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            {l.to ? (
                              <Link to={l.to} className={positionsUi.link}>
                                {l.toLabel}
                              </Link>
                            ) : (
                              <span className="text-dense-meta text-muted-foreground">stays here</span>
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
                  Threshold: amber past {(PNL_UNEXPLAINED_THRESHOLD * 100).toFixed(0)}% of the window&rsquo;s own P&amp;L.
                  The design takes the same {(PNL_UNEXPLAINED_THRESHOLD * 100).toFixed(0)}% of <em>a name&rsquo;s</em>{' '}
                  own P&amp;L, which is a sharper test and the one worth having — the per-name held P&amp;L is in the
                  attribution below for every session the snapshot reads.
                </span>
                <span className="ml-auto">
                  Each cause is a candidate the named page can confirm or rule out. Nothing here is asserted as the
                  answer.
                </span>
              </div>
            </section>

            <SectionHead note="Each session against the one before it, from the nightly snapshot of positions, marks and vendor Greeks.">
              Attribution
            </SectionHead>
            <PnlAttributionBand
              attr={attr}
              loading={attrQuery.isLoading}
              failed={attrQuery.isError}
              windowLabel={TIME_RANGE_OPTIONS.find((o) => o.id === timeRange)?.label ?? ''}
              windowPnl={windowPnl}
              legNames={legNames}
            />

            {/* Rev .112 (§5.1.3): Judgment or luck moved to Review — the attribution stays
                computed here, and Review quotes it per play (Record · Earned from) and per trade. */}
            <div className="flex items-center gap-2.5 mat-card px-3 py-2 text-xs text-muted-foreground">
              <span className="min-w-0 text-pretty">
                Whether each play earned the way it says — θ and vega for a sell-vol play, Δ for a drift play — is read
                from these attributions on the play&rsquo;s record and on each trade&rsquo;s review.
              </span>
              <Link to="/review/playbook?tab=record" className={cn(positionsUi.link, 'ml-auto flex-none')}>
                Playbook › Record →
              </Link>
            </div>
          </>
        )}
    </PageShell>
  )
}
