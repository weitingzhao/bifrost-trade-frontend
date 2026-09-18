/**
 * Review · Single trade — one closed trade, read against what it was meant to be.
 *
 * The design's shape is a diff: plan against actual, and two gaps taken from
 * it — discipline (what I did against what I said) and plan cost (what I said
 * against the best the trade printed). Both gaps need the plan and the mark
 * path, so both are marked.
 *
 * What the fills do carry is the trade itself, and it is not nothing: every
 * leg, the premium in and out, the dates, the days held, how far out it was
 * written and what share of the credit it kept. That half is drawn in full,
 * because the page is still the only place one trade can be looked at whole.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { fmtUsd, fmtPct0 } from '@/utils/positions'
import { fmtIsoDateToken } from '@/lib/format'
import { useReviewTrades } from '@/hooks/useReviewTrades'
import { REVIEW_UNRECORDED } from '@/utils/reviewTrades'

const PAGE_LEAD =
  'One closed trade, read against what it was meant to be. The trade itself comes from its own fills; the two gaps need the plan it was opened under.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** The two gaps the design takes, and what each one needs. */
const GAPS = [
  {
    key: 'discipline',
    label: 'Discipline',
    sub: 'actual against my own plan exit',
    needs: 'the planned exit — Trade Plans stores one, but no plan has ever been linked to a position',
  },
  {
    key: 'plan-cost',
    label: 'Plan quality',
    sub: 'plan exit against the best mark printed',
    needs: 'the planned exit and the best mark — the second needs a daily mark through the holding period',
  },
] as const

export default function ReviewFitPage() {
  const [params, setParams] = useSearchParams()
  const [accountFilter] = useState('all')
  const { trades, loading, error, refetch } = useReviewTrades(accountFilter)

  const wanted = params.get('trade')
  const trade = useMemo(
    () => trades.find((t) => t.contractKey === wanted) ?? trades[0] ?? null,
    [trades, wanted],
  )

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Single trade">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Review / Single trade</p>}
          title="Single trade"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {trades.length > 0 ? (
                <select
                  aria-label="Which trade"
                  className={cn(positionsUi.input, 'max-w-72')}
                  value={trade?.contractKey ?? ''}
                  onChange={(e) => setParams({ trade: e.target.value })}
                >
                  {trades.map((t) => (
                    <option key={t.contractKey} value={t.contractKey}>
                      {t.label} · {t.closedOn ? fmtIsoDateToken(t.closedOn) : '—'}
                    </option>
                  ))}
                </select>
              ) : null}
              <Link to="/review" className={positionsUi.link}>
                ← Queue
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        ) : trade == null ? (
          <p className="m-0 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-3 text-dense-meta text-muted-foreground">
            No closed trade to read. A trade reaches this page once its own fills have taken the contract flat.
          </p>
        ) : (
          <>
            <section className={positionsUi.panel} aria-label="What the trade did">
              <header className={positionsUi.panelHead}>
                <span className={cn(positionsUi.mono, 'font-bold text-[var(--color-entity-option)]')}>
                  {trade.label}
                </span>
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

            <PositionsTier label="The two gaps" note="what a P&L number cannot separate on its own" />
            <div className={positionsUi.bandGrid}>
              {GAPS.map((g) => (
                <section key={g.key} className={cn(positionsUi.panel, 'border-warning/40')} aria-label={g.label}>
                  <header className={positionsUi.panelHead}>
                    <span className={positionsUi.cap}>{g.label}</span>
                    <span className={positionsUi.panelTitle}>n/c</span>
                    <DenseTag variant="warning" size="cell">
                      ⚠ cannot be taken
                    </DenseTag>
                  </header>
                  <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    {g.sub}
                  </p>
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
                The design derives a trade&rsquo;s tags from its own series — exited early, held past plan, gave back
                the peak, slow cut. Each is a statement about <em>when</em> inside the trade, measured against either
                the planned bar or the best mark, and this side has neither. A tag guessed from the close alone would
                be an opinion presented as a derivation, which is the one thing a review page cannot afford.
              </p>
              <p className={cn(FOOT, 'm-0')}>{REVIEW_UNRECORDED.path}</p>
            </section>

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing here writes: no
              confirmation, no tag, no note. {REVIEW_UNRECORDED.reviewed}
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
