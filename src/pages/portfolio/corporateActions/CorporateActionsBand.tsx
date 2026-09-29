/**
 * Corporate Actions · the closing band: assignment risk over an ex-date,
 * cited from Assignment and never recomputed (§14.2), beside the last 90
 * days of events on names the book holds.
 */
import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AssignmentLeg } from '@/utils/assignmentRisk'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { fmtUsd } from '@/utils/positions'
import {
  CORPORATE_ACTIONS_UNRECORDED,
  dividendBefore,
  HISTORY_DAYS,
  type BookEvent,
} from './corporateActionsModel'
import { amountLabel, FOOT, fmtPerShare, fmtShares } from './corporateActionsFormat'
import { KindTag, Ticker } from './corporateActionsMarks'

const ROW = 'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-3 py-1.75 last:border-b-0'

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

export function CorporateActionsBand({
  shortCalls,
  events,
  history,
  legSymbols,
}: {
  /** Assignment's own short calls, through the shared hook. */
  shortCalls: readonly AssignmentLeg[]
  /** Every event the feed returned for the book and watchlist. */
  events: readonly BookEvent[]
  /** The last 90 days, on names the book holds. */
  history: readonly BookEvent[]
  legSymbols: ReadonlySet<string>
}) {
  const declared = shortCalls.filter((l) => dividendBefore(events, l.symbol, l.expiry) != null).length
  return (
    <div className={positionsUi.bandGrid}>
      <section className={positionsUi.panel} aria-label="Cited, not computed">
        <header className={positionsUi.panelHead}>
          <span className={positionsUi.cap}>Cited, not computed</span>
          <span className={positionsUi.panelTitle}>assignment risk over an ex-date</span>
          <Link to="/trade/expiration#assignment" className={cn(positionsUi.link, 'ml-auto')}>
            Trading › Expiry →
          </Link>
        </header>
        {shortCalls.length === 0 ? (
          <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
            The book holds no short call, so no leg can be exercised early for a dividend.
          </p>
        ) : (
          shortCalls.map((l) => {
            const div = dividendBefore(events, l.symbol, l.expiry)
            return (
              <div key={l.contractKey} className={ROW}>
                <span
                  className={cn(positionsUi.mono, 'text-xs font-bold text-[var(--color-entity-option)]')}
                  title={l.contractKey}
                >
                  {shortOptContractKey(l.contractKey)}
                </span>
                {/* Assignment's own extrinsic, through the shared hook. */}
                <span className={cn(positionsUi.mono, 'text-dense-meta text-secondary-foreground')}>
                  extrinsic {l.extrinsic == null ? 'n/c' : fmtUsd(l.extrinsic)} vs dividend{' '}
                  {div?.amount != null ? fmtPerShare(div.amount) : '—'}
                </span>
                {div ? (
                  // A declared dividend before expiry is the trigger the test
                  // exists for; the weighing is Assignment's, so this cites it.
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="A dividend is declared before this leg expires" />
                    ex {fmtIsoDateToken(div.exDate ?? '')} lands before {fmtIsoDateToken(l.expiry)} — weigh it on{' '}
                    <Link to="/trade/expiration#assignment" className={positionsUi.link}>
                      Assignment
                    </Link>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                    <StatusLamp lamp="gray" variant="dot" title="No dividend declared before expiry" />
                    {l.extrinsic == null
                      ? 'the vendor priced no close, so there is no time value to weigh either'
                      : `no dividend declared before ${fmtIsoDateToken(l.expiry)} — nothing to weigh it against`}
                  </span>
                )}
              </div>
            )
          })
        )}
        <p className={cn(FOOT, 'm-0')}>
          {CORPORATE_ACTIONS_UNRECORDED.assignment}
          {shortCalls.length > 0
            ? ` Declared before expiry today: ${declared} of ${shortCalls.length} short calls.`
            : ''}
        </p>
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
            <div key={e.key} className={ROW}>
              <span className={cn(positionsUi.mono, 'min-w-15.5 text-dense-meta text-muted-foreground')}>
                {fmtIsoDateToken(e.exDate ?? '')}
              </span>
              <Ticker symbol={e.symbol} className="text-xs" />
              <KindTag e={e} />
              <span className={cn(positionsUi.mono, 'text-xs text-secondary-foreground')}>{amountLabel(e)}</span>
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
  )
}
