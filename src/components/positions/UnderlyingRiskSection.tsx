/**
 * Capital at risk and delta, on the page where the positions are.
 *
 * These numbers were already being computed — /portfolio/model-analysis returns
 * capital at risk, annualised return on it, and delta per underlying, and the
 * account rollups on top. They lived only on the Model Analysis page, so judging
 * whether a position was worth its capital meant leaving the position.
 *
 * Deliberately *not* folded into the instance rows above. The endpoint's grain is
 * the underlying across the whole account; two instances on the same symbol share
 * one row of it. Printing that row's CAR on each instance would double-count it
 * and read as per-instance — a number that looks precise and is wrong. So the
 * grain is kept as it is, and labelled.
 */
import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  GrandTotalRow,
  denseTableNumCell,
} from '@/components/data-display'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { fetchModelAnalysis } from '@/api/portfolio'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fmtUsd } from '@/utils/positions'
import { fmtModelDelta, fmtRatioAsPct } from '@/utils/modelAnalysisFormat'
import { pnlColorClass } from '@/utils/dailyChange'
import type { ModelAnalysisResponse, UnderlyingEntry } from '@/types/modelAnalysis'
import { instancePanel } from './instancePanelClasses'
import type { GreeksRollup } from '@/hooks/useOptionGreeks'

const SECTION_TOOLTIP =
  'From /portfolio/model-analysis — the same source as the Model Analysis page. Rows are per underlying across every instance on that symbol, not per instance, so a symbol traded by two strategies appears once. Delta is the only Greek this endpoint returns.'

const GREEKS_TOOLTIP =
  'Position theta, vega and delta from the market-data warehouse (Polygon), summed across the option legs held. Theta is dollars a day: positive means the book earns time decay. These are end-of-day values standing beside live prices — the date they were captured is printed, and a * means at least one leg had no vendor row and is missing from the totals.'

const CAR_TOOLTIP =
  'Capital at risk: the most this underlying can cost you, from the payoff model — capped at the position\'s worst case, so on appreciated stock it is well below what the position ties up. The returns beside it divide by that committed capital instead. ∞ marks a leg whose loss is unbounded.'

const ROC_TOOLTIP =
  'Annualised return, measured forward over the capital the position commits. Static is the premium alone — kept if nothing is assigned, which is the base case a premium seller lives on. If-called is every short call assigned at its strike, from today\'s price. Both divide by what closing the position would free up, not by what the stock once cost.'

interface Row {
  accountId: string
  entry: UnderlyingEntry
}

export function UnderlyingRiskSection({
  accountIds,
  greeks,
  open,
  onToggle,
}: {
  accountIds: string[]
  /** Vendor Greeks for the option legs held — see useOptionGreeks. */
  greeks: GreeksRollup
  /** Controlled by the page so an alarm chip can open it. */
  open: boolean
  onToggle: () => void
}) {
  const ids = useMemo(
    () => Array.from(new Set(accountIds.map((a) => a.trim()).filter(Boolean))).sort(),
    [accountIds],
  )

  const results = useQueries({
    queries: ids.map((accountId) => ({
      queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, accountId],
      queryFn: () => fetchModelAnalysis(accountId),
      enabled: Boolean(accountId),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const loaded = results
    .map((r, i) => ({ accountId: ids[i] as string, data: r.data }))
    .filter((r): r is { accountId: string; data: ModelAnalysisResponse } => Boolean(r.data))

  // The endpoint returns every holding, so plain stock sits alongside the option
  // book. Capital at risk first — that is what this section exists to answer —
  // and stock-only rows keep their place below rather than being filtered out,
  // because their delta is still part of the portfolio's delta.
  const rows: Row[] = loaded
    .flatMap(({ accountId, data }) => data.per_underlying.map((entry) => ({ accountId, entry })))
    .sort((a, b) => carRank(b.entry) - carRank(a.entry))

  // Only the additive quantities. A weighted return across accounts is not a
  // sum, and inventing one here would make the total row a different metric
  // from every row above it.
  const totals = sumAdditive(rows)

  if (ids.length === 0) return null
  if (!isLoading && rows.length === 0) return null

  const multiAccount = ids.length > 1

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>
          <span className="inline-flex items-center gap-1.5">
            Capital &amp; delta by underlying
            <InfoTooltip text={SECTION_TOOLTIP} />
          </span>
        </CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          {/* Capital at risk is what the section is named for; without it here,
              collapsing hides the answer instead of summarising it. */}
          {greeks.matched > 0 ? (
            <span className="text-xs text-muted-foreground" title={GREEKS_TOOLTIP}>
              θ{' '}
              <strong className={greeks.theta >= 0 ? 'text-profit' : 'text-loss'}>
                {greeks.theta >= 0 ? '+' : ''}
                {greeks.theta.toFixed(0)}
              </strong>
              /day · ν {greeks.vega.toFixed(0)} · Δ {greeks.delta.toFixed(0)}
              {greeks.partial ? <span className="text-warning">*</span> : null}
              {greeks.newestAsOf ? (
                <span className="text-muted-foreground"> @{greeks.newestAsOf.slice(0, 10)}</span>
              ) : null}
              {greeks.staleLegs > 0 ? (
                <span
                  className="text-warning"
                  title={`${greeks.staleLegs} leg(s) last captured ${greeks.oldestAsOf?.slice(0, 10)} — the warehouse has not refreshed them since, so their contribution to these totals is that old.`}
                >
                  {' '}
                  · {greeks.staleLegs} @{greeks.oldestAsOf?.slice(0, 10)}
                </span>
              ) : null}
            </span>
          ) : null}
          {rows.length > 0 ? (
            <span className="text-xs text-muted-foreground" title={CAR_TOOLTIP}>
              CAR{' '}
              <strong className="text-foreground">{fmtUsd(totals.car)}</strong>
              {totals.carUnbounded ? (
                <span className="text-loss" title="One or more legs have unbounded loss.">
                  {' '}
                  + ∞
                </span>
              ) : null}
              {totals.nakedCalls > 0 ? (
                <span className="text-loss"> · {totals.nakedCalls} naked C</span>
              ) : null}
            </span>
          ) : null}
          {loaded.map(({ accountId, data }) => {
            // The rollup carries no degraded flag of its own, but it is the sum
            // of rows that do. A total built from incomplete parts is incomplete,
            // and reading it as portfolio delta is the mistake worth preventing.
            const degradedCount = data.per_underlying.filter((u) => u.greeks.degraded).length
            return (
              <span key={accountId} className="text-xs text-muted-foreground">
                <span className="font-mono">{accountId}</span>{' '}
                <span
                  title={
                    degradedCount > 0
                      ? `Portfolio delta from the account rollup — incomplete: ${degradedCount} underlying(s) had option legs the model could not price, so their option delta is missing from this sum.`
                      : 'Portfolio delta / delta dollars from the account rollup.'
                  }
                >
                  Δ {fmtModelDelta(data.account_rollups.total_delta)}
                  {degradedCount > 0 ? <span className="text-warning">*</span> : null} ·{' '}
                  {fmtUsd(data.account_rollups.total_delta_dollars)}
                </span>{' '}
                <span title="Weighted annualised return on capital at risk, account level.">
                  · ROC {fmtRatioAsPct(data.account_rollups.weighted_annualized_return)}
                </span>
              </span>
            )
          })}
          {isLoading ? <span className="text-xs text-muted-foreground">loading…</span> : null}
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open ? (
        <CollapsibleGroupBody>
          <div className={instancePanel.tableWrap}>
            <DenseDataTable tableClassName="min-w-[44rem]">
              <DenseTableHeader>
                <DenseTableHeadRow>
                  <DenseTableHead>Symbol</DenseTableHead>
                  {multiAccount ? <DenseTableHead>Acct</DenseTableHead> : null}
                  <DenseTableHead align="right">Spot</DenseTableHead>
                  <DenseTableHead align="right" title={CAR_TOOLTIP}>
                    CAR
                  </DenseTableHead>
                  <DenseTableHead align="right" title={ROC_TOOLTIP}>
                    Static / if-called
                  </DenseTableHead>
                  <DenseTableHead align="right" title="Position delta and its dollar equivalent.">
                    Δ / Δ$
                  </DenseTableHead>
                  <DenseTableHead title="Short calls not offset by long calls or stock, across every instance on this symbol.">
                    Naked C
                  </DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {rows.map(({ accountId, entry }) => (
                  <UnderlyingRow
                    key={`${accountId}-${entry.symbol}`}
                    accountId={accountId}
                    entry={entry}
                    showAccount={multiAccount}
                  />
                ))}
                <GrandTotalRow
                  labelColSpan={multiAccount ? 3 : 2}
                  label={`Total (${rows.length} ${rows.length === 1 ? 'underlying' : 'underlyings'})`}
                >
                  <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
                    {fmtUsd(totals.car)}
                    {totals.carUnbounded ? (
                      <span className="text-loss" title="One or more legs have unbounded loss; excluded from this sum.">
                        {' '}
                        + ∞
                      </span>
                    ) : null}
                  </DenseTableCell>
                  <DenseTableCell
                    className={cn(denseTableNumCell, 'text-xs text-muted-foreground')}
                    title="Not summable — a weighted return across underlyings is not the sum of them."
                  >
                    —
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-xs font-semibold')}>
                    {fmtUsd(totals.deltaDollars)}
                  </DenseTableCell>
                  <DenseTableCell className="text-xs">
                    {totals.nakedCalls > 0 ? (
                      <DenseTag variant="danger" size="cell">
                        {totals.nakedCalls}
                      </DenseTag>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </DenseTableCell>
                </GrandTotalRow>
              </DenseTableBody>
            </DenseDataTable>
            <p className="mt-1 text-dense-caption text-muted-foreground">
              Rows are per underlying across all instances on that symbol — not per instance. The
              CAR and Δ columns come from /portfolio/model-analysis; its option legs are dropped when
              it cannot price them, which is what the Δ * marks. The θ / ν / Δ in the header come from
              the market-data warehouse instead — end-of-day, stamped with their capture date.
            </p>
          </div>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}

/** Unbounded loss outranks any finite CAR; no CAR at all sorts last. */
function carRank(entry: UnderlyingEntry): number {
  if (entry.capital_at_risk.has_unbounded) return Number.MAX_SAFE_INTEGER
  return entry.capital_at_risk.effective ?? 0
}

function sumAdditive(rows: readonly Row[]) {
  let car = 0
  let carUnbounded = false
  let deltaDollars = 0
  let nakedCalls = 0
  for (const { entry } of rows) {
    if (entry.capital_at_risk.has_unbounded) carUnbounded = true
    else car += entry.capital_at_risk.effective ?? 0
    deltaDollars += entry.greeks.delta_dollars ?? 0
    nakedCalls += entry.naked_short_call_contracts
  }
  return { car, carUnbounded, deltaDollars, nakedCalls }
}

function UnderlyingRow({
  accountId,
  entry,
  showAccount,
}: {
  accountId: string
  entry: UnderlyingEntry
  showAccount: boolean
}) {
  const car = entry.capital_at_risk
  const degraded = entry.greeks.degraded

  return (
    <DenseTableRow className="[&_td]:whitespace-nowrap [&_td]:text-dense-body">
      <DenseTableCell className="font-mono text-xs font-semibold">{entry.symbol}</DenseTableCell>
      {showAccount ? (
        <DenseTableCell className="font-mono text-xs text-muted-foreground">
          {accountId}
        </DenseTableCell>
      ) : null}
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        {entry.spot != null ? entry.spot.toFixed(2) : '—'}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')} title={car.explain}>
        {car.has_unbounded ? (
          <span className="text-loss">∞</span>
        ) : (
          fmtUsd(car.effective)
        )}
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        <span className="flex flex-col items-end leading-tight" title={ROC_TOOLTIP}>
          <span className={pnlColorClass(entry.annualized_static_return ?? null)}>
            {fmtRatioAsPct(entry.annualized_static_return ?? null)}
          </span>
          <span className="text-dense-caption text-muted-foreground">
            {fmtRatioAsPct(entry.annualized_return_on_car)} called
          </span>
        </span>
      </DenseTableCell>
      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
        <span
          className="flex flex-col items-end leading-tight"
          title={
            degraded
              ? entry.greeks.delta == null
                ? 'No delta — the model could not price this underlying’s option legs.'
                : `Delta is incomplete — ${entry.greeks.degraded_leg_count ?? '?'} option leg(s) could not be modelled, so this is the rest of the position only.`
              : undefined
          }
        >
          <span className="font-mono tabular-nums">
            {fmtModelDelta(entry.greeks.delta)}
            {degraded && entry.greeks.delta != null ? (
              <span className="text-warning">*</span>
            ) : null}
          </span>
          <span className="text-dense-caption text-muted-foreground">
            {fmtUsd(entry.greeks.delta_dollars)}
          </span>
        </span>
      </DenseTableCell>
      <DenseTableCell className="text-xs">
        {entry.naked_short_call_contracts > 0 ? (
          <DenseTag variant="danger" size="cell">
            {entry.naked_short_call_contracts}
          </DenseTag>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </DenseTableCell>
    </DenseTableRow>
  )
}
