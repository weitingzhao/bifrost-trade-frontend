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
import { HeroCard, HeroRow, PageHead, PageShell, SectionHead } from '@/components/layout'
import { ViewState } from '@bifrost/ui'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { readingToneClass, splitReading } from '@/utils/performanceHeroes'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
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
  STATE_INK,
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
 * The prototype picks its own four, but Performance is one click away and a
 * reader who learns a colour there and meets a different one here has learned
 * nothing, so the curve's palette wins. Since design Rev .77 that palette is
 * the entity inks for Options and Stocks and two neutral greys for FI and
 * Cash-like; this page follows it by reading the same definitions.
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

  // §16.2: the hero row leads with the oldest source — the one that decides
  // how much of this layer may be believed — then Performance's four P&L
  // totals, quoted. Commissions and the cash flow stay as the strip under the
  // earners. Nothing is recomputed: `splitReading` is Performance's own split.
  const { heroes } = splitReading(buildReadingMetrics(perf.data), 'this quarter')
  const totalsLine = strip.filter((m) => m.label === 'Commissions' || m.label === 'Net cash flow')
  const worst = rows.find((r) => r.days != null) ?? null
  const freshState = sourceState(freshness)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead title="Portfolio" info={LEAD} />

      {status.isError ? <QueryErrorAlert error={status.error} /> : null}

      {freshState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh source freshness"
          detail={staleDetail(freshness, 'a source that went quiet since then is not shown.')}
          onAction={() => void freshness.refetch()}
        />
      ) : null}

      <HeroRow basis={200} label="The layer at a glance">
        <HeroCard
          label="Oldest source"
          value={worst == null ? '—' : `${worst.days?.toFixed(1)}d`}
          valueClassName={worst == null ? 'text-muted-foreground' : STATE_INK[worst.state]}
          sub={freshness.isLoading ? 'Loading…' : verdict.headline}
          state={verdict.tone === 'danger' ? 'danger' : verdict.tone === 'warning' ? 'warn' : null}
          title={
            worst == null
              ? undefined
              : `${worst.source} on ${worst.role || 'this account'} (${worst.accountId}) — newest record is ${worst.days?.toFixed(1)} days old`
          }
        />
        {heroes.map((h) => (
          <HeroCard
            key={h.label}
            label={h.label}
            value={h.value}
            valueClassName={readingToneClass(h.tone, h.raw)}
            sub={h.sub}
            title={h.title}
          />
        ))}
      </HeroRow>

      {/* §16.4 with its explanation in the title, not a sentence of it lost:
          what the three sources are for, and that Accounts computes it. */}
      <SectionHead
        note="Age of the newest record each source has produced. The three sources answer different questions: flex_trades is authoritative but late, tws_client is fast but not authoritative, journal_closed closes what neither covers. Computed in Accounts; this page only ranks it."
        meta={
          <span className="flex items-baseline gap-2.5">
            <Link
              to="/portfolio/ledger"
              title="Where the sources disagree is Trade Ledger’s question"
              className="text-dense-label text-primary no-underline hover:underline"
            >
              Trade Ledger →
            </Link>
            <Link to="/portfolio/accounts" className="text-dense-label text-primary no-underline hover:underline">
              Accounts →
            </Link>
          </span>
        }
      >
        Trust
      </SectionHead>
      <section className="overflow-hidden border mat-card">
        {freshState === 'loading' ? (
          <ViewState kind="loading" title="Loading source freshness" rows={5} cols={6} />
        ) : freshState === 'failed' ? (
          <ViewState
            kind="failed"
            title="Couldn’t load source freshness"
            detail={failedDetail(freshness, 'No source was judged — this is not the same as every source being current.')}
            onAction={() => void freshness.refetch()}
          />
        ) : rows.length === 0 ? (
          <ViewState
            kind="empty"
            title="No source has reported"
            detail="The freshness endpoint returned no account-and-source pairs. That is not an all-clear — it means nothing said when it last wrote."
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
                  <DenseTableCell className="max-w-none whitespace-nowrap font-mono text-dense-body text-foreground">
                    {r.source}
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none whitespace-nowrap">
                    <span className="block text-dense-label">{r.role || '—'}</span>
                    <span className="block font-mono text-dense-caption text-muted-foreground">
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
                    <span className="block h-1.5 min-w-10 overflow-hidden rounded bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                      {r.bar != null ? (
                        <span
                          className={cn('block h-full', STATE_BAR[r.state])}
                          style={{ width: `${Math.max(2, r.bar * 100)}%` }}
                        />
                      ) : null}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'max-w-none text-dense-body', STATE_INK[r.state])}>
                    {r.age}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </section>

      <SectionHead
        note="This quarter, by what earned it. The four cells are realised inside the range; the open figure beside Options is unmatched premium as of today, not a sum over it. Unrealized above is every open position now rather than this quarter’s, and Net cash flow is money that crossed the account boundary — shown to say it is not P&L. Performance computes all of it and owns the basis behind each one."
        meta={
          <span className="flex items-baseline gap-2.5">
            <span className="font-mono tabular-nums">
              {[bulk.data?.optAsOf?.asOfDateStr ? `ASOF ${bulk.data.optAsOf.asOfDateStr}` : null, scopeNote]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <Link to="/portfolio/performance" className="text-dense-label text-primary no-underline hover:underline">
              Performance →
            </Link>
          </span>
        }
      >
        Where it came from
      </SectionHead>
      {bulk.isLoading ? (
        <section className="overflow-hidden border mat-card">
          <ViewState kind="loading" title="Loading the quarter" rows={2} cols={4} />
        </section>
      ) : totals == null ? (
        <section className="overflow-hidden border mat-card">
          <ViewState
            kind="empty"
            title="No range answered"
            detail="Performance's by-day range returned nothing for this quarter, so there is no split to quote. An empty quarter would show four zeroes instead."
          />
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch gap-2">
            {earners.map((e) => (
              <Link
                key={e.key}
                to={e.to}
                className="flex min-w-0 flex-[1_1_180px] flex-col gap-1 rounded-[var(--card-radius)] border border-transparent bg-[var(--card-fill)] px-3 py-2.5 text-foreground no-underline transition-[background-color,translate] duration-150 hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)] hover:text-foreground motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-xs" style={{ background: LAYER_COLOR[e.key] }} />
                  <span className="text-dense-label font-semibold text-[var(--sk-soft)]">{e.label}</span>
                </span>
                <span className={cn('font-mono text-xl font-bold tabular-nums', pnlColorClass(e.value))}>
                  {fmtSignedUsd0(e.value)}
                </span>
                <span className="font-mono text-dense-meta text-muted-foreground">{e.sub}</span>
              </Link>
            ))}
          </div>
          {/* Performance's own reading of the same range, quoted: the two
              figures the hero row did not take. */}
          {totalsLine.length > 0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-0.5">
              {totalsLine.map((m) => (
                <span key={m.label} className="inline-flex items-baseline gap-1.5" title={m.title}>
                  <span className="text-dense-meta font-semibold text-muted-foreground">{m.label}</span>
                  <span
                    className={cn(
                      'font-mono text-dense-label tabular-nums',
                      m.tone === 'pnl' ? pnlColorClass(m.raw ?? 0) : TONE_INK[m.tone] ?? '',
                    )}
                  >
                    {m.label === 'Net cash flow' ? `${m.value} · excluded from return` : m.value}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}

      <SectionHead
        note="Research is the input · Trade is the process · Portfolio is the result"
        meta={
          <span className="flex items-baseline gap-2.5">
            <Link
              to="/review/fit"
              title="How a play performs is Review’s question, not this layer’s"
              className="text-dense-label text-primary no-underline hover:underline"
            >
              Review →
            </Link>
            <Link
              to="/risk"
              title="How much risk it may carry is Risk’s question"
              className="text-dense-label text-primary no-underline hover:underline"
            >
              Risk →
            </Link>
          </span>
        }
      >
        Each area owns its own numbers
      </SectionHead>
      <section className="overflow-hidden border mat-card">
        {AREAS.map((a) => (
          <div key={a.cap} className="flex flex-wrap items-baseline gap-3 border-b px-3 py-2.5 last:border-b-0">
            <span className="w-24 flex-none text-dense-body font-semibold text-foreground">{a.cap}</span>
            <span className="min-w-0 flex-[1_1_260px] text-pretty text-dense-label leading-relaxed text-[var(--sk-mute2)]">
              {a.q}
            </span>
            <span className="flex flex-[1_1_320px] flex-wrap gap-1.5">
              {a.pages.map(([label, to, tip]) => (
                <Link
                  key={to}
                  to={to}
                  title={tip}
                  className="inline-flex h-[26px] items-center rounded-[var(--control-radius)] bg-[var(--control-fill)] px-2.5 text-dense-label text-[var(--sk-soft)] no-underline hover:bg-[var(--control-fill-hover)] hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </span>
          </div>
        ))}
      </section>
    </PageShell>
  )
}
