/**
 * One closed trade read against what it was meant to be — the panels the
 * design draws in the Queue's Review slot and on the Single trade page.
 *
 * The Queue draws its own compact panel — the design gives the two surfaces
 * different shapes — so what the two share is the model: one ReviewTrade, and
 * REVIEW_GAPS wording the two gaps once, so they cannot describe the same
 * missing number differently.
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
import { REVIEW_GAPS, REVIEW_UNRECORDED, type ReviewTrade } from '@/utils/reviewTrades'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

export function ReviewTradeFit({ trade, tier = true }: { trade: ReviewTrade; tier?: boolean }) {
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
                ⚠ cannot be taken
              </DenseTag>
            </header>
            <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">{g.sub}</p>
            <p className="m-0 px-3 pb-2.5 text-dense-meta leading-normal text-secondary-foreground text-pretty">
              <span className="inline-flex items-center gap-1.5">
                <StatusLamp lamp="gray" variant="dot" title="Missing" />
                Needs {g.needs}.
              </span>
            </p>
          </section>
        ))}
      </div>

      <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Tags">
        <header className={positionsUi.panelHead}>
          <span className={positionsUi.cap}>Tags</span>
          <span className={positionsUi.panelTitle}>none can be derived</span>
          <DenseTag variant="warning" size="cell">
            ⚠ every tag turns on the plan or the path
          </DenseTag>
        </header>
        <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
          The design derives a trade&rsquo;s tags from its own series — exited early, held past plan, gave back the
          peak, slow cut. Each is a statement about <em>when</em> inside the trade, measured against either the planned
          bar or the best mark, and this side has neither. A tag guessed from the close alone would be an opinion
          presented as a derivation, which is the one thing a review page cannot afford.
        </p>
        <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
      </section>
    </>
  )
}
