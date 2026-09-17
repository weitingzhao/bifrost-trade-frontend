/**
 * Trade · Assignment — what can be exercised against you, and what the book
 * becomes if it is.
 *
 * Only short legs can be assigned, so only short legs are here. For each one
 * the page says how far spot is from the strike, how much of the price is still
 * time value — what a holder gives up by exercising early — and what the
 * position turns into.
 *
 * The one thing it cannot say is *when*. Early assignment on a call turns on a
 * dividend landing before expiry, and the feed carries no future ex-date for any
 * symbol in this book. The page marks that rather than letting a quiet column
 * read as safety.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtCushionPct } from '@/utils/optionMoneyness'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { buildOptionTicker, extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { fetchModelAnalysis } from '@/api/portfolio'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { daysTo } from '@/pages/trade/expiration/expirationModel'
import {
  ASSIGNMENT_UNRECORDED,
  THIN_EXTRINSIC,
  assignmentTotals,
  buildAssignmentLegs,
  thinExtrinsic,
} from './assignmentModel'

const PAGE_LEAD =
  'What can be exercised against you, and what the book becomes if it is. Only a short can be assigned — a long is exercised by its holder, who is you.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function AssignmentPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const attrQuery = usePositionAttribution()
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const attributions = useMemo(() => attrQuery.data?.items ?? [], [attrQuery.data?.items])
  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const modelQueries = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['portfolio', 'model-analysis', id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  const spotBySymbol = useMemo(() => {
    const by = new Map<string, number | null>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (symbol && u.spot != null) by.set(symbol, u.spot)
      }
    }
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  const greekLegs = useMemo<GreekLeg[]>(
    () =>
      attributions
        .filter((a) => (a.sec_type ?? '').toUpperCase() === 'OPT')
        .map((a) => ({
          underlying: extractUnderlyingRootSymbol(a.symbol),
          expiry: a.expiry ?? '',
          strike: Number(a.strike ?? 0),
          right: a.option_right ?? '',
          qty: Number(a.position_qty ?? 0),
        })),
    [attributions],
  )
  const greeks = useOptionGreeks(greekLegs)

  /** The vendor's close and delta, keyed the way the attribution rows are. */
  const { markByKey, deltaByKey } = useMemo(() => {
    const marks = new Map<string, { close: number | null; asOf: string | null }>()
    const deltas = new Map<string, number | null>()
    for (const a of attributions) {
      if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const ticker = buildOptionTicker({
        underlying: extractUnderlyingRootSymbol(a.symbol),
        expiry: a.expiry ?? '',
        strike: Number(a.strike ?? 0),
        right: a.option_right ?? '',
      })
      const key = a.contract_key ?? ''
      const close = ticker ? greeks.closeByTicker.get(ticker) : undefined
      if (close) marks.set(key, close)
      const g = ticker ? greeks.byTicker.get(ticker) : undefined
      // The rollup scales delta by the position; per contract is what reads as odds.
      const contracts = Math.abs(Number(a.position_qty ?? 0)) || 0
      if (g?.delta != null && contracts > 0) deltas.set(key, g.delta / (contracts * 100))
    }
    return { markByKey: marks, deltaByKey: deltas }
  }, [attributions, greeks.closeByTicker, greeks.byTicker])

  const legs = useMemo(
    () =>
      buildAssignmentLegs({
        attributions,
        markByKey,
        deltaByKey,
        spotBySymbol,
        dteByExpiry: (expiry) => daysTo(expiry, today),
      }),
    [attributions, markByKey, deltaByKey, spotBySymbol, today],
  )
  const totals = assignmentTotals(legs)
  const thin = thinExtrinsic(legs)

  const loading = statusLoading || attrQuery.isLoading
  const error = attrQuery.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Assignment">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Trade / Assignment</p>}
          title="Assignment"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <Link to="/trade/expiration" className={positionsUi.link}>
                when they expire → Expiration
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void attrQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ) : legs.length === 0 ? (
          <p className="m-0 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-3 text-dense-meta text-muted-foreground">
            No short option leg is open, so nothing can be assigned against you.
          </p>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="Exposure">
              <div className="flex flex-wrap items-start gap-x-7 gap-y-3 px-3.5 py-2.5">
                <PositionsStat
                  cap="Short legs"
                  value={String(totals.legs)}
                  sub={totals.unpriced > 0 ? `${totals.unpriced} the vendor could not price` : 'all priced'}
                />
                <PositionsStat
                  cap="In the money"
                  value={totals.itm > 0 ? String(totals.itm) : '—'}
                  ink={totals.itm > 0 ? 'text-warning' : undefined}
                  sub="what would be assigned if it stopped now"
                />
                <PositionsStat
                  cap="Shares it would move"
                  value={
                    totals.sharesIn + totals.sharesOut > 0
                      ? `${totals.sharesIn > 0 ? `+${totals.sharesIn.toLocaleString()}` : ''}${totals.sharesIn > 0 && totals.sharesOut > 0 ? ' / ' : ''}${totals.sharesOut > 0 ? `−${totals.sharesOut.toLocaleString()}` : ''}`
                      : '—'
                  }
                  sub="acquired / called away"
                />
                <PositionsStat
                  cap="Cash it would move"
                  value={totals.cashIfAllItmAssign !== 0 ? fmtMvAbbrev(totals.cashIfAllItmAssign) : '—'}
                  ink={pnlColorClass(totals.cashIfAllItmAssign)}
                  sub="if every in-the-money leg assigns"
                />
                <PositionsStat
                  cap="Thin time value"
                  value={thin.length > 0 ? String(thin.length) : '—'}
                  ink={thin.length > 0 ? 'text-warning' : undefined}
                  sub={`under ${fmtUsd(THIN_EXTRINSIC)} left to give up`}
                />
                <span className="ml-auto">
                  <PositionsStat
                    cap="Source disagrees"
                    value={totals.disagreeing > 0 ? String(totals.disagreeing) : '—'}
                    ink={totals.disagreeing > 0 ? 'text-warning' : undefined}
                    sub="delta and spot tell different stories"
                  />
                </span>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Only what is in the money counts towards the shares and the cash: an out-of-the-money leg expires and
                moves nothing. What the whole book is worth, and what backs it, is{' '}
                <Link to="/portfolio/backing" className={positionsUi.link}>
                  Backing &amp; Model&rsquo;s
                </Link>
                .
              </p>
            </section>

            <PositionsTier
              label="If everything ITM assigns"
              note="tightest cushion first — the one nearest its strike is the one to watch"
            />
            <section className={positionsUi.panel} aria-label="Short legs">
              <div className="overflow-x-auto">
                {/* §14.6: eight columns, the design's 980 floor. */}
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Leg</th>
                      <th className={positionsUi.th}>Short</th>
                      <th className={positionsUi.th}>To strike</th>
                      <th className={positionsUi.th} title={ASSIGNMENT_UNRECORDED.odds}>
                        Time value left
                      </th>
                      <th className={positionsUi.th} title={ASSIGNMENT_UNRECORDED.odds}>
                        |Δ|
                      </th>
                      <th className={positionsUi.th}>DTE</th>
                      <th className={cn(positionsUi.th, 'text-left')}>What it becomes</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Early trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legs.map((l) => {
                      const thinHere = l.extrinsic != null && l.extrinsic <= THIN_EXTRINSIC
                      return (
                        <tr key={l.contractKey} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {shortOptContractKey(l.contractKey)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-warning')}>{l.contracts}</td>
                          <td
                            className={cn(
                              positionsUi.td,
                              l.cushionPct == null
                                ? 'text-muted-foreground'
                                : l.itm || l.cushionPct < 0.05
                                  ? 'text-warning'
                                  : 'text-secondary-foreground',
                            )}
                          >
                            {fmtCushionPct(l.cushionPct)}
                            {l.itm ? ' ITM' : ''}
                          </td>
                          <td className={cn(positionsUi.td, l.extrinsic == null ? 'text-muted-foreground' : thinHere ? 'text-warning' : 'text-secondary-foreground')}>
                            {l.extrinsic == null ? '—' : fmtUsd(l.extrinsic)}
                          </td>
                          <td className={cn(positionsUi.td, l.deltaDisagrees ? 'text-warning' : 'text-muted-foreground')}>
                            {l.absDelta == null ? (
                              '—'
                            ) : l.deltaDisagrees ? (
                              <span
                                className="inline-flex items-center gap-1"
                                title={ASSIGNMENT_UNRECORDED.disagree}
                              >
                                <StatusLamp lamp="yellow" variant="dot" title="The source disagrees with itself" />
                                {l.absDelta.toFixed(2)}
                              </span>
                            ) : (
                              l.absDelta.toFixed(2)
                            )}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>{l.dte ?? '—'}</td>
                          <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal text-secondary-foreground')}>
                            {l.sharesAfter > 0
                              ? `+${l.sharesAfter.toLocaleString()} sh · pays ${fmtMvAbbrev(Math.abs(l.cashAfter))}`
                              : `${l.sharesAfter.toLocaleString()} sh · takes in ${fmtMvAbbrev(Math.abs(l.cashAfter))}`}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                              <StatusLamp lamp="gray" variant="dot" title="No ex-date feed" />
                              no reading
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className={cn(FOOT, 'flex flex-wrap gap-x-4 gap-y-1')}>
                <span>
                  Time value left is what a holder gives up by exercising now — under {fmtUsd(THIN_EXTRINSIC)} they give
                  up almost nothing, which is when early assignment stops being unlikely. {ASSIGNMENT_UNRECORDED.odds}
                </span>
                {totals.disagreeing > 0 ? <span>{ASSIGNMENT_UNRECORDED.disagree}</span> : null}
              </div>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Early trigger">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Early trigger</span>
                  <span className={positionsUi.panelTitle}>a dividend before expiry</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ needs a corporate-action feed
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  A short call goes early when the dividend it gives up is worth more than the time value it keeps. This
                  page has one side of that comparison — the time value is in the table — and not the other.
                </p>
                <p className={cn(FOOT, 'm-0')}>{ASSIGNMENT_UNRECORDED.trigger}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="History">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>History</span>
                  <span className={positionsUi.panelTitle}>what was assigned before</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ nothing is marked assigned
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  What happened after an assignment — the shares taken, and what was written against them the Monday
                  after — is the part worth reading. It needs the closes to be marked as assignments first.
                </p>
                <p className={cn(FOOT, 'm-0')}>
                  {ASSIGNMENT_UNRECORDED.history} How each finished idea ended does have a reading —{' '}
                  <Link to="/portfolio/outcome" className={positionsUi.link}>
                    Outcome →
                  </Link>
                </p>
              </section>
            </div>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page says what could be
              exercised against the book and what it would become. When those legs expire is{' '}
              <Link to="/trade/expiration" className={positionsUi.link}>
                Expiration&rsquo;s
              </Link>
              ; whether the cash is there to take the shares is{' '}
              <Link to="/risk/margin" className={positionsUi.link}>
                Margin&rsquo;s
              </Link>
              .
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
