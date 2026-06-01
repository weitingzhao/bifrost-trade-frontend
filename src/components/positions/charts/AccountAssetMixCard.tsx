import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import {
  ASSET_MIX_CHART_COLORS,
  buildCoverageAssetPieData,
  fmtMvAbbrev,
  type AssetMixIncludeFlags,
  type CoverageAssetPieData,
} from '@/utils/positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import { DonutChart } from './DonutChart'
import { donutCenterFromDenom } from './donutCenter'
import { BubbleSwitch, IncludeExcludeToggle } from './BubbleSwitch'
import { POSITIONS_BUBBLE_SIZE } from './bubbleSwitchStyles'
import styles from '../PositionsChartsSection.module.css'

interface Props {
  accounts: IbAccountSnapshot[]
  coreStocks: LivePositionRow[]
  fixedIncomeStocks: LivePositionRow[]
  cashLikeStocks: LivePositionRow[]
  chartAccountId: string
}

function LegendItem({
  label,
  pct,
  value,
  dotClass,
  excluded,
  pctMode,
}: {
  label: string
  pct: string
  value: string
  dotClass: string
  excluded?: boolean
  pctMode: boolean
}) {
  return (
    <div
      className={cn(styles.mixLegendItem, excluded && 'opacity-50')}
      title={excluded ? 'Not included in ring denominator' : undefined}
    >
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass)} />
      <span className={styles.mixLegendItemLabel}>{label}</span>
      <span className={styles.mixLegendItemPct}>{pctMode ? pct : '—'}</span>
      <span className={styles.mixLegendItemValue} title={value}>
        {value}
      </span>
    </div>
  )
}

export function AccountAssetMixCard({
  accounts,
  coreStocks,
  fixedIncomeStocks,
  cashLikeStocks,
  chartAccountId,
}: Props) {
  const [legendMode, setLegendMode] = useState<'pct' | 'usd'>('pct')
  const [flags, setFlags] = useState<AssetMixIncludeFlags>({
    includeFi: false,
    includeCashLike: true,
    includeBp: false,
  })

  const acctId = chartAccountId as 'all' | string
  const pie: CoverageAssetPieData = buildCoverageAssetPieData(
    accounts,
    coreStocks,
    fixedIncomeStocks,
    cashLikeStocks,
    acctId,
    flags,
  )

  const center = donutCenterFromDenom(
    pie.denom,
    legendMode,
    pie.pStock,
    pie.pCash,
    pie.netLiq,
    pie.simpleCenterPct,
  )

  const pctMode = legendMode === 'pct'

  return (
    <div className={cn(styles.accountPanelBody, 'gap-2')}>
      <div className={cn(styles.chartSectionHeader, 'flex-wrap')}>
        <span className={styles.chartSectionTitle}>Asset mix</span>
        <BubbleSwitch
          size={POSITIONS_BUBBLE_SIZE}
          className="ml-auto shrink-0"
          options={[
            { value: 'pct', label: '%' },
            { value: 'usd', label: '$' },
          ]}
          value={legendMode}
          onChange={(v) => setLegendMode(v as 'pct' | 'usd')}
        />
      </div>

      <div className={styles.mixBody}>
        <div className={styles.mixChartBlock}>
          <DonutChart
            segments={[
              { label: 'Stock', value: pie.coreStockMV, color: ASSET_MIX_CHART_COLORS.stock },
              ...(pie.includeFiInChart
                ? [{ label: 'FI', value: pie.fixedIncomeMV, color: ASSET_MIX_CHART_COLORS.fi }]
                : []),
              ...(pie.includeCashLikeInChart
                ? [{ label: 'CL', value: pie.cashLikeMV, color: ASSET_MIX_CHART_COLORS.cashLike }]
                : []),
              { label: 'Cash', value: pie.cash ?? 0, color: ASSET_MIX_CHART_COLORS.cash },
              ...(pie.includeBpInChart && pie.bp
                ? [{ label: 'BP', value: pie.bp, color: ASSET_MIX_CHART_COLORS.bp }]
                : []),
            ].filter((s) => s.value > 0)}
            centerMain={center.main}
            centerSub={center.sub || undefined}
            centerVariant={center.variant}
          />
          <div className={styles.mixFilters}>
            <IncludeExcludeToggle
              layout="stacked"
              label="Fixed income in chart"
              include={flags.includeFi}
              onChange={(v) => setFlags((f) => ({ ...f, includeFi: v }))}
            />
            <IncludeExcludeToggle
              layout="stacked"
              label="Cash-like in chart"
              include={flags.includeCashLike}
              onChange={(v) => setFlags((f) => ({ ...f, includeCashLike: v }))}
            />
            <IncludeExcludeToggle
              layout="stacked"
              label="Buying power in chart"
              include={flags.includeBp}
              onChange={(v) => setFlags((f) => ({ ...f, includeBp: v }))}
            />
          </div>
        </div>

        <div className={styles.mixLegend}>
          <div className={styles.mixLegendCol}>
            <LegendItem
              label="Stock"
              dotClass="bg-[#38bdf8]"
              pct={pie.denom > 0 ? `${(pie.pStock * 100).toFixed(1)}%` : '—'}
              value={pctMode ? fmtMvAbbrev(pie.coreStockMV) : fmtUsd(pie.coreStockMV)}
              pctMode={pctMode}
            />
            <LegendItem
              label="Fixed income"
              dotClass="bg-[#4ade80]"
              pct={
                pie.includeFiInChart && pie.denom > 0 ? `${(pie.pFixedIncome * 100).toFixed(1)}%` : '—'
              }
              value={pctMode ? fmtMvAbbrev(pie.fixedIncomeMV) : fmtUsd(pie.fixedIncomeMV)}
              excluded={!pie.includeFiInChart}
              pctMode={pctMode}
            />
            <LegendItem
              label="Buying power"
              dotClass="bg-[#e879f9]"
              pct={pie.includeBpInChart && pie.denom > 0 ? `${(pie.pBp * 100).toFixed(1)}%` : '—'}
              value={pie.bp != null ? (pctMode ? fmtMvAbbrev(pie.bp) : fmtUsd(pie.bp)) : '—'}
              excluded={!pie.includeBpInChart}
              pctMode={pctMode}
            />
          </div>
          <div className={styles.mixLegendCol}>
            <LegendItem
              label="Cash-like"
              dotClass="bg-[#2dd4bf]"
              pct={
                pie.includeCashLikeInChart && pie.denom > 0
                  ? `${(pie.pCashLike * 100).toFixed(1)}%`
                  : '—'
              }
              value={pctMode ? fmtMvAbbrev(pie.cashLikeMV) : fmtUsd(pie.cashLikeMV)}
              excluded={!pie.includeCashLikeInChart}
              pctMode={pctMode}
            />
            <LegendItem
              label="Net cash"
              dotClass="bg-[#fbbf24]"
              pct={pie.denom > 0 ? `${(pie.pCash * 100).toFixed(1)}%` : '—'}
              value={
                pie.cash != null ? (pctMode ? fmtMvAbbrev(pie.cash) : fmtUsd(pie.cash)) : '—'
              }
              pctMode={pctMode}
            />
          </div>
          {pie.denom > 0 && (
            <div className={styles.mixLegendSum}>
              <span className="text-muted-foreground">Sum (chart basis)</span>
              <span className="font-mono" title={fmtUsd(pie.denom)}>
                {pctMode ? fmtMvAbbrev(pie.denom) : fmtUsd(pie.denom)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
