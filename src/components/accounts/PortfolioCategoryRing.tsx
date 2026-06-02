import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import {
  ASSET_MIX_CHART_COLORS,
  buildPortfolioCategoryPieData,
} from '@/utils/positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { IncludeExcludeToggle } from '@/components/data-display'
import { DonutChart } from '@/components/positions/charts/DonutChart'
import type { DonutCenterVariant } from '@/components/positions/charts/DonutChart'
import styles from '@/components/positions/PositionsChartsSection.module.css'

const TOOLTIP =
  'Stock = core STK (same ledger rules as Positions: not Fixed income or Cash-like), including SEPA, Option Pool, and other equity categories. Cash + Cash-like = IB TotalCashValue plus cash-like STK market value. Fixed income and Options can be excluded from the ring via Include/Exclude; dollar amounts stay in the legend. Center shows total net liquidation when available.'

interface Props {
  accounts: IbAccountSnapshot[]
}

function LegendItem({
  label,
  pct,
  value,
  dotClass,
  excluded,
  title,
}: {
  label: string
  pct: string
  value: string
  dotClass: string
  excluded?: boolean
  title?: string
}) {
  return (
    <div
      className={cn(styles.mixLegendItem, excluded && 'opacity-50')}
      title={title ?? (excluded ? 'Not included in ring denominator' : undefined)}
    >
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass)} />
      <span className={styles.mixLegendItemLabel}>{label}</span>
      <span className={styles.mixLegendItemPct}>{pct}</span>
      <span className={styles.mixLegendItemValue} title={value}>
        {value}
      </span>
    </div>
  )
}

function portfolioCategoryCenter(
  pie: ReturnType<typeof buildPortfolioCategoryPieData>,
): { main: string; sub: string; variant: DonutCenterVariant } {
  const { denom, netLiq, simpleCenterPct, pStock, pCashMerged } = pie
  if (netLiq != null) {
    return { main: fmtUsd(netLiq, true), sub: 'Net liq.', variant: 'netliq' }
  }
  if (denom > 0) {
    if (simpleCenterPct) {
      return {
        main: `${(pStock * 100).toFixed(1)} · ${(pCashMerged * 100).toFixed(1)}`,
        sub: '% of sum',
        variant: 'triplet',
      }
    }
    return { main: fmtUsd(denom, true), sub: 'Chart basis', variant: 'basis' }
  }
  return { main: '—', sub: '', variant: 'basis' }
}

export function PortfolioCategoryRing({ accounts }: Props) {
  const [includeFi, setIncludeFi] = useState(false)
  const [includeOpt, setIncludeOpt] = useState(true)

  const pie = useMemo(
    () => buildPortfolioCategoryPieData(accounts, { includeFi, includeOpt }),
    [accounts, includeFi, includeOpt],
  )

  if (!pie.ringHasData) return null

  const center = portfolioCategoryCenter(pie)
  const {
    coreStockMV,
    fixedIncomeMV,
    cashMergedMV,
    optionsMV,
    denom,
    pStock,
    pFixedIncome,
    pCashMerged,
    pOpt,
    includeFiInChart,
    includeOptInChart,
  } = pie

  const segments = [
    { label: 'Stock', value: coreStockMV, color: ASSET_MIX_CHART_COLORS.stock },
    ...(includeFiInChart
      ? [{ label: 'Fixed income', value: fixedIncomeMV, color: ASSET_MIX_CHART_COLORS.fi }]
      : []),
    ...(cashMergedMV > 0
      ? [{ label: 'Cash + Cash-like', value: cashMergedMV, color: ASSET_MIX_CHART_COLORS.cash }]
      : []),
    ...(includeOptInChart
      ? [{ label: 'Options', value: optionsMV, color: ASSET_MIX_CHART_COLORS.options }]
      : []),
  ].filter((s) => s.value > 0)

  const ringAriaParts = [
    'Stock',
    includeFiInChart ? 'Fixed income' : null,
    'Cash and cash-like',
    includeOptInChart ? 'Options' : null,
  ].filter(Boolean) as string[]

  return (
    <div className={cn(styles.panel, styles.accountPanelBody, 'w-full self-start')}>
      <div className={styles.chartSectionHeader}>
        <span className={styles.chartSectionTitle}>Portfolio by category</span>
        <InfoTooltip text={TOOLTIP} />
      </div>

      <div className={styles.mixBody}>
        <div className={styles.mixChartBlock}>
          <DonutChart
            segments={segments}
            centerMain={center.main}
            centerSub={center.sub || undefined}
            centerVariant={center.variant}
          />
          <div className={cn(styles.mixFilters, '!min-h-0')} aria-label={`Ring chart: ${ringAriaParts.join(', ')}`}>
            <IncludeExcludeToggle
              layout="stacked"
              label="Fixed income in chart"
              include={includeFi}
              onChange={setIncludeFi}
            />
            <IncludeExcludeToggle
              layout="stacked"
              label="Options in chart"
              include={includeOpt}
              onChange={setIncludeOpt}
            />
          </div>
        </div>

        <div className={cn(styles.mixLegendCol, 'flex-1 min-w-[10rem]')}>
          <LegendItem
            label="Stock"
            dotClass="bg-[#38bdf8]"
            pct={denom > 0 ? `${(pStock * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(coreStockMV, true)}
          />
          <LegendItem
            label="Fixed income"
            dotClass="bg-[#4ade80]"
            pct={includeFiInChart && denom > 0 ? `${(pFixedIncome * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(fixedIncomeMV, true)}
            excluded={!includeFiInChart}
            title={
              !includeFiInChart
                ? 'Fixed income MV is listed; not included in ring denominator.'
                : undefined
            }
          />
          <LegendItem
            label="Cash + Cash-like"
            dotClass="bg-[#fbbf24]"
            pct={denom > 0 && cashMergedMV > 0 ? `${(pCashMerged * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(cashMergedMV, true)}
          />
          <LegendItem
            label="Options"
            dotClass="bg-[#c084fc]"
            pct={includeOptInChart && denom > 0 ? `${(pOpt * 100).toFixed(1)}%` : '—'}
            value={fmtUsd(optionsMV, true)}
            excluded={!includeOptInChart}
            title={
              !includeOptInChart
                ? 'Options MV is listed; not included in ring denominator.'
                : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
