/**
 * The trade picked in the queue, in the design's compact Review panel.
 *
 * Plan / Actual / Entry as three lines, the two gaps as boxes beside each
 * other, the tags, and the two actions. Single trade draws the same reading
 * page-sized; what the two share is the model — one ReviewTrade and
 * REVIEW_GAPS — so they can differ in shape without differing in what they say.
 *
 * Three of the lines need what this side has not got. They are marked in place
 * rather than dropped, because the panel's argument is the gap between what the
 * plan said and what I did, and a panel with the plan removed is a fill report.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { REVIEW_GAPS, REVIEW_UNRECORDED, type ReviewTrade } from '@/utils/reviewTrades'

/** The tags the design offers by hand. Each would write, and nothing stores one. */
const HAND_TAGS = ['revenge entry', 'sized up on conviction', 'exited on news', 'good fill', 'thesis held']

function Line({ cap, children }: { cap: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 px-3 py-1">
      <span className={positionsUi.cap}>{cap}</span>
      <span className="min-w-0 text-dense-body leading-normal text-secondary-foreground text-pretty">{children}</span>
    </div>
  )
}

export function ReviewSelectedPanel({ trade }: { trade: ReviewTrade }) {
  return (
    <section className={positionsUi.panel} aria-label="Review">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Review</span>
        <span className={cn(positionsUi.mono, 'font-bold text-sky-300')}>
          {trade.underlying}
        </span>
        <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>· {trade.label}</span>
        <span className={cn(positionsUi.mono, 'ml-auto text-sm font-bold', pnlColorClass(trade.realised))}>
          {fmtUsd(trade.realised)}
        </span>
      </header>

      <div className="flex flex-col border-b border-border py-1">
        <Line cap="Plan">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <StatusLamp lamp="gray" variant="dot" title="No plan reached this position" />
            n/c — no plan was ever linked to this position, so there is no target and no planned bar
          </span>
        </Line>
        <Line cap="Actual">
          {trade.exitKind === 'expired' ? 'expired' : 'closed by a fill'}
          {trade.daysHeld == null ? '' : ` after ${trade.daysHeld}d`}
          {trade.dteAtEntry == null ? '' : ` of ${trade.dteAtEntry}d`} ·{' '}
          <span className={pnlColorClass(trade.realised)}>{fmtUsd(trade.realised)}</span>
        </Line>
        <Line cap="Entry">
          {trade.openedOn ? fmtIsoDateToken(trade.openedOn) : '—'}
          {trade.dteAtEntry == null ? '' : ` · ${trade.dteAtEntry} DTE`} · {trade.play ?? 'no play recorded'}
          <span className="text-muted-foreground"> · IV rank n/c</span>
        </Line>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2 px-3 py-2.5">
        {REVIEW_GAPS.map((g) => (
          <div key={g.key} className="min-w-0 rounded-md border border-warning/40 px-2.5 py-2">
            <span className={cn(positionsUi.cap, 'block')}>{g.label}</span>
            <span className={cn(positionsUi.mono, 'block pt-0.5 text-sm font-bold text-muted-foreground')}>n/c</span>
            <span className="block pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
              {g.sub}
            </span>
            <span className="block pt-1 text-dense-meta leading-normal text-secondary-foreground text-pretty">
              Needs {g.needs}.
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-3 py-2.5">
        <span className={cn(positionsUi.cap, 'block')}>Auto-derived tags</span>
        <p className="m-0 pt-1 text-dense-meta leading-normal text-muted-foreground text-pretty">
          None can be derived. Every tag the design derives — held past plan, exited early, gave back the peak — is a
          statement about <em>when</em> inside the trade, against either the planned bar or the best mark, and this
          side has neither. A tag read off the close alone would be an opinion wearing a derivation&rsquo;s clothes.
        </p>
      </div>

      <div className="border-t border-border px-3 py-2.5">
        <span className={cn(positionsUi.cap, 'block')}>Add a tag the rules missed</span>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {HAND_TAGS.map((t) => (
            <span
              key={t}
              className="inline-flex h-6 items-center rounded-md border border-dashed border-border px-2 text-dense-meta text-muted-foreground/70"
              title="Adding a tag would write, and nothing on this side stores one"
            >
              + {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-[var(--sk-raised2)] px-3 py-2">
        <DenseTag variant="warning" size="cell">
          ⚠ confirming would write
        </DenseTag>
        <Link to={`/review/fit?trade=${encodeURIComponent(trade.contractKey)}`} className={positionsUi.link}>
          Open fit →
        </Link>
        <span className="ml-auto text-dense-meta text-muted-foreground">{REVIEW_UNRECORDED.reviewed.split('.')[0]}.</span>
      </div>
    </section>
  )
}
