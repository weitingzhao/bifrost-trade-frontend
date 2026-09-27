/**
 * The trade picked in the queue, in the design's compact Review panel.
 *
 * Plan / Actual / Entry as three lines, the two gaps as boxes beside each
 * other, the tags, and the two actions. Single trade draws the same reading
 * page-sized; what the two share is the model — one ReviewTrade, REVIEW_GAPS
 * and Single trade's own tag derivation — so they can differ in shape without
 * differing in what they say.
 *
 * The plan line and both gaps need the plan a position was opened under, and
 * none is linked (DEV 2026-09-26: 3 plans, all cancelled, none filled), so
 * they are marked in place rather than dropped. The rest had been marked too
 * and is read now: the tags come off the contract's own daily bars, and the
 * entry's IV rank off Research's IV-rank history.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { fmtIsoDateToken } from '@/lib/format'
import { withSymbolParam } from '@/lib/symbolLink'
import { pnlColorClass } from '@/utils/dailyChange'
import { shortOptLegLabel } from '@/utils/ledger/optionsModeBridge'
import { fmtUsd } from '@/utils/positions'
import type { MarkPath } from '@/utils/reviewMarkPath'
import { REVIEW_GAPS, REVIEW_UNRECORDED, type ReviewTrade } from '@/utils/reviewTrades'
import { derivedTags, type Tone } from '@/pages/review/fit/tradeFitModel'
import { rankOnEntry } from '@/utils/entryIvRank'
import { useEntryIvRanks } from '@/hooks/useEntryIvRanks'

/** The tags the design offers by hand. Each would write, and nothing stores one. */
const HAND_TAGS = ['revenge entry', 'sized up on conviction', 'exited on news', 'good fill', 'thesis held']

/** A severity edge on a card is inline: `mat-card` clears border-colour classes. */
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

/** A tag is a state (§14.8): good the state green, caution amber, bad the red — never the P&L inks. */
const TONE_TEXT: Record<Tone, string> = {
  success: 'text-[var(--sk-state-green)]',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
}

// Rev .62: a foot is a rule, not a band.
const FOOT = 'flex flex-wrap items-center gap-2 border-t border-border px-3 py-2'

function Line({ cap, children }: { cap: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5 px-3 py-1">
      <span className={positionsUi.cap}>{cap}</span>
      <span className="min-w-0 text-dense-body leading-normal text-secondary-foreground text-pretty">{children}</span>
    </div>
  )
}

export function ReviewSelectedPanel({
  trade,
  path,
  pathLoading,
}: {
  trade: ReviewTrade
  /**
   * The trade's mark path from the queue's own book-wide read, so the row's
   * Auto tags and this panel's cannot disagree (§14.2).
   */
  path: MarkPath | null
  pathLoading: boolean
}) {
  const tags = derivedTags(trade, path)
  const pathTags = tags.filter((t) => !t.unreadable)
  const planTags = tags.filter((t) => t.unreadable)

  const ranks = useEntryIvRanks(useMemo(() => [trade], [trade]))
  const rankRows = ranks.rowsByName.get(trade.underlying)
  const ivRank =
    rankRows === undefined ? undefined : rankRows === null || !trade.openedOn ? null : rankOnEntry(rankRows, trade.openedOn)

  return (
    <section className={positionsUi.panel} aria-label="Review">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>Review</span>
        <span className="inline-flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
          <Link
            to={withSymbolParam(SYMBOL_PATH, trade.underlying)}
            className={cn(positionsUi.mono, 'font-bold text-entity-symbol hover:underline')}
            title={`Open ${trade.underlying} on Symbol`}
          >
            {trade.underlying}
          </Link>
          <span className={cn(positionsUi.mono, 'text-dense-meta text-[var(--color-entity-option)]')}>
            {shortOptLegLabel(trade.contractKey)}
          </span>
        </span>
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
          <span
            className={ivRank == null ? 'text-muted-foreground' : 'text-foreground'}
            title="The underlying’s IV30 on the entry session against its own trailing year — Research’s IV-rank history"
          >
            {' '}
            · IV rank {ivRank === undefined ? '…' : ivRank == null ? 'none on file' : ivRank.toFixed(0)}
          </span>
        </Line>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-2 px-3 py-2.5">
        {REVIEW_GAPS.map((g) => (
          <div key={g.key} className="min-w-0 border px-2.5 py-2 mat-card" style={WARN_EDGE}>
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
        {pathLoading ? (
          <p className="m-0 pt-1 text-dense-meta leading-normal text-muted-foreground">Reading the contract’s daily bars…</p>
        ) : (
          <div className="flex flex-col gap-1.5 pt-1.5">
            {pathTags.map((t) => (
              <div key={t.key} className="min-w-0 px-2.5 py-1.5 mat-card">
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-dense-meta font-semibold', TONE_TEXT[t.tone])}>{t.label}</span>
                  <span className={cn(positionsUi.mono, 'ml-auto text-dense-caption text-muted-foreground')}>auto</span>
                </div>
                <p className="m-0 pt-0.5 text-dense-meta leading-normal text-muted-foreground text-pretty">{t.why}</p>
              </div>
            ))}
            {path == null ? (
              <p className="m-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
                No daily bar covers this contract&rsquo;s holding period, so nothing is derived from its path.
              </p>
            ) : null}
            {planTags.map((t) => (
              <p key={t.key} className="m-0 inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
                <span className="pt-1">
                  <StatusLamp lamp="gray" variant="dot" title="Needs a plan" />
                </span>
                <span>
                  <span className="font-semibold">{t.label}</span> — {t.why}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-2.5">
        <span className={cn(positionsUi.cap, 'block')}>Add a tag the rules missed</span>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {HAND_TAGS.map((t) => (
            <span
              key={t}
              className="inline-flex h-6 items-center rounded-md border border-dashed border-border px-2 text-dense-meta text-muted-foreground"
              title="Adding a tag would write, and nothing on this side stores one"
            >
              + {t}
            </span>
          ))}
        </div>
      </div>

      <div className={FOOT}>
        <DenseTag variant="warning" size="cell">
          confirming would write
        </DenseTag>
        <Link to={`/review/fit?trade=${encodeURIComponent(trade.contractKey)}`} className={positionsUi.link}>
          Open fit →
        </Link>
        <span className="ml-auto text-dense-meta text-muted-foreground">{REVIEW_UNRECORDED.reviewed.split('.')[0]}.</span>
      </div>
    </section>
  )
}
