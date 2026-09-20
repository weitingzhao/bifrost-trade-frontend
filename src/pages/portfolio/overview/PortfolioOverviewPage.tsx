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
 * Then who earned it. Four layers, one quarter, plus the fees and the net.
 *
 * It computes nothing. The freshness rows are `buildFreshnessRows`, which the
 * Accounts page draws in full; the quarter's split is
 * `computeByDayRangeTotals`, which Performance computes for its own range.
 * Both moved to `src/utils/` when this page became their second reader —
 * "the same figure computed twice" is the failure an overview page invites,
 * so the shared function came before the page that would have copied it.
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
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useExecutionsFreshness } from '@/hooks/useExecutionsFreshness'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { accountRoles, buildFreshnessRows, type FreshnessState } from '@/utils/accountsFreshnessRows'
import { computeByDayRangeTotals } from '@/utils/performanceRangeTotals'
import { fmtUsd } from '@/utils/positions'
import { pnlColorClass } from '@/utils/dailyChange'

const LEAD =
  'Two questions none of the pages below can answer for themselves: whether today’s book can be trusted, and who earned this quarter. Freshness leads because every figure under it inherits the staleness of the source it read, and no page says so on its own. Nothing here is computed — Accounts owns the freshness rows, Performance owns the split.'

/** The state's meaning carries the colour — never the row's position. */
const STATE_TAG: Record<FreshnessState, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  current: { label: 'CURRENT', variant: 'success' },
  behind: { label: 'LAGGING', variant: 'warning' },
  dry: { label: 'STALE', variant: 'danger' },
  noReading: { label: 'NO READING', variant: 'neutral' },
}

/** Oldest first: the board exists to surface the row a badge would hide. */
const STATE_ORDER: Record<FreshnessState, number> = { dry: 0, behind: 1, noReading: 2, current: 3 }

export default function PortfolioOverviewPage() {
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

  const roles = useMemo(
    () => accountRoles((status.data?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim())),
    [status.data],
  )
  const rows = useMemo(
    () =>
      buildFreshnessRows(freshness.data?.items ?? [], roles)
        .slice()
        .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]),
    [freshness.data, roles],
  )
  const totals = useMemo(() => computeByDayRangeTotals(bulk.data?.byDayRangeData), [bulk.data])

  const worst = rows[0] ?? null
  const layers = totals
    ? [
        { key: 'options', label: 'Options', value: totals.optRealized, to: '/portfolio/ledger' },
        { key: 'stocks', label: 'Stocks', value: totals.stocksRealized, to: '/portfolio/positions' },
        { key: 'fi', label: 'FI stream', value: totals.fiRealized, to: '/portfolio/positions' },
        { key: 'cash', label: 'Cash-like', value: totals.cashRealized, to: '/portfolio/positions' },
      ]
    : []
  const realised = layers.reduce((a, l) => a + l.value, 0)

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Portfolio</p>}
        title="Portfolio"
        titleSize="large"
        description={LEAD}
      />

      {status.isError ? <QueryErrorAlert error={status.error} /> : null}
      {freshness.isError ? <QueryErrorAlert error={freshness.error} /> : null}

      <SectionPanel
        cap="Can it be trusted"
        title="every account × source, oldest first"
        note={
          worst != null
            ? `${rows.length} pairs · oldest ${worst.accountId} · ${worst.source} at ${worst.age}`
            : undefined
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
                <DenseTableHead>Account</DenseTableHead>
                <DenseTableHead>Role</DenseTableHead>
                <DenseTableHead>Source</DenseTableHead>
                <DenseTableHead className="text-right">Newest</DenseTableHead>
                <DenseTableHead>Reading</DenseTableHead>
                <DenseTableHead>What it means</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {rows.map((r) => (
                <DenseTableRow key={r.key}>
                  <DenseTableCell className="font-mono">{r.accountId}</DenseTableCell>
                  <DenseTableCell className="text-muted-foreground">{r.role}</DenseTableCell>
                  <DenseTableCell className="font-mono text-muted-foreground">{r.source}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>{r.age}</DenseTableCell>
                  <DenseTableCell>
                    <DenseTag variant={STATE_TAG[r.state].variant} size="cell">
                      {STATE_TAG[r.state].label}
                    </DenseTag>
                  </DenseTableCell>
                  <DenseTableCell className="text-muted-foreground">{r.meaning}</DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
        <p className="border-t border-border/60 px-3 py-1.5 text-dense-meta text-muted-foreground">
          Drawn in full, with the broker clocks beside them, on{' '}
          <Link to="/portfolio/accounts" className="text-primary hover:underline">
            Accounts
          </Link>
          . These rows are that page's, read here rather than rebuilt.
        </p>
      </SectionPanel>

      <SectionPanel
        cap="Where it came from"
        title="this quarter, by who earned it"
        note={bulk.data != null ? `realised · quarter to ${anchorMonth}` : undefined}
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
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-5">
              {layers.map((l) => (
                <Link
                  key={l.key}
                  to={l.to}
                  className="flex flex-col gap-0.5 bg-card px-3 py-2 transition-colors hover:bg-secondary"
                >
                  <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                    {l.label}
                  </span>
                  <span className={cn('font-mono text-dense-body font-semibold tabular-nums', pnlColorClass(l.value))}>
                    {fmtUsd(l.value)}
                  </span>
                </Link>
              ))}
              <div className="flex flex-col gap-0.5 bg-secondary/40 px-3 py-2">
                <span className="text-dense-micro uppercase tracking-wide text-muted-foreground">
                  Realised
                </span>
                <span className={cn('font-mono text-dense-body font-semibold tabular-nums', pnlColorClass(realised))}>
                  {fmtUsd(realised)}
                </span>
              </div>
            </div>
            {/* The open half, named rather than folded into the total: a
                quarter's realised and its open marks are different claims, and
                adding them would make this figure disagree with Performance. */}
            <p className="border-t border-border/60 px-3 py-1.5 text-dense-meta text-muted-foreground">
              Realised only. Options carry {fmtUsd(totals.optUnrealized)} still open on the
              quarter's fills, which is a mark rather than money —{' '}
              <Link to="/portfolio/performance" className="text-primary hover:underline">
                Performance
              </Link>{' '}
              computes this split and owns the basis behind it.
            </p>
          </>
        )}
      </SectionPanel>
    </PageShell>
  )
}
