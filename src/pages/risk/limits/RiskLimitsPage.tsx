/**
 * Risk · Limits & Breaches — the whole limit book, and what each rule reads.
 *
 * Twelve rules in five groups, as the design draws them. Three carry a number
 * this app actually stores. Seven carry a live reading and no line, because the
 * Rules engine that would hold the lines is not built; the last two can read
 * neither side and say which half is missing. All twelve stay on the page: a
 * limit book with the unwritten rules removed would read as a complete book,
 * which is the one thing it must not do.
 *
 * Every reading is computed on the page that owns it and cited back to it
 * (§14.2) — the exposure numbers come from the same hook Portfolio Exposure
 * draws from, not from a second derivation. Nothing here writes: not a limit,
 * not an acknowledgement.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button, ViewState } from '@bifrost/ui'
import { PageHead, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { fmtPct0 } from '@/utils/positions'

import { useLimitBook } from '@/hooks/useLimitBook'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePreviewState } from '@/hooks/usePreviewState'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import {
  LIMITS_UNRECORDED,
  LIMIT_GROUPS,
  fmtReading,
  openBreaches,
  unwritten,
  watching,
} from '@/utils/limitsModel'

const PAGE_LEAD =
  'A hard limit is one something would act on; a soft limit asks to be acknowledged. Every reading belongs to the page that computes it — this one only holds each against a line, and writes nothing.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

const ESCALATION: { kind: string; tone: string; what: string }[] = [
  {
    kind: 'SOFT',
    tone: 'text-warning',
    what: 'A badge, and an acknowledgement to silence it. Nothing stores the acknowledgement, so a soft breach stays visible here until the reading itself moves back inside the line.',
  },
  {
    kind: 'HARD',
    tone: 'text-lamp-red',
    what: 'Blocks the offending action at the Rules engine and lands a derisk ticket in Trade Plans. That engine is not built, so a hard breach on this page is a reading, not a block.',
  },
  {
    kind: 'AUTO',
    tone: 'text-loss',
    what: 'The backing gate only: Rules would trim the largest margin user without asking. Nothing trims anything today — the trading daemon is frozen (D10) and configured for paper trading.',
  },
]

export default function RiskLimitsPage() {
  const [accountFilter, setAccountFilter] = useState('all')
  // The book is assembled once, in `useLimitBook`, because Risk (the layer
  // page) and Today read the same one. This page draws it in full.
  const { rows, accountIds, modelQueries, error, gateReadings } = useLimitBook(accountFilter)
  // The same status query the book already made — reading it again costs nothing.
  const statusQ = useMonitorStatus()
  const preview = usePreviewState()
  const bookState = preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(statusQ)
  const noData = bookState === 'loading' || bookState === 'failed'
  const retry = () => void statusQ.refetch()

  const breaches = openBreaches(rows)
  const near = watching(rows)
  const noLine = unwritten(rows)
  const held = rows.filter((r) => r.use != null).length
  const withLine = rows.filter((r) => r.limit != null).length


  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Limits and Breaches">
        {/* §16.10 sample page (Rev .32): the lead is behind ⓘ, the rule count
            is meta, the Rules engine is a head action, and the account switch
            — a filter — moved to the toolbar under the head. No stamp: the
            prototype passes none here (§16.14 will give it the book's). */}
        <PageHead
          title="Limits & Breaches"
          info={PAGE_LEAD}
          meta={`${rows.length} rules · ${withLine} with a line`}
          actions={
            <Button asChild variant="outline" size="sm">
              {/* Straight to the destination: /strategy/gates is a redirect
                  here since the Strategy pages retired (2026-09-18). */}
              <Link to="/trade/rules" title="Trade › Rules — where gates are defined">
                Rules engine →
              </Link>
            </Button>
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

        {/* §17.1: the book's critical source is the monitor's status read;
            a model failure only leaves the greek lines unread, so it is a
            strip, not a block. */}
        {bookState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh the limit book"
            detail={staleDetail(statusQ, 'breaches since then are not shown.')}
            onAction={retry}
          />
        ) : null}
        {!noData && error != null ? (
          <ViewState
            kind="failed"
            layout="strip"
            title="Couldn’t load the Greeks model"
            detail={failedDetail(
              { data: null, isPending: false, isError: true, error },
              'The greek lines read no value — unmeasured, not inside their limits.',
            )}
            onAction={() => modelQueries.forEach((q) => void q.refetch())}
          />
        ) : null}
        {bookState === 'loading' ? (
          <section className={positionsUi.panel}>
            <ViewState kind="loading" title="Loading the limit book" rows={8} cols={6} />
          </section>
        ) : bookState === 'failed' ? (
          <section className={positionsUi.panel}>
            <ViewState
              kind="failed"
              title="Couldn’t load the limit book"
              detail={failedDetail(
                statusQ,
                'No limit was evaluated — this is not the same as nothing being over the line.',
              )}
              onAction={retry}
            />
          </section>
        ) : (
          <>
            <section
              className={cn(positionsUi.panel, breaches.length > 0 && 'border-lamp-red/45')}
              aria-label="Open breaches"
            >
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Open breaches</span>
                <span className={positionsUi.panelTitle}>
                  {breaches.length === 0 ? 'nothing is over a line' : `${breaches.length} open`}
                </span>
                {near.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-dense-meta text-warning">
                    <StatusLamp lamp="yellow" variant="dot" title="Close to the line" />
                    {near.length} close
                  </span>
                ) : null}
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  computed from the readings — no queue stores it
                </span>
              </header>
              {breaches.length === 0 ? (
                <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Every rule that has both a reading and a line is inside it — {held} of {rows.length}. The other{' '}
                  {rows.length - held} cannot be breached, because nothing has drawn the line.
                </p>
              ) : (
                breaches.map((r) => (
                  <div
                    key={r.key}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/55 px-3 py-2 last:border-b-0"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal font-semibold text-foreground">
                      <StatusLamp
                        lamp={r.kind === 'hard' ? 'red' : r.kind === 'gate' ? 'gray' : 'yellow'}
                        variant="dot"
                        title={r.kind}
                      />
                      {r.name}
                    </span>
                    <span className={cn(positionsUi.mono, 'text-xs text-warning')}>
                      {fmtReading(r, r.current)} against {fmtReading(r, r.limit)}
                    </span>
                    <span className="min-w-0 flex-[1_1_10rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                      {r.onBreach}
                    </span>
                    {r.citedFrom ? (
                      <Link to={r.citedFrom.to} className={positionsUi.link}>
                        {r.citedFrom.label} →
                      </Link>
                    ) : null}
                    {/* The design draws this slot on every breach and lets the
                        severity fill it: a hard line cannot be acknowledged at
                        all, a soft one can — except that acknowledging is a
                        write, and nothing stores one. Drawn and disabled, so
                        the row does not read as "nothing to decide". */}
                    <button
                      type="button"
                      disabled
                      title={
                        r.kind === 'hard'
                          ? 'A hard limit is not acknowledged — it is brought back inside the line'
                          : r.kind === 'gate'
                            ? 'The daemon logs a gate hit itself; there is nothing to acknowledge'
                            : 'Acknowledging a soft breach is a write, and nothing stores one'
                      }
                      className={cn(positionsUi.btn, 'cursor-not-allowed text-muted-foreground/60')}
                    >
                      {r.kind === 'hard'
                        ? 'hard — cannot ack'
                        : r.kind === 'gate'
                          ? 'gate — logged, not acked'
                          : 'Acknowledge · not stored'}
                    </button>
                  </div>
                ))
              )}
              <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.ack}</p>
            </section>

            <PositionsTier
              label="All limits"
              note="headroom is the distance to the line at today’s book — a rule with no line keeps its reading and says so"
            />
            <section className={positionsUi.panel} aria-label="All limits">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>{rows.length} rules · 5 groups</span>
                <span className="inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                  <StatusLamp lamp="gray" variant="dot" title="No line written" />
                  {noLine.length} read but have no line
                </span>
                <span className="ml-auto text-dense-meta text-muted-foreground">
                  the design edits these in the Rules engine — this page reads, never writes
                </span>
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: seven columns, the design's 1040 floor. */}
                <table data-sr-table="" className="min-w-[1040px]">
                  <colgroup>
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '21%' }} />
                    <col style={{ width: '16%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th data-sr-col="entity">Limit</th>
                      <th data-sr-col="tag">Kind</th>
                      <th data-sr-col="num">Current</th>
                      <th data-sr-col="num">Limit</th>
                      <th>Headroom</th>
                      <th data-sr-col="text">On breach</th>
                      <th data-sr-col="tag">Scope</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LIMIT_GROUPS.flatMap((group) => {
                      const inGroup = rows.filter((r) => r.group === group)
                      if (inGroup.length === 0) return []
                      return [
                        <tr key={group} className="bg-[var(--sk-raised2)]">
                          <td
                            className="text-dense-caption font-bold uppercase tracking-[0.12em] text-primary/90"
                            colSpan={7}
                          >
                            {group}
                          </td>
                        </tr>,
                        ...inGroup.map((r) => (
                          <tr key={r.key} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                            <td data-sr-col="entity" className="text-foreground">
                              {r.name}
                              {r.breached ? (
                                <span
                                  className={cn(
                                    'ml-1.5 inline-flex h-4 items-center rounded-[3px] border px-1 font-mono text-dense-micro font-bold',
                                    // The design's gate violet is the Strategy
                                    // entity hue it already had: violet-400 in dark.
                                    r.kind === 'gate'
                                      ? 'border-[var(--color-entity-strategy)]/45 text-[var(--color-entity-strategy)]'
                                      : 'border-lamp-red/45 text-lamp-red',
                                  )}
                                >
                                  {r.kind === 'gate' ? 'GATE HIT' : 'BREACH'}
                                </span>
                              ) : null}
                            </td>
                            <td data-sr-col="tag">
                              <span
                                className={cn(
                                  'inline-flex h-4 items-center rounded-[3px] border px-1.25 font-mono text-dense-micro font-bold tracking-[0.04em]',
                                  r.kind === 'hard'
                                    ? 'border-lamp-red/45 text-lamp-red'
                                    : r.kind === 'gate'
                                      ? 'border-[var(--color-entity-strategy)]/45 text-[var(--color-entity-strategy)]'
                                      : 'border-border text-muted-foreground',
                                )}
                              >
                                {r.kind.toUpperCase()}
                              </span>
                            </td>
                            <td
                              data-sr-col="num"
                              className={cn(
                                r.current == null
                                  ? 'text-muted-foreground'
                                  : r.breached
                                    ? 'text-lamp-red'
                                    : 'text-foreground',
                              )}
                            >
                              {fmtReading(r, r.current)}
                            </td>
                            <td
                              data-sr-col="num"
                              className={r.limit == null ? 'text-muted-foreground' : 'text-secondary-foreground'}
                            >
                              {r.limit == null ? 'unwritten' : fmtReading(r, r.limit)}
                            </td>
                            <td>
                              {r.use == null || r.headroom == null ? (
                                <span className="inline-flex items-start gap-1.5 whitespace-normal text-dense-meta leading-normal text-muted-foreground">
                                  <StatusLamp
                                    lamp="gray"
                                    variant="dot"
                                    title={r.current == null ? 'No reading' : 'No line'}
                                    className="mt-1 shrink-0"
                                  />
                                  {r.noReading ?? 'no line written'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-block h-1.5 w-20 shrink-0 overflow-hidden rounded-sm bg-[var(--sk-surface)]">
                                    <span
                                      className={cn(
                                        'block h-full',
                                        r.breached ? 'bg-lamp-red' : r.use > 0.8 ? 'bg-warning' : 'bg-[var(--sk-line2)]',
                                      )}
                                      style={{ width: `${Math.min(100, Math.round(r.use * 100))}%` }}
                                    />
                                  </span>
                                  <span
                                    className={cn(
                                      positionsUi.mono,
                                      'text-dense-meta',
                                      r.breached ? 'text-lamp-red' : r.use > 0.8 ? 'text-warning' : 'text-muted-foreground',
                                    )}
                                  >
                                    {r.breached ? `over by ${fmtPct0(r.use - 1)}` : `${fmtPct0(r.headroom)} left`}
                                  </span>
                                </span>
                              )}
                            </td>
                            <td data-sr-col="text" title={r.onBreach} className="text-muted-foreground">
                              {r.onBreach}
                            </td>
                            <td data-sr-col="tag" className="text-muted-foreground">
                              {r.scope}
                              {r.citedFrom ? (
                                <>
                                  {' · '}
                                  <Link to={r.citedFrom.to} className={positionsUi.link}>
                                    {r.citedFrom.label}
                                  </Link>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        )),
                      ]
                    })}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.store}</p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="Escalation">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Escalation</span>
                  <span className={positionsUi.panelTitle}>what a breach does</span>
                </header>
                {ESCALATION.map((e) => (
                  <div
                    key={e.kind}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2.5 border-b border-border/55 px-3 py-2 last:border-b-0"
                  >
                    <span className={cn(positionsUi.mono, 'text-dense-caption font-bold tracking-[0.08em]', e.tone)}>
                      {e.kind}
                    </span>
                    <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">{e.what}</span>
                  </div>
                ))}
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.rules}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Recent history">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Recent history</span>
                  <span className={positionsUi.panelTitle}>when a line was crossed</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ nothing records it
                  </DenseTag>
                </header>
                <p className="m-0 px-3 pt-2.5 pb-1.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  The useful question is not whether a line is crossed now — the table above answers that — but how long
                  it stayed crossed and what ended it. That needs a row written every time a reading passes a line.
                </p>
                {/* The design's four columns, kept: a band that drops its shape
                    stops teaching what the store would have to hold. */}
                <div className="overflow-x-auto">
                  <table data-sr-table="" className="min-w-[26rem]">
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th data-sr-col="num">When</th>
                        <th data-sr-col="entity">Limit</th>
                        <th data-sr-col="wrap">Resolution</th>
                        <th data-sr-col="num">Open for</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="whitespace-normal" colSpan={4}>
                          <span className="inline-flex items-start gap-1.5 text-dense-meta leading-normal text-muted-foreground">
                            <StatusLamp lamp="gray" variant="dot" title="No row" className="mt-1 shrink-0" />
                            No row, for the last fourteen days or any other window — an empty table here would read as a
                            clean record rather than as no record.
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className={cn(FOOT, 'm-0')}>{LIMITS_UNRECORDED.history}</p>
              </section>
            </div>

            <PositionsTier
              label="The daemon’s gate"
              note="not one of the twelve — stored parameters the trading engine would read, edited on Gates"
            />
            <section className={positionsUi.panel} aria-label="The daemon's gate">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>The gate</span>
                <span className={positionsUi.panelTitle}>
                  {gateReadings.gateName == null
                    ? 'no allocation is active'
                    : `${gateReadings.gateName} · v${gateReadings.gateVersion}`}
                </span>
                {gateReadings.paperTrade ? (
                  <DenseTag variant="warning" size="cell">
                    ⚠ PAPER TRADE
                  </DenseTag>
                ) : null}
                <Link to="/trade/rules" className={cn(positionsUi.link, 'ml-auto')}>
                  Definition · Trade › Rules →
                </Link>
              </header>
              <p className="m-0 px-3 py-2.5 text-dense-body leading-normal text-secondary-foreground text-pretty">
                {gateReadings.gateName == null ? (
                  'No allocation is active, so no gate applies and the Gate group above is empty.'
                ) : (
                  <>
                    The gate&rsquo;s lines are in the table above, in the Gate group — a gate is a limit whose scope
                    is an allocation ({gateReadings.allocationName}), enforced by the daemon before the action
                    happens rather than noticed after it, so a hit is logged and there is nothing to acknowledge.
                    Its <em>definition</em> lives in Trade › Rules; this page only reads it.
                  </>
                )}
              </p>
              <p className={cn(FOOT, 'm-0')}>
                These are the only limits in this book anybody has written down — and they bound a daemon that is
                frozen (D10)
                {gateReadings.paperTrade ? ' and configured for paper trading' : ''}. Every other group&rsquo;s line
                is missing because the store the design edits them in does not exist yet.
              </p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page holds readings
              against lines. Each reading is computed on the page named beside it, and the lines belong to a Rules
              engine that does not exist yet — which is why {noLine.length} of the {rows.length} rules have a reading
              and nothing to hold it against.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
