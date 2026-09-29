/**
 * Expiry › Assignment (design Rev .109 merged the Assignment page into Expiry;
 * `/trade/assignment` lands here, on `#assignment`) — what can be exercised
 * against you before expiry, and what the book becomes if it is.
 *
 * Only short legs can be assigned, so only short legs are here. For each one
 * the page says how far spot is from the strike, how much of the price is still
 * time value — what a holder gives up by exercising early — and what the
 * position turns into.
 *
 * *When* is the dividend's to say: a short call goes early when the dividend
 * it would miss outweighs the time value left. Each short call reads its own
 * name's corporate actions and says whether one is declared before expiry
 * (`assignmentReadings.ts`). The history is read off the broker's own book
 * entries, which is where an assignment lands.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { SectionHead } from '@/components/layout'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { fetchCorporateActions, type CorporateActionRow } from '@/api/marketData/corporateActions'
import { useAssignmentLegs } from '@/hooks/useAssignmentLegs'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { usePreviewState } from '@/hooks/usePreviewState'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { fmtIsoDateToken } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtCushionPct } from '@/utils/optionMoneyness'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { shortOptContractKey, shortOptLegLabel } from '@/utils/ledger/optionsModeBridge'
import { ASSIGNMENT_UNRECORDED, THIN_EXTRINSIC } from '@/utils/assignmentRisk'
import { bookedHistory, earlyTrigger } from './assignmentReadings'

const PAGE_LEAD =
  'What can be exercised against you, and what the book becomes if it is. Only a short can be assigned — a long is exercised by its holder, who is you.'

// Rev .62: a foot is a rule, not a band.
const FOOT = 'border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'
const ROW_HOVER = 'hover:[&>td]:bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
/** The design's wash on a row that wants a look — amber 4%, a state, never a fill colour of its own. */
const ROW_HOT = '[&>td]:bg-[color-mix(in_srgb,var(--color-warning)_4%,transparent)]'
/** A severity edge on a card must be inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

export function AssignmentSection() {
  const { attrQuery, legs, totals, thin, loading } = useAssignmentLegs()
  const execQuery = useExecutionsCanonical()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  // One read per name carrying a short call, on the key Home · Today uses —
  // one cache entry, so the two surfaces cannot disagree about an ex-date.
  const callNames = useMemo(
    () => [...new Set(legs.filter((l) => l.right === 'C').map((l) => l.symbol))].sort(),
    [legs],
  )
  const caQueries = useQueries({
    queries: callNames.map((symbol) => ({
      queryKey: ['market-data', 'corporate-actions', symbol, 50],
      queryFn: () => fetchCorporateActions(symbol, 50),
      enabled: Boolean(symbol),
      staleTime: 60 * 60_000,
    })),
  })
  const caStamp = caQueries.map((q) => `${q.dataUpdatedAt}:${q.isError ? 1 : 0}`).join(',')
  const caByName = useMemo(() => {
    const by = new Map<string, readonly CorporateActionRow[] | null | undefined>()
    callNames.forEach((name, i) => {
      const q = caQueries[i]
      by.set(name, q?.isError ? null : q?.data?.rows)
    })
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caStamp, callNames])

  const triggers = useMemo(
    () => new Map(legs.map((l) => [l.contractKey, earlyTrigger(l, caByName.get(l.symbol), today)])),
    [legs, caByName, today],
  )
  const triggerList = [...triggers.values()]
  const declared = triggerList.filter((t) => t.exDate != null).length
  const hot = triggerList.filter((t) => t.hot).length
  const shortCalls = legs.filter((l) => l.right === 'C').length
  const caFailed = caQueries.filter((q) => q.isError).length

  // The design's head count: a leg whose early trigger fires — a declared
  // dividend over its time value, or in the money with almost none left.
  const earlyN = legs.filter((l) => {
    const thinHere = l.extrinsic != null && l.extrinsic <= THIN_EXTRINSIC
    return Boolean(triggers.get(l.contractKey)?.hot) || (Boolean(l.itm) && thinHere)
  }).length

  const history = useMemo(() => bookedHistory(execQuery.data?.items ?? []), [execQuery.data?.items])

  // §17.1: the attribution rows are the critical read; the corporate actions
  // and the book entries each cost one column or one panel if they fail, so
  // they are strips.
  const preview = usePreviewState()
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale'
      ? preview
      : loading
        ? 'loading'
        : sourceState(attrQuery)
  const shownLegs = preview === 'empty' ? [] : legs

  return (
    <div className="space-y-3">
      <SectionHead
        id="assignment"
        className="scroll-mt-3"
        note={PAGE_LEAD}
        meta={
          pageState === 'ready' && legs.length > 0 ? (
            <span className={positionsUi.mono}>
              {totals.legs} short legs · {totals.itm} ITM
            </span>
          ) : undefined
        }
      >
        Assignment
      </SectionHead>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the book’s legs"
          detail={staleDetail(attrQuery, 'a short opened or closed since then is not shown.')}
          onAction={() => void attrQuery.refetch()}
        />
      ) : null}
      {pageState === 'ready' && caFailed > 0 ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read some ex-dates"
          detail={`${caFailed} of ${callNames.length} names’ corporate actions did not answer — their early-trigger cells say unread, not clear.`}
          onAction={() => caQueries.forEach((q) => void q.refetch())}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className={positionsUi.panel}>
          <ViewState kind="loading" title="Loading the short legs" rows={6} cols={9} />
        </section>
      ) : pageState === 'failed' ? (
        <section className={positionsUi.panel}>
          <ViewState
            kind="failed"
            title="Couldn’t load the book’s legs"
            detail={failedDetail(attrQuery, 'Nothing was evaluated — this is not a book with no shorts.')}
            onAction={() => void attrQuery.refetch()}
          />
        </section>
      ) : shownLegs.length === 0 ? (
        <section className={positionsUi.panel}>
          <ViewState
            kind="empty"
            title="No short option leg is open"
            detail="Nothing can be assigned against you. A short leg reaches this page as soon as the broker reports it."
          />
        </section>
      ) : (
        <>
          <section className={positionsUi.panel} aria-label="Short legs">
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>Short legs</span>
              <span className={positionsUi.panelTitle}>
                {totals.legs} open · {earlyN} early trigger
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 text-dense-meta',
                  totals.itm > 0 ? 'text-warning' : 'text-muted-foreground',
                )}
              >
                <StatusLamp lamp={totals.itm > 0 ? 'yellow' : 'green'} variant="dot" title="In the money" />
                {totals.itm > 0 ? `${totals.itm} in the money` : 'none in the money'}
              </span>
              {thin.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                  <StatusLamp lamp="yellow" variant="dot" title="Almost no time value left" />
                  {thin.length} with under {fmtUsd(THIN_EXTRINSIC)} of time value
                </span>
              ) : null}
              {totals.unpriced > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <StatusLamp lamp="gray" variant="dot" title="No vendor row" />
                  {totals.unpriced} unpriced
                </span>
              ) : null}
              {totals.disagreeing > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                  <StatusLamp lamp="yellow" variant="dot" title="The source disagrees with itself" />
                  {totals.disagreeing} the source disagrees on
                </span>
              ) : null}
              {hot > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                  <StatusLamp lamp="yellow" variant="dot" title="A declared dividend outweighs the time value" />
                  {hot} with a dividend over its time value
                </span>
              ) : null}
              <span className="ml-auto text-dense-meta text-muted-foreground">
                early risk is an ITM short with almost no time value left, or a call under a larger dividend; otherwise
                the risk sits at expiry
              </span>
            </header>
            <div className="overflow-x-auto">
              {/* §14.6: nine columns — the design's eight plus Plan. 1040 rather than the
                  design's 980: the early-trigger cell now carries a date and two amounts. */}
              <table className="w-full min-w-[1040px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '10%' }} />
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
                    <th className={cn(positionsUi.th, 'text-left')}>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {shownLegs.map((l) => {
                    const thinHere = l.extrinsic != null && l.extrinsic <= THIN_EXTRINSIC
                    const trig = triggers.get(l.contractKey)
                    const rowHot = Boolean(trig?.hot) || (Boolean(l.itm) && thinHere)
                    return (
                      <tr key={l.contractKey} className={cn(ROW_HOVER, rowHot && ROW_HOT)}>
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                          {shortOptContractKey(l.contractKey)}
                        </td>
                        {/* A count of contracts is a state, not a warning — ink. */}
                        <td className={cn(positionsUi.td, 'text-foreground')}>{l.contracts}</td>
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
                        <td
                          className={cn(
                            positionsUi.td,
                            l.extrinsic == null
                              ? 'text-muted-foreground'
                              : thinHere
                                ? 'text-warning'
                                : 'text-secondary-foreground',
                          )}
                        >
                          {l.extrinsic == null ? '—' : fmtUsd(l.extrinsic)}
                        </td>
                        <td className={cn(positionsUi.td, l.deltaDisagrees ? 'text-warning' : 'text-muted-foreground')}>
                          {l.absDelta == null ? (
                            '—'
                          ) : l.deltaDisagrees ? (
                            <span className="inline-flex items-center gap-1" title={ASSIGNMENT_UNRECORDED.disagree}>
                              <StatusLamp lamp="yellow" variant="dot" title="The source disagrees with itself" />
                              {l.absDelta.toFixed(2)}
                            </span>
                          ) : (
                            l.absDelta.toFixed(2)
                          )}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>{l.dte ?? '—'}</td>
                        <td className={cn(positionsUi.td, 'whitespace-normal text-left font-sans text-secondary-foreground')}>
                          {l.sharesAfter > 0
                            ? `+${l.sharesAfter.toLocaleString()} sh · pays ${fmtMvAbbrev(Math.abs(l.cashAfter))}`
                            : `${l.sharesAfter.toLocaleString()} sh · takes in ${fmtMvAbbrev(Math.abs(l.cashAfter))}`}
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            'whitespace-normal text-left font-sans text-dense-meta',
                            trig?.tone === 'warn' ? 'text-warning' : 'text-muted-foreground',
                          )}
                          title={trig?.title}
                        >
                          {trig?.text ?? '—'}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans')}>
                          {/* A declared dividend is Corporate Actions' to route; otherwise
                              the way out is a roll, on Plans narrowed to the name. */}
                          {trig?.exDate ? (
                            <Link to="/portfolio/corporate-actions" className={positionsUi.link}>
                              Corp Actions →
                            </Link>
                          ) : (
                            <Link to={withSymbolParam('/trade/plans', l.symbol)} className={positionsUi.link}>
                              roll it →
                            </Link>
                          )}
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
              <span>
                Assignment itself needs no action — the shares simply arrive. The plan column is for when you would
                rather roll than take them, and whether the cash is there is{' '}
                <Link to="/risk/margin" className={positionsUi.link}>
                  Margin&rsquo;s
                </Link>
                .
              </span>
              {totals.disagreeing > 0 ? <span>{ASSIGNMENT_UNRECORDED.disagree}</span> : null}
            </div>
          </section>

          <div className={positionsUi.bandGrid}>
            <section className={positionsUi.panel} aria-label="If everything ITM assigns">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>If everything ITM assigns</span>
                <span className={positionsUi.panelTitle}>worst-case book</span>
              </header>
              <div className="flex flex-col">
                {[
                  {
                    k: 'Shares taken',
                    v: totals.sharesIn > 0 ? `+${totals.sharesIn.toLocaleString()} sh` : 'none',
                    ink: totals.sharesIn > 0 ? 'text-foreground' : 'text-muted-foreground',
                  },
                  {
                    k: 'Stock delivered away',
                    v: totals.sharesOut > 0 ? `−${totals.sharesOut.toLocaleString()} sh` : 'none',
                    ink: totals.sharesOut > 0 ? 'text-foreground' : 'text-muted-foreground',
                  },
                  {
                    k: 'Cash it would move',
                    v: totals.cashIfAllItmAssign !== 0 ? fmtMvAbbrev(totals.cashIfAllItmAssign) : '$0',
                    ink: pnlColorClass(totals.cashIfAllItmAssign),
                  },
                  { k: 'Backing after', v: 'not computed', ink: 'text-muted-foreground' },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-3 py-1.75 last:border-b-0"
                  >
                    <span className="text-xs leading-normal text-muted-foreground">{row.k}</span>
                    <span className={cn(positionsUi.mono, 'text-xs font-semibold', row.ink)}>{row.v}</span>
                  </div>
                ))}
              </div>
              <p className={cn(FOOT, 'm-0')}>
                {totals.itm === 0
                  ? 'Nothing is in the money, so the worst case is that everything expires and the book does not move.'
                  : `${totals.itm} of ${totals.legs} legs are in the money — only those count here.`}{' '}
                What backing becomes after the shares land is Backing &amp; Model&rsquo;s to compute, and whether the
                cash is there is{' '}
                <Link to="/risk/margin" className={positionsUi.link}>
                  Margin&rsquo;s
                </Link>
                .
              </p>
            </section>

            <section
              className={positionsUi.panel}
              style={hot > 0 ? WARN_EDGE : undefined}
              aria-label="Early trigger"
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Early trigger</span>
                <span className={positionsUi.panelTitle}>a dividend before expiry</span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  {shortCalls === 0
                    ? 'no short call'
                    : `${declared} of ${shortCalls} short calls with one declared`}
                </span>
              </header>
              <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                A short call goes early when the dividend it gives up is worth more than the time value it keeps. Both
                sides are read here: the time value from the vendor&rsquo;s mark, the dividend from each name&rsquo;s own
                corporate actions — the same rows{' '}
                <Link to="/portfolio/corporate-actions" className={positionsUi.link}>
                  Corporate Actions
                </Link>{' '}
                lists.{' '}
                {hot > 0
                  ? `${hot} short call${hot === 1 ? ' has' : 's have'} a declared dividend that outweighs the time value — the day before its ex-date is when an early exercise pays.`
                  : declared > 0
                    ? 'Every declared dividend ahead is still covered by the time value; that margin narrows toward expiry.'
                    : 'No dividend is declared before any short call’s expiry.'}
              </p>
              <p className={cn(FOOT, 'm-0')}>
                A dividend exists only once its issuer declares it, and the plugin looks 60 days ahead each night — so
                &ldquo;none declared&rdquo; is today&rsquo;s reading, not a promise about the whole life of a leg.
              </p>
            </section>

            <section className={positionsUi.panel} aria-label="History">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>History</span>
                <span className={positionsUi.panelTitle}>
                  {history.events.length === 0
                    ? 'nothing assigned'
                    : `${history.events.length} assign${history.events.length === 1 ? 'ment' : 'ments'} or exercises`}
                  {history.since ? ` · since ${fmtIsoDateToken(history.since)}` : ''}
                </span>
              </header>
              {execQuery.isError && execQuery.data == null ? (
                <ViewState
                  kind="failed"
                  layout="strip"
                  title="Couldn’t read the book entries"
                  detail={failedDetail(execQuery, 'Nothing here says whether anything was assigned.')}
                  onAction={() => void execQuery.refetch()}
                />
              ) : execQuery.isPending ? (
                <ViewState kind="loading" title="Reading the book entries" rows={3} cols={4} />
              ) : history.events.length === 0 ? (
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  No option leg was closed with shares moving beside it — every book entry here is an expiry.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[26rem] border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(positionsUi.th, 'text-left')}>When</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Leg</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Kind</th>
                        <th className={cn(positionsUi.th, 'text-left')}>Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.events.map((h) => (
                        <tr key={h.key} className={ROW_HOVER}>
                          <td className={cn(positionsUi.td, 'text-left text-muted-foreground')}>
                            {fmtIsoDateToken(h.date)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left')}>
                            <Link
                              to={withSymbolParam(SYMBOL_PATH, h.underlying)}
                              className="font-bold text-entity-symbol hover:underline"
                              title={`Open ${h.underlying} on Symbol`}
                            >
                              {h.underlying}
                            </Link>{' '}
                            <span className="text-[var(--color-entity-option)]">
                              {h.contractKey ? shortOptLegLabel(h.contractKey) : `${h.right} ${fmtIsoDateToken(h.expiry)}`}
                            </span>
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans', h.early ? 'text-warning' : 'text-muted-foreground')}>
                            {h.kind === 'assigned' ? (h.early ? 'early assignment' : 'assigned at expiry') : h.early ? 'exercised early' : 'exercised at expiry'}
                          </td>
                          <td className={cn(positionsUi.td, 'whitespace-normal text-left font-sans text-secondary-foreground')}>
                            {h.contracts} contract{h.contracts === 1 ? '' : 's'} ·{' '}
                            {h.shares > 0 ? `+${h.shares.toLocaleString()} sh taken` : `${h.shares.toLocaleString()} sh delivered away`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className={cn(FOOT, 'm-0')}>
                Read off the broker&rsquo;s book entries: {history.optionLegs} option legs were closed by one rather than
                by a trade, {history.expired} with no shares moving (expiries). The broker&rsquo;s own code that names an
                assignment is not kept by the ingest, so a stock leg booked the same day on the same name is what marks
                one here. What was written against the shares after is on the{' '}
                <Link to="/portfolio/ledger" className={positionsUi.link}>
                  Trade Ledger
                </Link>
                ; how each finished idea ended is{' '}
                <Link to="/portfolio/outcome" className={positionsUi.link}>
                  Outcome&rsquo;s
                </Link>
                .
              </p>
            </section>
          </div>

        </>
      )}
    </div>
  )
}
