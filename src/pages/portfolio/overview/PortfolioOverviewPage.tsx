/**
 * Portfolio — the layer's own page. `/portfolio`
 *
 * Design §5a.1: Portfolio holds two folds and neither of them is Portfolio,
 * so promoting one would make the layer an alias of its own child. It gets a
 * page, and the page answers what its seven children cannot: **can today's
 * book be trusted, and where did the money come from.**
 *
 * Freshness leads, and that order is the argument. Every figure on every page
 * below inherits the staleness of the source it read, and not one of those
 * pages says so — Positions does not know when Flex last wrote, Performance
 * does not know that one account has been silent for a month. The board is
 * per account × source and oldest first, because a badge that takes the
 * freshest account hides exactly the account you need to see.
 *
 * Then who earned it, and then the three areas the layer is made of.
 *
 * It computes nothing. The freshness rows are `buildFreshnessRows`, which the
 * Accounts page draws in full; the quarter's split is
 * `computeByDayRangeTotals` and the strip under it is `buildReadingMetrics`,
 * both Performance's. All three live in `src/utils/` because more than one
 * page reads them — "the same figure computed twice" is the failure an
 * overview page invites, so the shared function comes before the page that
 * would have copied it.
 *
 * Second pass 2026-09-20 against `Portfolio Overview.dc.html`
 * (Rev 2026-09-20.19), the same day as `/risk`, and for the same reason: the
 * first build had the two readings and neither the verdict above them nor the
 * layer beneath them.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell, SectionPanel } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  EmptyState,
  denseTableNumCell,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useRowLink } from '@/hooks/useRowLink'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { usePerformanceQuery } from '@/hooks/usePerformanceQuery'
import { accountRoles, buildFreshnessRows } from '@/utils/accountsFreshnessRows'
import { computeByDayRangeTotals } from '@/utils/performanceRangeTotals'
import { buildReadingMetrics, buildScopeNote, fmtSignedUsd0 } from '@/utils/performanceReading'
import { getTimeRangeStamps } from '@/utils/ledger/performanceUtils'
import { GROWTH_LAYERS } from '@/utils/ledger/equityGrowthChart'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  STATE_BAR,
  STATE_LAMP,
  STATE_TAG,
  totalsStrip,
  trustBoard,
  trustVerdict,
} from '@/pages/portfolio/overview/portfolioOverviewModel'

// Prose keeps a measure; the page container fills the pane (§5a.3).
const LEAD =
  'Whether the book can be trusted today, and where the money came from. Freshness first — every figure downstream inherits the staleness of the source it was read from, and no page below says so on its own.'

/**
 * The three areas, each owning its own numbers.
 *
 * The design's own grouping, and the reason the layer is not just a list of
 * seven pages: Capital is the curve and its causes, Positions is what is
 * still open, Accounts is what the broker says and the two ways the book
 * changes without a trade.
 */
const AREAS = [
  {
    cap: 'Capital',
    q: 'The curve over time, the causes behind each move, the base that backs it, and what settled money says about where the ideas came from.',
    pages: [
      ['Performance', '/portfolio/performance', 'The curve over time.'],
      ['P&L Explain', '/portfolio/pnl-explain', 'The waterfall of causes.'],
      ['Backing & Model', '/portfolio/backing', 'What backs the book.'],
      ['Outcome', '/portfolio/outcome', 'Plan versus actual, by source of idea.'],
    ],
  },
  {
    cap: 'Positions',
    q: 'What is still open, judged by monitor. Tightness is stated here and sized in Risk.',
    pages: [['Positions', '/portfolio/positions', 'Open positions, judged by monitor.']],
  },
  {
    cap: 'Accounts',
    q: 'What the broker says, and the two ways the book changes without a trade.',
    pages: [
      ['Accounts', '/portfolio/accounts', 'Broker snapshot, account by account.'],
      ['Trade Ledger', '/portfolio/ledger', 'Where TWS, Flex and the journal disagree.'],
      ['Transfer & Pay', '/portfolio/transfer', 'Money in and out.'],
      ['Corporate Actions', '/portfolio/corporate-actions', 'Splits, dividends, re-strikes.'],
    ],
  },
] as const

/**
 * The layer colours are the equity curve's, not the design's.
 *
 * The prototype picks its own four, but Performance is one click away and has
 * drawn Options green and FI amber on its curve for as long as the page has
 * existed. A reader who learns a colour there and meets a different one here
 * has learned nothing, so the curve's palette wins.
 */
const LAYER_COLOR: Record<string, string> = Object.fromEntries(
  GROWTH_LAYERS.map((l) => [l.key, l.color]),
)

const TONE_INK: Record<string, string> = {
  unrealized: 'text-[var(--color-unrealized)]',
  muted: 'text-muted-foreground',
  soft: 'text-muted-foreground',
  plain: '',
  loss: 'text-destructive',
}

export default function PortfolioOverviewPage() {
  const rowLink = useRowLink()
  const status = useMonitorStatus()
  const freshness = useExecutionsFreshness()
  // The quarter ends with the month you are in, and the range machinery is
  // Performance's own — so this page and that one cannot disagree about which
  // days are in it. The anchor month is required, not optional: an empty one
  // makes the range NaN and the panel reads "no range answered", which is how
  // this was caught.
  const [anchorMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const bulk = usePerformanceBulk({
    timeRange: 'quarter',
    calendarMonth: anchorMonth,
    strategyOpportunityId: null,
    strategyInstanceId: null,
  })
  // The same range, asked of the summary endpoint, because the strip under the
  // split is Performance's reading and not a second derivation of the by-day
  // numbers above it.
  const range = useMemo(() => getTimeRangeStamps('quarter', anchorMonth), [anchorMonth])
  const perf = usePerformanceQuery(
    Number.isFinite(range.sinceTs) && Number.isFinite(range.untilTs)
      ? { since_ts: range.sinceTs, until_ts: range.untilTs }
      : null,
  )

  const roles = useMemo(
    () => accountRoles((status.data?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim())),
    [status.data],
  )
  const rows = useMemo(
    () => trustBoard(buildFreshnessRows(freshness.data?.items ?? [], roles)),
    [freshness.data, roles],
  )
  const verdict = useMemo(() => trustVerdict(rows), [rows])
  const totals = useMemo(() => computeByDayRangeTotals(bulk.data?.byDayRangeData), [bulk.data])
  const strip = useMemo(() => totalsStrip(buildReadingMetrics(perf.data)), [perf.data])
  const scopeNote = useMemo(
    () => (perf.data ? buildScopeNote(bulk.data?.byDayRangeData, perf.data) : null),
    [bulk.data, perf.data],
  )

  const optOpen = bulk.data?.optAsOf?.openUnrealized ?? null
  const earners = totals
    ? [
        {
          key: 'options',
          label: 'Options',
          value: totals.optRealized,
          // As of today, not summed over the range: it is the premium still
          // unmatched now. The range's own mark is a different figure, which is
          // why only one of the two is printed.
          sub:
            optOpen == null
              ? 'book realized'
              : `book realized · open ${fmtSignedUsd0(optOpen)} today`,
          to: '/portfolio/ledger',
        },
        {
          key: 'stocks',
          label: 'Stocks',
          value: totals.stocksRealized,
          sub: 'realized on closed lots',
          to: '/portfolio/positions',
        },
        {
          key: 'fixed_income',
          label: 'FI stream',
          value: totals.fiRealized,
          sub: 'cash flow, not P&L',
          to: '/portfolio/accounts',
        },
        {
          key: 'cash_like',
          label: 'Cash-like',
          value: totals.cashRealized,
          sub: 'sweep + accrual',
          to: '/portfolio/accounts',
        },
      ]
    : []

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="max-w-[78ch]">
        <PageHeader
          breadcrumb={<p className="text-xs font-medium text-primary/90">Portfolio</p>}
          title="Portfolio"
          titleSize="large"
          description={LEAD}
        />
      </div>

      {status.isError ? <QueryErrorAlert error={status.error} /> : null}
      {freshness.isError ? <QueryErrorAlert error={freshness.error} /> : null}

      <SectionPanel
        cap="Trust"
        title={verdict.headline}
        note="age of the newest record each source has produced"
        tone={verdict.tone}
        action={
          <Link to="/portfolio/accounts" className="text-primary hover:underline">
            Accounts →
          </Link>
        }
      >
        {freshness.isLoading ? (
          <Skeleton className="m-3 h-40 rounded-md" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No source has reported"
            description="The freshness endpoint returned no account-and-source pairs. That is not an all-clear — it means nothing said when it last wrote."
          />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0" scrollX={false}>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-6 max-w-none pr-0" />
                <DenseTableHead>Source</DenseTableHead>
                <DenseTableHead className="w-28 max-w-none">Account</DenseTableHead>
                <DenseTableHead className="w-24 max-w-none">Reading</DenseTableHead>
                <DenseTableHead className="w-[30%] max-w-none">Age</DenseTableHead>
                <DenseTableHead className="w-16 max-w-none text-right">Days</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {rows.map((r) => (
                // The whole row opens Accounts, where this pair is drawn in
                // full beside the broker's own clocks — the design's behaviour,
                // and the only one that makes a six-column row clickable at all.
                <DenseTableRow
                  key={r.key}
                  title={`${r.source} on ${r.role || 'this account'} (${r.accountId}) — ${r.meaning} Opens Accounts.`}
                  {...rowLink('/portfolio/accounts')}
                >
                  <DenseTableCell className="max-w-none pr-0">
                    <StatusLamp lamp={STATE_LAMP[r.state]} variant="dot" className="h-2.5 w-2.5" />
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none whitespace-nowrap font-mono">
                    {r.source}
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none whitespace-nowrap">
                    <span className="block text-dense-label">{r.role || '—'}</span>
                    <span className="block font-mono text-dense-micro text-muted-foreground">
                      {r.accountId}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none">
                    <DenseTag variant={STATE_TAG[r.state].variant} size="cell">
                      {STATE_TAG[r.state].label}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none">
                    {/* Measured against the oldest row on the board, not against
                        a ceiling in days — the only ceiling that never lies is
                        the worst row already here. */}
                    <span className="block h-[5px] min-w-10 overflow-hidden rounded-sm bg-muted">
                      {r.bar != null ? (
                        <span
                          className={cn('block h-full rounded-sm', STATE_BAR[r.state])}
                          style={{ width: `${Math.max(2, r.bar * 100)}%` }}
                        />
                      ) : null}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(
                      denseTableNumCell,
                      'max-w-none',
                      r.state === 'dry' && 'text-destructive',
                      r.state === 'behind' && 'text-warning',
                      r.state === 'noReading' && 'text-muted-foreground',
                    )}
                  >
                    {r.age}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
        <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          The three sources answer different questions:{' '}
          <span className="font-mono">flex_trades</span> is authoritative but late,{' '}
          <span className="font-mono">tws_client</span> is fast but not authoritative,{' '}
          <span className="font-mono">journal_closed</span> closes what neither covers. Where they
          disagree is{' '}
          <Link to="/portfolio/ledger" className="text-primary hover:underline">
            Trade Ledger
          </Link>
          's question. Computed in{' '}
          <Link to="/portfolio/accounts" className="text-primary hover:underline">
            Accounts
          </Link>
          ; this page only ranks it.
        </p>
      </SectionPanel>

      <SectionPanel
        cap="Where it came from"
        title="This quarter, by what earned it"
        note={
          <span className="font-mono">
            {[bulk.data?.optAsOf?.asOfDateStr ? `ASOF ${bulk.data.optAsOf.asOfDateStr}` : null, scopeNote]
              .filter(Boolean)
              .join(' · ')}
          </span>
        }
        action={
          <Link to="/portfolio/performance" className="text-primary hover:underline">
            Performance →
          </Link>
        }
      >
        {bulk.isLoading ? (
          <Skeleton className="m-3 h-28 rounded-md" />
        ) : totals == null ? (
          <EmptyState
            title="No range answered"
            description="Performance's by-day range returned nothing for this quarter, so there is no split to quote. An empty quarter would show four zeroes instead."
          />
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))]">
              {earners.map((e) => (
                <Link
                  key={e.key}
                  to={e.to}
                  className="flex min-w-0 flex-col gap-1 border-r border-border/60 px-3 py-2.5 last:border-r-0 hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-[7px] rounded-xs"
                      style={{ background: LAYER_COLOR[e.key] }}
                    />
                    <span className="text-dense-micro font-bold uppercase tracking-[0.12em]">
                      {e.label}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-lg font-bold tabular-nums',
                      pnlColorClass(e.value),
                    )}
                  >
                    {fmtSignedUsd0(e.value)}
                  </span>
                  <span className="font-mono text-dense-caption text-muted-foreground">{e.sub}</span>
                </Link>
              ))}
            </div>
            {/* Performance's own reading of the same range, quoted. The split
                above is by-day and these are the summary endpoint's; naming
                both is what keeps them from being read as one sum. */}
            {strip.length > 0 ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border/60 bg-background px-3 py-2">
                {strip.map((m) => (
                  <span key={m.label} className="inline-flex items-baseline gap-1.5" title={m.title}>
                    <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {m.label}
                    </span>
                    <span
                      className={cn(
                        'font-mono text-dense-label tabular-nums',
                        m.tone === 'pnl' ? pnlColorClass(m.raw ?? 0) : TONE_INK[m.tone] ?? '',
                      )}
                    >
                      {m.value}
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
            {/* The open half, named rather than folded into the total: a
                quarter's realised and its open marks are different claims, and
                adding them would make this figure disagree with Performance. */}
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              The four cells are realised inside the range; the open figure beside Options is
              unmatched premium as of today, not a sum over it. In the strip below them, Unrealized
              is every open position now rather than this quarter's, and Net cash flow is money that
              crossed the account boundary — shown to say it is not P&amp;L.{' '}
              <Link to="/portfolio/performance" className="text-primary hover:underline">
                Performance
              </Link>{' '}
              computes all of it and owns the basis behind each one.
            </p>
          </>
        )}
      </SectionPanel>

      <SectionPanel
        cap="Three areas"
        title="Each owns its own numbers"
        note="Research is the input · Trade is the process · Portfolio is the result"
      >
        {AREAS.map((a) => (
          <div
            key={a.cap}
            className="flex flex-wrap items-baseline gap-3 border-b border-border/60 px-3 py-2.5"
          >
            <span className="w-24 flex-none text-dense-micro font-bold uppercase tracking-[0.12em]">
              {a.cap}
            </span>
            <span className="min-w-0 flex-[1_1_260px] text-pretty text-dense-meta leading-relaxed text-muted-foreground">
              {a.q}
            </span>
            <span className="flex flex-[1_1_320px] flex-wrap gap-1.5">
              {a.pages.map(([label, to, tip]) => (
                <Link
                  key={to}
                  to={to}
                  title={tip}
                  className="inline-flex h-6 items-center border px-2.5 text-dense-meta hover:text-foreground mat-btn"
                >
                  {label}
                </Link>
              ))}
            </span>
          </div>
        ))}
        <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          How a play performs is{' '}
          <Link to="/review/fit" className="text-primary hover:underline">
            Review
          </Link>
          's question, not this layer's; how much risk it may carry is{' '}
          <Link to="/risk" className="text-primary hover:underline">
            Risk
          </Link>
          's.
        </p>
      </SectionPanel>
    </PageShell>
  )
}
