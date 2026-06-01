import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import {
  instanceCommissionClass,
  instanceMutedClass,
  instancePnlBandClass,
  instancePnlBandHeadClass,
  instancePnlBandHelpBtnClass,
  instancePnlBandMetricsClass,
  instancePnlBandTitleClass,
  instancePnlBandsClass,
  instancePnlColumnClass,
  instancePnlInfoBtnClass,
  instancePnlLabelClass,
  instancePnlMetricClass,
  instancePnlMetricSecondaryClass,
  instancePnlPanelClass,
  instancePnlPanelMutedClass,
  instancePnlSectionHeadClass,
  instancePnlValueClass,
  instanceSectionTitleClass,
} from './instanceDetailUi'

function fmtSignedPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

interface Props {
  data: InstanceDetailData
}

function PnlBand({
  title,
  children,
  helpLabel,
}: {
  title: string
  children: ReactNode
  helpLabel?: string
}) {
  return (
    <div className={instancePnlBandClass} role="group" aria-label={title}>
      <div className={instancePnlBandHeadClass}>
        <div className={instancePnlBandTitleClass}>{title}</div>
        {helpLabel ? (
          <button type="button" className={instancePnlBandHelpBtnClass} aria-label={helpLabel} title={helpLabel}>
            ?
          </button>
        ) : null}
      </div>
      <div className={instancePnlBandMetricsClass}>{children}</div>
    </div>
  )
}

function PnlMetric({
  label,
  value,
  valueClass,
  secondary,
  title,
}: {
  label: string
  value: string
  valueClass?: string
  secondary?: boolean
  title?: string
}) {
  return (
    <div className={cn(instancePnlMetricClass, secondary && instancePnlMetricSecondaryClass)}>
      <span className={instancePnlLabelClass} title={title}>
        {label}
      </span>
      <span className={cn(instancePnlValueClass, valueClass)} title={title}>
        {value}
      </span>
    </div>
  )
}

export function InstancePnLSection({ data }: Props) {
  const loading = data.perfLoading || data.execLoading
  const hasData = data.summary != null || data.displayNetPnl != null

  return (
    <div className={instancePnlColumnClass}>
      <div className={instancePnlSectionHeadClass}>
        <h3 className={instanceSectionTitleClass}>PnL</h3>
        <button
          type="button"
          className={instancePnlInfoBtnClass}
          disabled={loading || !hasData}
          aria-label="How PnL metrics are calculated"
          title={loading || !hasData ? undefined : 'Calculation details — coming soon'}
        >
          ⓘ
        </button>
      </div>

      {loading ? (
        <div className={instancePnlPanelMutedClass}>
          <span className={instanceMutedClass}>Loading performance…</span>
        </div>
      ) : !hasData ? (
        <div className={instancePnlPanelMutedClass}>
          <span className={instanceMutedClass}>No performance data for this instance.</span>
        </div>
      ) : (
        <div className={instancePnlPanelClass} role="region" aria-label="PnL metrics">
          <div className={instancePnlBandsClass}>
            <PnlBand title="PnL & commission">
              <PnlMetric
                label="Net PnL"
                value={fmtUsd(data.displayNetPnl)}
                valueClass={pnlColorClass(data.displayNetPnl)}
              />
              <PnlMetric label="Commission" value={fmtUsd(data.totalCommission)} valueClass={instanceCommissionClass} />
              {data.netPnlPerDay != null && data.holdDays != null ? (
                <PnlMetric
                  label="Net PnL / day"
                  value={`${fmtUsd(data.netPnlPerDay)}/day`}
                  valueClass={pnlColorClass(data.netPnlPerDay)}
                  secondary
                />
              ) : null}
            </PnlBand>

            <PnlBand title="Risk & cost" helpLabel="Risk and cost methodology — coming soon">
              <PnlMetric label="Risk" value={fmtUsd(data.capitalAtRisk)} />
              {data.costPerDay != null ? (
                <PnlMetric
                  label="Cost / day"
                  value={`${fmtUsd(data.costPerDay)}/day`}
                  secondary
                />
              ) : null}
            </PnlBand>

            <PnlBand title="Times">
              <PnlMetric label="Trades" value={String(data.tradeCount)} />
              <PnlMetric
                label="Hold time"
                value={data.holdDays != null ? `${Math.round(data.holdDays)} d` : '—'}
              />
            </PnlBand>

            <PnlBand title="Return" helpLabel="Return percent methodology — coming soon">
              <PnlMetric
                label="Return %"
                value={fmtSignedPct(data.returnPct)}
                valueClass={pnlColorClass(data.returnPct)}
              />
              <PnlMetric
                label="Annual return"
                value={fmtSignedPct(data.annualReturnPct)}
                valueClass={pnlColorClass(data.annualReturnPct)}
              />
            </PnlBand>
          </div>
        </div>
      )}
    </div>
  )
}
