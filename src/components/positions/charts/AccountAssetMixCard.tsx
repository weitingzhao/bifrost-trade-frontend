import { useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/utils/positions'
import {
  buildCoverageAssetPieData,
  fmtMvAbbrev,
  type AssetMixIncludeFlags,
  type CoverageAssetPieData,
} from '@/utils/positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import { DonutChart, donutCenterFromDenom } from './DonutChart'
import { BubbleSwitch, IncludeExcludeToggle } from './BubbleSwitch'

interface Props {
  accounts: IbAccountSnapshot[]
  hostAccountId: string
  secondaryAccountId: string
  coreStocks: LivePositionRow[]
  fixedIncomeStocks: LivePositionRow[]
  cashLikeStocks: LivePositionRow[]
  chartAccountId: string
  onChartAccountIdChange: (id: string) => void
}

function ChartShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-secondary p-4 space-y-3 min-w-0', className)}>
      {children}
    </div>
  )
}

function LegendRow({
  label,
  pct,
  value,
  mode,
  excluded,
  dotClass,
}: {
  label: string
  pct: string
  value: string
  mode: 'pct' | 'usd'
  excluded?: boolean
  dotClass: string
}) {
  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs', excluded && 'opacity-50')}
      title={excluded ? 'Not included in ring denominator' : undefined}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
      <span className="text-muted-foreground flex-1">{label}</span>
      <span className="font-mono text-muted-foreground w-10 text-right">{mode === 'pct' ? pct : '—'}</span>
      <span className="font-mono w-14 text-right">{value}</span>
    </div>
  )
}

export function AccountAssetMixCard({
  accounts,
  hostAccountId,
  secondaryAccountId,
  coreStocks,
  fixedIncomeStocks,
  cashLikeStocks,
  chartAccountId,
  onChartAccountIdChange,
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

  const accountOptions = [
    { id: 'all', label: 'All' },
    ...(hostAccountId ? [{ id: hostAccountId, label: hostAccountId }] : []),
    ...(secondaryAccountId && secondaryAccountId !== hostAccountId
      ? [{ id: secondaryAccountId, label: secondaryAccountId }]
      : []),
  ]

  return (
    <ChartShell>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</span>
        <BubbleSwitch
          size="xs"
          options={accountOptions.map((o) => ({ value: o.id, label: o.label }))}
          value={chartAccountId}
          onChange={onChartAccountIdChange}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset mix</span>
        <BubbleSwitch
          size="xs"
          options={[
            { value: 'pct', label: '%' },
            { value: 'usd', label: '$' },
          ]}
          value={legendMode}
          onChange={(v) => setLegendMode(v as 'pct' | 'usd')}
        />
      </div>

      <div className="flex gap-3 items-start">
        <DonutChart
          segments={[
            { label: 'Stock', value: pie.coreStockMV, color: '#38bdf8' },
            ...(pie.includeFiInChart ? [{ label: 'FI', value: pie.fixedIncomeMV, color: '#fbbf24' }] : []),
            ...(pie.includeCashLikeInChart ? [{ label: 'CL', value: pie.cashLikeMV, color: '#2dd4bf' }] : []),
            { label: 'Cash', value: pie.cash ?? 0, color: '#94a3b8' },
            ...(pie.includeBpInChart && pie.bp ? [{ label: 'BP', value: pie.bp, color: '#a855f7' }] : []),
          ].filter((s) => s.value > 0)}
          centerMain={center.main}
          centerSub={center.sub || undefined}
        />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="space-y-1">
            <IncludeExcludeToggle
              label="Fixed income in chart"
              include={flags.includeFi}
              onChange={(v) => setFlags((f) => ({ ...f, includeFi: v }))}
            />
            <IncludeExcludeToggle
              label="Cash-like in chart"
              include={flags.includeCashLike}
              onChange={(v) => setFlags((f) => ({ ...f, includeCashLike: v }))}
            />
            <IncludeExcludeToggle
              label="Buying power in chart"
              include={flags.includeBp}
              onChange={(v) => setFlags((f) => ({ ...f, includeBp: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t border-border/60">
            <LegendRow
              label="Stock"
              dotClass="bg-[#38bdf8]"
              pct={pie.denom > 0 ? `${(pie.pStock * 100).toFixed(1)}%` : '—'}
              value={legendMode === 'pct' ? fmtMvAbbrev(pie.coreStockMV) : fmtUsd(pie.coreStockMV)}
              mode={legendMode}
            />
            <LegendRow
              label="Cash-like"
              dotClass="bg-[#2dd4bf]"
              pct={pie.includeCashLikeInChart && pie.denom > 0 ? `${(pie.pCashLike * 100).toFixed(1)}%` : '—'}
              value={legendMode === 'pct' ? fmtMvAbbrev(pie.cashLikeMV) : fmtUsd(pie.cashLikeMV)}
              mode={legendMode}
              excluded={!pie.includeCashLikeInChart}
            />
            <LegendRow
              label="Fixed income"
              dotClass="bg-[#fbbf24]"
              pct={pie.includeFiInChart && pie.denom > 0 ? `${(pie.pFixedIncome * 100).toFixed(1)}%` : '—'}
              value={legendMode === 'pct' ? fmtMvAbbrev(pie.fixedIncomeMV) : fmtUsd(pie.fixedIncomeMV)}
              mode={legendMode}
              excluded={!pie.includeFiInChart}
            />
            <LegendRow
              label="Net cash"
              dotClass="bg-slate-400"
              pct={pie.denom > 0 ? `${(pie.pCash * 100).toFixed(1)}%` : '—'}
              value={pie.cash != null ? (legendMode === 'pct' ? fmtMvAbbrev(pie.cash) : fmtUsd(pie.cash)) : '—'}
              mode={legendMode}
            />
            <LegendRow
              label="Buying power"
              dotClass="bg-purple-500"
              pct={pie.includeBpInChart && pie.denom > 0 ? `${(pie.pBp * 100).toFixed(1)}%` : '—'}
              value={pie.bp != null ? (legendMode === 'pct' ? fmtMvAbbrev(pie.bp) : fmtUsd(pie.bp)) : '—'}
              mode={legendMode}
              excluded={!pie.includeBpInChart}
            />
          </div>
          {pie.denom > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60 font-medium">
              <span className="text-muted-foreground">Sum (chart basis)</span>
              <span className="font-mono" title={fmtUsd(pie.denom)}>
                {legendMode === 'pct' ? fmtMvAbbrev(pie.denom) : fmtUsd(pie.denom)}
              </span>
            </div>
          )}
        </div>
      </div>
    </ChartShell>
  )
}
