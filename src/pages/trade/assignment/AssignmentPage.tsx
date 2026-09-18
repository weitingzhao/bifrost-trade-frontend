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
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtCushionPct } from '@/utils/optionMoneyness'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { useAssignmentLegs } from '@/hooks/useAssignmentLegs'
import { ASSIGNMENT_UNRECORDED, THIN_EXTRINSIC } from '@/utils/assignmentRisk'

const PAGE_LEAD =
  'What can be exercised against you, and what the book becomes if it is. Only a short can be assigned — a long is exercised by its holder, who is you.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export default function AssignmentPage() {
  const { attrQuery, legs, totals, thin, loading, error } = useAssignmentLegs()


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
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Exposure</span>
                <span className={positionsUi.panelTitle}>{totals.legs} short legs · assignment lens</span>
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
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  early risk is an ITM short with almost no time value left; otherwise the risk sits at expiry
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: nine columns — the design's eight plus Plan — at its 980 floor. */}
                <table className="w-full min-w-[980px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
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
                          <td className={cn(positionsUi.td, 'text-left font-sans')}>
                            <Link to="/trade/plans" className={positionsUi.link}>
                              roll it →
                            </Link>
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
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/55 px-3 py-1.75 last:border-b-0"
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
