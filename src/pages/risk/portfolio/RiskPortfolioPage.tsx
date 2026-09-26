/**
 * Risk · Portfolio Exposure — the book as one exposure, not nineteen.
 *
 * Owner ruling 2026-09-17 (option b): this page does what Backing & Model does
 * not — β-weighting, correlation, and the Greeks rolled to the whole book.
 * Per-underlying capital at risk, the payoff model and its own stress stay
 * Backing's subject and are cited here, never redrawn: two pages computing one
 * figure would disagree eventually.
 *
 * β and the correlation matrix are Research's (RS2, computed on read); Δ$ is
 * the model service's; Γ / vega / Θ are the vendor legs the Positions page
 * already rolls up. Nothing here re-derives any of the four.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { HeroCard, HeroRow, PageHead, PageHeadLink, PageShell, SectionHead } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { BookFetchMarker } from '@/components/positions/BookFetchMarker'
import { BackingHeadroomPanel } from '@/components/positions/BackingHeadroomPanel'
import { CorrelationPanel } from './CorrelationPanel'
import { STRESS_VOL_ROWS } from '@/pages/risk/stress/stressModel'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { BETA_WINDOWS, CORR_WINDOW, useRiskExposure } from '@/hooks/useRiskExposure'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useRowLink } from '@/hooks/useRowLink'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { RISK_CONCENTRATION_FLOOR, RISK_UNRECORDED } from '@/utils/riskExposure'

const PAGE_LEAD =
  'Net book exposure, β-weighted to SPY. What each position is worth and what backs it is Backing & Model’s; this page asks how much of the book is one bet.'

// Rev .62: a panel's foot is a rule, not a band.
const FOOT = 'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** Row hover and the share track, in ink (Rev .84): the accent's lime fallback is gone. */
const ROW_HOVER = 'hover:[&>td]:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const TRACK = 'bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]'


export default function RiskPortfolioPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  const statusQ = useMonitorStatus()
  const preview = usePreviewState()
  const rowLink = useRowLink()
  const {
    status,
    statusLoading,
    accountIds,
    modelQueries,
    modelStamp,
    scopeKey,
    betaQuery,
    corrQuery,
    betaLong,
    corrSymbols,
    book,
    legs,
    rows,
    totals,
    expiries,
    enp,
    clusters,
    judgment,
    error,
  } = useRiskExposure(accountFilter)
  const netLiq = useMemo(
    () =>
      (status?.portfolio?.accounts ?? [])
        .filter((a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter)
        .reduce((s, a) => s + (Number(a.summary?.NetLiquidation) || 0), 0),
    [status, accountFilter],
  )

  /** The account-level stress the model service reports — a spot axis, at today's vol. */
  const stress = useMemo(() => {
    const by = new Map<number, number>()
    let ivAvailable = false
    for (const q of modelQueries) {
      const s = q.data?.account_stress
      if (!s?.available) continue
      if (s.iv_stress_available) ivAvailable = true
      for (const sc of s.scenarios ?? []) {
        if (sc.iv_shock !== 0) continue
        const change = sc.pnl_change
        if (change == null) continue
        by.set(sc.spot_shock, (by.get(sc.spot_shock) ?? 0) + change)
      }
    }
    return {
      ivAvailable,
      cells: [...by.entries()].sort((a, b) => a[0] - b[0]).map(([shock, pnl]) => ({ shock, pnl })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp, scopeKey])

  const topShare = rows[0]?.share ?? null
  const concentrated = topShare != null && topShare > RISK_CONCENTRATION_FLOOR
  const maxStress = Math.max(1, ...stress.cells.map((c) => Math.abs(c.pnl)))

  // §17.1: the broker snapshot (the monitor's status read) is the page's one
  // critical source; the model service failing is narrower — a strip.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : statusLoading || (status != null && modelQueries.some((q) => q.isLoading))
        ? 'loading'
        : sourceState(statusQ)
  const retry = () => void statusQ.refetch()

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10 with §17: the lead behind ⓘ, the snapshot's age as the stamp,
          the two counterpart pages as head links, the account switch in the
          toolbar. */}
      <PageHead
        title="Portfolio Exposure"
        info={PAGE_LEAD}
        stamp={<BookFetchMarker quiet />}
        actions={
          <>
            <PageHeadLink to="/portfolio/positions">Positions →</PageHeadLink>
            {/* The reverse of Contract Greeks' own `Aggregates in Risk →`: a
                page's counterpart belongs beside its other counterpart, where
                the Owner looked for it (it once hid in the table header). */}
            <PageHeadLink to="/research/greeks" title="Every option leg in the book, greek by greek">
              Contract Greeks →
            </PageHeadLink>
          </>
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
          title="Couldn’t refresh the broker snapshot"
          detail={staleDetail(statusQ, 'trades since then are not reflected.')}
          onAction={retry}
        />
      ) : null}
      {pageState !== 'loading' && pageState !== 'failed' && error != null ? (
        <ViewState
          kind="failed"
          layout="strip"
          title="Couldn’t load the model"
          detail={failedDetail(
            { data: null, isPending: false, isError: true, error },
            'Δ$ and the stress read nothing — unmeasured, not flat.',
          )}
          onAction={() => modelQueries.forEach((q) => void q.refetch())}
        />
      ) : null}
      {pageState === 'loading' ? (
        <section className={positionsUi.panel}>
          <ViewState kind="loading" title="Loading exposure" rows={8} cols={6} />
        </section>
      ) : pageState === 'failed' ? (
        <section className={positionsUi.panel}>
          <ViewState
            kind="failed"
            title="Couldn’t load the broker snapshot"
            detail={failedDetail(statusQ, 'No exposure below was computed — this is not a flat book.')}
            onAction={retry}
          />
        </section>
      ) : (
        <>
          {/* §16.2 (Rev .85): four heroes; Net liq and Vega stay in the strip
              under them. Each keeps its sub-line, link and state ink. */}
          <HeroRow label="The book's exposure">
            <HeroCard
              label="β-wtd Δ$ · SPY-eq"
              value={totals.withBetaDelta > 0 ? fmtSignedUsd0(totals.betaDeltaDollars) : '—'}
              // An exposure, not a gain: ink when long, the loss ink only when
              // the book is net short (the design's bdColor).
              valueClassName={totals.betaDeltaDollars < 0 ? 'text-loss' : 'text-foreground'}
              sub={
                totals.withBetaDelta > 0
                  ? `${fmtSignedUsd0(totals.betaDeltaDollars / 100)} per +1% SPY · ${totals.withBetaDelta} of ${rows.length} names`
                  : 'no name carries both a Δ$ and a β'
              }
            />
            <HeroCard
              label="Γ · per point"
              value={legs.length > 0 ? fmtSignedUsd0(totals.gamma) : '—'}
              valueClassName={totals.gamma < 0 ? 'text-warning' : 'text-foreground'}
              sub={totals.gamma < 0 ? 'short gamma — the move works against the book' : 'long gamma'}
            />
            <HeroCard
              label="Θ · per day"
              value={legs.length > 0 ? fmtSignedUsd0(totals.theta) : '—'}
              valueClassName={pnlColorClass(totals.theta)}
              sub="carry, summed over the priced legs"
            />
            <HeroCard
              label="Backing used"
              value={judgment?.usedPct != null ? `${Math.round(judgment.usedPct * 100)}%` : '—'}
              valueClassName={judgment?.overGate ? 'text-warning' : 'text-foreground'}
              state={judgment?.overGate ? 'warn' : null}
              sub={
                <>
                  gate 85% ·{' '}
                  <Link to="/portfolio/backing" className={positionsUi.link}>
                    Backing →
                  </Link>
                </>
              }
            />
          </HeroRow>
          <section className={positionsUi.panel} aria-label="Book totals">
            <div data-sr-kpi="strip-inset">
              <PositionsStat cap="Net liq" value={netLiq > 0 ? fmtMvAbbrev(netLiq) : '—'} sub="broker, this scope" />
              <PositionsStat cap="Vega · per vol pt" value={legs.length > 0 ? fmtSignedUsd0(totals.vega) : '—'} />
            </div>
            <p className={cn(FOOT, 'm-0')}>
              β and the correlation matrix are Research&rsquo;s, over {CORR_WINDOW}-day daily returns against{' '}
              {betaQuery.data?.benchmark ?? 'SPY'}
              {betaQuery.data?.as_of ? ` · last bar ${fmtIsoDateToken(betaQuery.data.as_of)}` : ''}. Δ$ is the model
              service&rsquo;s; Γ, vega and Θ are the vendor legs Positions prices. This page re-derives none of the
              four — what a position is worth and what backs it is{' '}
              <Link to="/portfolio/backing" className={positionsUi.link}>
                Backing &amp; Model&rsquo;s
              </Link>
              .
            </p>
          </section>

          <SectionHead
            note="β-wtd Δ$ = Δ$ × β against SPY · share is of the book’s risk, so a short name is a slice too. Click a row for the Symbol page, its legs for them one by one."
          >
            Net Greeks by underlying
          </SectionHead>
            <section className={positionsUi.panel} aria-label="Net Greeks by underlying">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{rows.length} names</span>
                {totals.withoutBetaDelta > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                    <StatusLamp lamp="gray" variant="dot" title="No reading — not a fault" />
                    {totals.withoutBetaDelta} without a β-weighted Δ$
                  </span>
                ) : null}
                {/* The second door: the same detail with no filter on it. */}
                <Link
                  to="/research/greeks"
                  className={positionsUi.link}
                  title="Every option leg in the book, greek by greek"
                >
                  every leg · Contract Greeks →
                </Link>
                {concentrated ? (
                  <span className="ml-auto text-dense-meta font-semibold text-warning">
                    concentration · {rows[0].symbol} {Math.round((topShare ?? 0) * 100)}% of β-Δ (over{' '}
                    {Math.round(RISK_CONCENTRATION_FLOOR * 100)}%)
                  </span>
                ) : null}
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: eleven columns, the design's 1060 floor. */}
                <table className="w-full min-w-[1060px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Sym</th>
                      <th className={positionsUi.th} title={`${BETA_WINDOWS[0]}-day against SPY`}>
                        β · {BETA_WINDOWS[0]}d
                      </th>
                      <th className={positionsUi.th} title={`${BETA_WINDOWS[1]}-day against SPY`}>
                        β · {BETA_WINDOWS[1]}d
                      </th>
                      <th className={positionsUi.th}>Spot</th>
                      <th className={positionsUi.th}>Δ$</th>
                      <th className={positionsUi.th}>β-wtd Δ$</th>
                      <th className={cn(positionsUi.th, 'text-left')}>share of β-Δ</th>
                      <th className={positionsUi.th}>Γ /pt</th>
                      <th className={positionsUi.th}>Vega /pt</th>
                      <th className={positionsUi.th}>Θ /d</th>
                      <th className={positionsUi.th}>Legs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const hot = (r.share ?? 0) > RISK_CONCENTRATION_FLOOR
                      return (
                        // The design's row opens the name (`r.go` → Symbol); the
                        // legs link inside stops the click from reaching it.
                        <tr
                          key={r.symbol}
                          title={`${r.symbol} — open the Symbol page`}
                          {...rowLink(withSymbolParam(SYMBOL_PATH, r.symbol), ROW_HOVER)}
                        >
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-entity-symbol')}>
                            {r.symbol}
                          </td>
                          <td className={cn(positionsUi.td, r.beta == null ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.beta == null ? '—' : r.beta.toFixed(2)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {betaLong.get(r.symbol) == null ? '—' : betaLong.get(r.symbol)!.toFixed(2)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                            {r.spot == null ? '—' : fmtUsd(r.spot)}
                          </td>
                          <td className={cn(positionsUi.td, r.deltaDollars == null ? 'text-muted-foreground' : 'text-foreground')}>
                            {r.deltaDollars == null ? '—' : fmtSignedUsd0(r.deltaDollars)}
                          </td>
                          <td
                            className={cn(
                              positionsUi.td,
                              'font-bold',
                              r.betaDeltaDollars == null ? 'text-muted-foreground' : 'text-foreground',
                            )}
                          >
                            {r.betaDeltaDollars == null ? '—' : fmtSignedUsd0(r.betaDeltaDollars)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left')}>
                            {r.share == null ? (
                              <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                                <StatusLamp lamp="gray" variant="dot" title="No reading" />
                                {r.noReadingReason === 'no_spot' ? 'no spot' : 'no reading'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className={cn('inline-block h-1.25 w-18 overflow-hidden rounded-sm', TRACK)}>
                                  <span
                                    className={cn('block h-full', hot ? 'bg-warning' : 'bg-[var(--sk-line2)]')}
                                    style={{ width: `${Math.round(r.share * 100)}%` }}
                                  />
                                </span>
                                <span className={cn(positionsUi.mono, 'text-dense-meta', hot ? 'text-warning' : 'text-muted-foreground')}>
                                  {Math.round(r.share * 100)}%
                                </span>
                              </span>
                            )}
                          </td>
                          <td className={cn(positionsUi.td, r.gamma == null ? 'text-muted-foreground' : r.gamma < 0 ? 'text-warning' : 'text-secondary-foreground')}>
                            {r.gamma == null ? '—' : fmtSignedUsd0(r.gamma)}
                          </td>
                          <td className={cn(positionsUi.td, r.vega == null ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.vega == null ? '—' : fmtSignedUsd0(r.vega)}
                          </td>
                          <td className={cn(positionsUi.td, r.theta == null ? 'text-muted-foreground' : pnlColorClass(r.theta))}>
                            {r.theta == null ? '—' : fmtSignedUsd0(r.theta)}
                          </td>
                          {/* The first of the three doors the design gave
                              Contract Greeks when it moved that page here
                              (2026-09-23): this row's legs, which is the
                              per-leg detail behind this row's aggregate.
                              `?sym=` filters the book; it does not scope the
                              page to the name. A stock-only row has no legs,
                              so it gets no door rather than a link to an
                              empty page. */}
                          <td className={cn(positionsUi.td, r.legs === 0 ? 'text-muted-foreground' : 'text-secondary-foreground')}>
                            {r.legs === 0 ? (
                              <span title={`${r.symbol} is stock only — no option legs to detail`}>
                                stock
                              </span>
                            ) : (
                              // A bare count in the eleventh numeric column
                              // reads as a number, not a door — the Owner
                              // could not find it. The arrow is the
                              // affordance, and it matches the header's.
                              <Link
                                to={`/research/greeks?sym=${encodeURIComponent(r.symbol)}`}
                                onClick={(e) => e.stopPropagation()}
                                className={cn(positionsUi.link, 'underline decoration-dotted underline-offset-2')}
                                title={`Every ${r.symbol} leg in the book, greek by greek`}
                              >
                                {r.legs} →
                              </Link>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    <tr>
                      <td className={cn(positionsUi.td, 'border-b-0 pl-2 text-left font-sans font-semibold text-muted-foreground')}>
                        Net
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0')} colSpan={3} />
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.deltaDollars)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.betaDeltaDollars)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0')} />
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold', totals.gamma < 0 ? 'text-warning' : 'text-foreground')}>
                        {fmtSignedUsd0(totals.gamma)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold text-foreground')}>
                        {fmtSignedUsd0(totals.vega)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 font-bold', pnlColorClass(totals.theta))}>
                        {fmtSignedUsd0(totals.theta)}
                      </td>
                      <td className={cn(positionsUi.td, 'border-b-0 text-secondary-foreground')}>{legs.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                A name the vendor could not price is counted and left out of the sums — never added as a zero. β is
                Research&rsquo;s reading over {BETA_WINDOWS[0]} and {BETA_WINDOWS[1]} sessions; a window it could not
                fill comes back as no reading, not as 1.0.
              </p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={cn(positionsUi.panel, !stress.ivAvailable && 'border-warning/40')} aria-label="Stress">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Stress</span>
                  <span className={positionsUi.panelTitle}>P&amp;L against a spot move</span>
                  {!stress.ivAvailable ? (
                    <DenseTag variant="warning" size="cell">
                      ⚠ no vol axis
                    </DenseTag>
                  ) : null}
                  <span className="ml-auto text-dense-meta text-muted-foreground">whole book · cited from the model</span>
                </header>
                {stress.cells.length === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
                    The model service reports no account stress for this scope.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    {/* The design's matrix, with the vol rows it draws — only flat carries a reading. */}
                    <table className="w-full min-w-[500px] border-collapse [&_td]:px-1 [&_th]:px-1">
                      <thead>
                        <tr>
                          <th className={cn(positionsUi.th, 'text-left')}>vol \ SPY</th>
                          {stress.cells.map((c) => (
                            <th key={c.shock} className={positionsUi.th}>
                              {c.shock > 0 ? '+' : ''}
                              {Math.round(c.shock * 100)}%
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {STRESS_VOL_ROWS.map((row) => (
                          <tr key={row.label}>
                            <td className={cn(positionsUi.td, 'pl-2 text-left font-sans text-muted-foreground')}>
                              {row.label}
                            </td>
                            {stress.cells.map((c) =>
                              row.ivShock == null ? (
                                <td key={c.shock} className={cn(positionsUi.td, 'text-muted-foreground')} title={RISK_UNRECORDED.volShock}>
                                  —
                                </td>
                              ) : (
                                <td
                                  key={c.shock}
                                  className={cn(positionsUi.td, 'border border-[var(--sk-raised2)]', pnlColorClass(c.pnl))}
                                  style={{
                                    background: `color-mix(in oklab, ${c.pnl < 0 ? 'var(--color-loss)' : 'var(--color-profit)'} ${Math.round(Math.min(0.32, (Math.abs(c.pnl) / maxStress) * 0.32) * 100)}%, transparent)`,
                                  }}
                                  title={`SPY ${c.shock > 0 ? '+' : ''}${Math.round(c.shock * 100)}% · vol flat`}
                                >
                                  {fmtSignedUsd0(c.pnl)}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className={cn(FOOT, 'm-0')}>
                  Each row is what the shock itself costs, not the payoff at that price. {RISK_UNRECORDED.volShock} The
                  same axis opens up, with who pays for each column, on{' '}
                  <Link to="/risk/stress" className={positionsUi.link}>
                    Stress &amp; Scenario →
                  </Link>
                </p>
              </section>

              <BackingHeadroomPanel
                usedPct={judgment?.usedPct ?? null}
                action={
                  <Link to="/portfolio/backing" className={positionsUi.link}>
                    Backing &amp; Model &rarr;
                  </Link>
                }
                foot={
                  <>
                    The red line is the house gate, where Rules would trip auto-derisk. {RISK_UNRECORDED.gateHit}
                  </>
                }
              />
            </div>

            <CorrelationPanel
              symbols={corrSymbols}
              matrix={corrQuery.data?.matrix ?? null}
              clusters={clusters}
              window={CORR_WINDOW}
              enp={enp}
              names={totals.withBetaDelta}
            />

            <section className={positionsUi.panel} aria-label="By expiry">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>By expiry</span>
                <span className={positionsUi.panelTitle}>where Γ and Θ sit</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {legs.length} priced {legs.length === 1 ? 'leg' : 'legs'}
                  {book.greeks.unmatched > 0 ? ` · ${book.greeks.unmatched} the vendor could not price` : ''}
                </span>
                {/* The design's door to what sits on each expiry. */}
                <Link to="/research/events" className={positionsUi.link} title="Which expiry carries an event — Events">
                  Events →
                </Link>
              </header>
              {expiries.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">No option legs in this scope.</p>
              ) : (
                <div className="overflow-x-auto">
                  {/* §14.6: five columns, the design's 620 floor. */}
                  <table className="w-full min-w-[620px] table-fixed border-collapse">
                    <colgroup>
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>Expiry</th>
                        <th className={positionsUi.th}>Legs</th>
                        <th className={positionsUi.th}>Γ /pt</th>
                        <th className={positionsUi.th}>Θ /d</th>
                        <th className={positionsUi.th}>Vega /pt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiries.map((e) => (
                        <tr key={e.expiry}>
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {fmtIsoDateToken(`${e.expiry.slice(0, 4)}-${e.expiry.slice(4, 6)}-${e.expiry.slice(6, 8)}`)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{e.legs}</td>
                          <td className={cn(positionsUi.td, (e.gamma ?? 0) < 0 ? 'text-warning' : 'text-secondary-foreground')}>
                            {e.gamma == null ? '—' : fmtSignedUsd0(e.gamma)}
                          </td>
                          <td className={cn(positionsUi.td, pnlColorClass(e.theta ?? 0))}>
                            {e.theta == null ? '—' : fmtSignedUsd0(e.theta)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>
                            {e.vega == null ? '—' : fmtSignedUsd0(e.vega)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>
                Which expiry carries an event, and which strike the dealers sit at, is Events&rsquo; subject — this table
                only says where the book&rsquo;s convexity and carry are.
              </p>
            </section>

            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page asks how much of the
              book is one bet. What a position is worth, what backs it, and its own payoff and stress are{' '}
              <Link to="/portfolio/backing" className={positionsUi.link}>
                Backing &amp; Model&rsquo;s
              </Link>{' '}
              — computed once, cited here.
            </p>
          </>
        )}
    </PageShell>
  )
}
