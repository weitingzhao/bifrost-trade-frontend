/**
 * One donut: what the accounts in scope are made of.
 *
 * This is the Account asset mix ring the restructure removed, brought back
 * without the parts that were not about the mix: the Include / Exclude toggles
 * per slice, and the chart's own account switch. The page already decides which
 * accounts arrive (HOST / Secondary scope); the ring shows everything it is
 * given, every slice on, and lets the legend do the reading.
 *
 * The slices are the ones the Owner read before: Stock, Fixed income,
 * Cash-like, Net cash, Buying power. Fixed income is the income ETFs (PFF,
 * BALI, BINC). Owner decision, 2026-09-05: they count via buying power — the
 * broker's own haircut — not as cash for put cover, and the legend says so.
 *
 * Missing is not zero. A broker summary without TotalCashValue or BuyingPower
 * leaves the slice out of the ring and names it on a warning line; a holding
 * with no price is counted on a warning line too, because the helper this reads
 * falls back to cost and the ring would otherwise look complete. Net liq in the
 * centre is shown only when every account in scope reported it — a partial sum
 * over accounts reads as a smaller book, which is the wrong kind of wrong.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DenseTag, DEFAULT_SEGMENT_SIZE, SegmentControl } from '@/components/data-display'
import { fmtUsd } from '@/utils/positions'
import { summaryNum } from '@/utils/marginPressure'
import {
  ASSET_MIX_CHART_COLORS,
  buildCoverageAssetPieData,
  fmtMvAbbrev,
  type AssetMixIncludeFlags,
  type ChartDonutSegment,
} from '@/utils/positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import { DonutChart } from './DonutChart'
import { ChartLegend } from './ChartLegend'
import styles from '../PositionsChartsSection.module.css'

export interface AssetMixCardProps {
  accounts: readonly IbAccountSnapshot[]
  coreStocks: readonly LivePositionRow[]
  incomeEtfs: readonly LivePositionRow[]
  cashLike: readonly LivePositionRow[]
}

type LegendMode = 'pct' | 'usd'

/** No toggles on the card, so every slice the helper knows is always on. */
const ALL_ON: AssetMixIncludeFlags = { includeFi: true, includeCashLike: true, includeBp: true }

/** Owner's wording for how the income ETFs are counted — shown, not tucked in a tooltip. */
const FIXED_INCOME_NOTE = 'via buying power, not as cash'

function hasPrice(row: LivePositionRow): boolean {
  return row.price != null && Number.isFinite(Number(row.price))
}

function countUnpriced(...groups: readonly (readonly LivePositionRow[])[]): number {
  let n = 0
  for (const rows of groups) for (const r of rows) if (!hasPrice(r)) n += 1
  return n
}

function fmtSlice(value: number, mode: LegendMode): string {
  return mode === 'pct' ? fmtMvAbbrev(value) : fmtUsd(value)
}

export function AssetMixCard({ accounts, coreStocks, incomeEtfs, cashLike }: AssetMixCardProps) {
  const [legendMode, setLegendMode] = useState<LegendMode>('pct')

  if (accounts.length === 0) {
    return <p className="text-dense-body text-muted-foreground">No accounts in scope.</p>
  }

  const pie = buildCoverageAssetPieData(
    [...accounts],
    [...coreStocks],
    [...incomeEtfs],
    [...cashLike],
    'all',
    ALL_ON
  )

  // The helper sums NetLiquidation with 0 for accounts that did not report it,
  // so the count of silent accounts has to be taken here to know the sum is whole.
  const netLiqMissing = accounts.filter(
    (a) => summaryNum(a.summary, 'NetLiquidation') == null
  ).length
  const netLiq = netLiqMissing === 0 ? pie.netLiq : null
  const unpriced = countUnpriced(coreStocks, incomeEtfs, cashLike)

  const segments: ChartDonutSegment[] = [
    { label: 'Stock', value: pie.coreStockMV, color: ASSET_MIX_CHART_COLORS.stock },
    {
      label: 'Fixed income',
      value: pie.fixedIncomeMV,
      color: ASSET_MIX_CHART_COLORS.fi,
      marketValueTooltip: `Income ETFs (PFF, BALI, BINC) — ${FIXED_INCOME_NOTE}.`,
    },
    { label: 'Cash-like', value: pie.cashLikeMV, color: ASSET_MIX_CHART_COLORS.cashLike },
    ...(pie.cash != null
      ? [{ label: 'Net cash', value: pie.cash, color: ASSET_MIX_CHART_COLORS.cash }]
      : []),
    ...(pie.bp != null
      ? [{ label: 'Buying power', value: pie.bp, color: ASSET_MIX_CHART_COLORS.bp }]
      : []),
  ]
  // The ring cannot draw a negative slice; the legend keeps the signed value.
  const ringSegments = segments.map((s) => ({ ...s, value: Math.max(0, s.value) }))

  const warnings: { key: string; text: string; title: string }[] = []
  if (netLiqMissing > 0) {
    warnings.push({
      key: 'netliq',
      text:
        accounts.length > 1
          ? `Net liq n/a — ${netLiqMissing} of ${accounts.length} accounts unreported`
          : 'Net liq n/a',
      title: 'NetLiquidation is missing from the broker summary. The centre is not a partial sum.',
    })
  }
  if (pie.cash == null) {
    warnings.push({
      key: 'cash',
      text: 'Net cash n/a',
      title:
        'TotalCashValue is missing from the broker summary. The ring omits it; it is not zero.',
    })
  }
  if (pie.bp == null) {
    warnings.push({
      key: 'bp',
      text: 'Buying power n/a',
      title: 'BuyingPower is missing from the broker summary. The ring omits it; it is not zero.',
    })
  }
  if (unpriced > 0) {
    warnings.push({
      key: 'unpriced',
      text: `${unpriced} unpriced`,
      title:
        'Holdings with no price. They are carried at cost, or left out when there is no cost either, so the ring understates them by an unknown amount.',
    })
  }

  return (
    <div className="flex min-w-0 flex-col gap-2" aria-label="Account asset mix">
      <div className="flex items-center justify-between gap-2">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          Asset mix
        </span>
        <SegmentControl
          size={DEFAULT_SEGMENT_SIZE}
          className="shrink-0"
          ariaLabel="Legend values"
          options={[
            { value: 'pct', label: '%' },
            { value: 'usd', label: '$' },
          ]}
          value={legendMode}
          onChange={(v) => setLegendMode(v as LegendMode)}
        />
      </div>

      <div className={cn(styles.donutRow, styles.donutRowStart)}>
        <DonutChart
          segments={ringSegments}
          centerMain={netLiq != null ? fmtMvAbbrev(netLiq) : '—'}
          centerSub={pie.bp != null ? `BP ${fmtMvAbbrev(pie.bp)}` : 'BP n/a'}
          centerVariant="netliq"
          size={132}
        />
        <div className="flex min-w-0 flex-col gap-1">
          <ChartLegend segments={segments} total={pie.denom} mode={legendMode} layout="grid2" />
          {pie.denom > 0 ? (
            <div
              className="flex items-center justify-between gap-2 border-t border-border/60 pt-1 text-dense-label"
              title="Sum of the slices drawn. Buying power is a capacity, not a holding, so this is larger than net liq."
            >
              <span className="text-muted-foreground">Ring basis</span>
              <span className="font-mono tabular-nums text-foreground">
                {fmtSlice(pie.denom, legendMode)}
              </span>
            </div>
          ) : null}
          <p className="text-dense-caption leading-tight text-muted-foreground">
            Fixed income counts {FIXED_INCOME_NOTE}.
          </p>
          {warnings.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1" role="status">
              {warnings.map((w) => (
                <DenseTag key={w.key} variant="warning" size="cell" title={w.title}>
                  {w.text}
                </DenseTag>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
