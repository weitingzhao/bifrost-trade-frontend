/**
 * What the trade did, and the two gaps a single P&L number blurs.
 *
 * Single trade draws this above the path panels; the Queue draws its own
 * compact version in the Review slot. What the two share is the model — one
 * ReviewTrade and REVIEW_GAPS — so they cannot describe the same missing
 * number differently.
 *
 * Both gaps are measured from the plan's own exit, and no plan is linked to a
 * position, so both stay marked. Plan quality's *other* end — the best mark —
 * is no longer missing, and the panel says which half is which rather than
 * lumping them together.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { REVIEW_GAPS, type ReviewTrade } from '@/utils/reviewTrades'
import type { MarkPath } from '@/utils/reviewMarkPath'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export function ReviewTradeFit({
  trade,
  markPath,
  pathLoading = false,
  tier = true,
}: {
  trade: ReviewTrade
  markPath?: MarkPath | null
  /** The marks are still in flight — a loading state must not read as "not recorded". */
  pathLoading?: boolean
  tier?: boolean
}) {
  const markMissing = pathLoading ? '…' : 'n/c'
  const markSub = pathLoading ? 'reading the contract’s daily bars' : 'no daily bar for this window'
  return (
    <>
      <section className={positionsUi.panel} aria-label="What the trade did">
        <header className={positionsUi.panelHead}>
          <span className={cn(positionsUi.mono, 'font-bold text-[var(--color-entity-option)]')}>{trade.label}</span>
          <span className={positionsUi.panelTitle}>{trade.play ?? 'no play recorded'}</span>
          <span className={cn(positionsUi.mono, 'text-sm', pnlColorClass(trade.realised))}>
            {fmtUsd(trade.realised)}
          </span>
          <span className="ml-auto text-dense-meta text-muted-foreground">
            {trade.shortPremium ? 'opened by selling — short premium' : 'opened by buying — a debit trade'}
          </span>
        </header>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-x-4 gap-y-2 px-3 py-2.5">
          <PositionsStat
            cap="Opened"
            value={trade.openedOn ? fmtIsoDateToken(trade.openedOn) : '—'}
            sub={trade.dteAtEntry == null ? 'no expiry read' : `${trade.dteAtEntry} days to expiry`}
          />
          <PositionsStat
            cap="Closed"
            value={trade.closedOn ? fmtIsoDateToken(trade.closedOn) : '—'}
            sub={trade.daysHeld == null ? 'no dated fills' : `held ${trade.daysHeld} days`}
          />
          <PositionsStat
            cap="Premium in"
            value={fmtUsd(trade.entryPremium)}
            sub={`${trade.contracts} ${trade.contracts === 1 ? 'contract' : 'contracts'}`}
          />
          <PositionsStat cap="Premium out" value={fmtUsd(trade.exitPremium)} sub="paid to close" />
          <PositionsStat
            cap="Credit kept"
            value={trade.creditKept == null ? 'debit' : fmtPct0(trade.creditKept)}
            ink={trade.creditKept == null ? 'text-muted-foreground' : undefined}
            sub={trade.creditKept == null ? 'no credit was taken in' : '1 − exit ÷ entry'}
          />
          <PositionsStat
            cap="Best mark"
            value={markPath == null ? markMissing : fmtUsd(markPath.best, true)}
            ink={markPath == null ? 'text-muted-foreground' : pnlColorClass(markPath.best)}
            sub={markPath == null ? markSub : `${fmtIsoDateToken(markPath.bestDate)} · landed ${fmtPct0(markPath.captureOfBest)}`}
          />
          <PositionsStat
            cap="Worst mark"
            value={markPath == null ? markMissing : fmtUsd(markPath.worst, true)}
            ink={markPath == null ? 'text-muted-foreground' : pnlColorClass(markPath.worst)}
            sub={
              markPath == null
                ? markSub
                : markPath.everUnderwater
                  ? `${fmtIsoDateToken(markPath.worstDate)} · the risk actually carried`
                  : 'never marked below the entry'
            }
          />
        </div>
        <p className={cn(FOOT, 'm-0')}>
          Fills-based and fees included, the same figures the{' '}
          <Link to="/portfolio/ledger" className={positionsUi.link}>
            Trade Ledger
          </Link>{' '}
          shows for this contract — one computation, cited twice.
        </p>
      </section>

      {tier ? <PositionsTier label="The two gaps" note="what a P&L number cannot separate on its own" /> : null}
      <div className={positionsUi.bandGrid}>
        {REVIEW_GAPS.map((g) => (
          <section key={g.key} className={cn(positionsUi.panel, 'border-warning/40')} aria-label={g.label}>
            <header className={positionsUi.panelHead}>
              <span className={positionsUi.cap}>{g.label}</span>
              <span className={positionsUi.panelTitle}>n/c</span>
              <DenseTag variant="warning" size="cell">
                ⚠ NO PLAN
              </DenseTag>
            </header>
            <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">{g.sub}</p>
            <p className="m-0 px-3 pb-2.5 text-dense-meta leading-normal text-secondary-foreground text-pretty">
              <span className="inline-flex items-start gap-1.5">
                <span className="pt-1">
                  <StatusLamp lamp="gray" variant="dot" title="Missing" />
                </span>
                <span>Needs {g.needs}.</span>
              </span>
            </p>
          </section>
        ))}
      </div>
    </>
  )
}
