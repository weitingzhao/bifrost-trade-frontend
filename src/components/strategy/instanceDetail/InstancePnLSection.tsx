import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { fmtUsd } from '@/lib/format'
import type { InstanceDetailData } from '@/hooks/useInstanceDetailData'
import styles from './InstanceDetail.module.css'

function signedClass(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return styles.neutral
  if (n > 1e-9) return styles.positive
  if (n < -1e-9) return styles.negative
  return styles.neutral
}

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
    <div className={styles.pnlBand} role="group" aria-label={title}>
      <div className={styles.pnlBandHead}>
        <div className={styles.pnlBandTitle}>{title}</div>
        {helpLabel ? (
          <button type="button" className={styles.pnlBandHelpBtn} aria-label={helpLabel} title={helpLabel}>
            ?
          </button>
        ) : null}
      </div>
      <div className={styles.pnlBandMetrics}>{children}</div>
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
    <div className={cn(styles.pnlMetric, secondary && styles.pnlMetricSecondary)}>
      <span className={styles.pnlLabel} title={title}>
        {label}
      </span>
      <span className={cn(styles.pnlValue, valueClass)} title={title}>
        {value}
      </span>
    </div>
  )
}

export function InstancePnLSection({ data }: Props) {
  const loading = data.perfLoading || data.execLoading
  const hasData = data.summary != null || data.displayNetPnl != null

  return (
    <div className={styles.pnlColumn}>
      <div className={styles.pnlSectionHead}>
        <h3 className={styles.sectionTitle}>PnL</h3>
        <button
          type="button"
          className={styles.pnlInfoBtn}
          disabled={loading || !hasData}
          aria-label="How PnL metrics are calculated"
          title={loading || !hasData ? undefined : 'Calculation details — coming soon'}
        >
          ⓘ
        </button>
      </div>

      {loading ? (
        <div className={cn(styles.pnlPanel, styles.pnlPanelMuted)}>
          <span className={styles.muted}>Loading performance…</span>
        </div>
      ) : !hasData ? (
        <div className={cn(styles.pnlPanel, styles.pnlPanelMuted)}>
          <span className={styles.muted}>No performance data for this instance.</span>
        </div>
      ) : (
        <div className={styles.pnlPanel} role="region" aria-label="PnL metrics">
          <div className={styles.pnlBands}>
            <PnlBand title="PnL & commission">
              <PnlMetric
                label="Net PnL"
                value={fmtUsd(data.displayNetPnl)}
                valueClass={signedClass(data.displayNetPnl)}
              />
              <PnlMetric
                label="Commission"
                value={fmtUsd(data.totalCommission)}
                valueClass={styles.commission}
              />
              {data.netPnlPerDay != null && data.holdDays != null ? (
                <PnlMetric
                  label="Net PnL / day"
                  value={`${fmtUsd(data.netPnlPerDay)}/day`}
                  valueClass={signedClass(data.netPnlPerDay)}
                  secondary
                />
              ) : null}
            </PnlBand>

            <PnlBand title="Risk & cost" helpLabel="Risk and cost methodology — coming soon">
              <PnlMetric label="Risk" value={fmtUsd(data.capitalAtRisk)} valueClass={styles.neutral} />
              {data.costPerDay != null ? (
                <PnlMetric
                  label="Cost / day"
                  value={`${fmtUsd(data.costPerDay)}/day`}
                  valueClass={styles.neutral}
                  secondary
                />
              ) : null}
            </PnlBand>

            <PnlBand title="Times">
              <PnlMetric label="Trades" value={String(data.tradeCount)} valueClass={styles.neutral} />
              <PnlMetric
                label="Hold time"
                value={data.holdDays != null ? `${Math.round(data.holdDays)} d` : '—'}
                valueClass={styles.neutral}
              />
            </PnlBand>

            <PnlBand title="Return" helpLabel="Return percent methodology — coming soon">
              <PnlMetric
                label="Return %"
                value={fmtSignedPct(data.returnPct)}
                valueClass={signedClass(data.returnPct)}
              />
              <PnlMetric
                label="Annual return"
                value={fmtSignedPct(data.annualReturnPct)}
                valueClass={signedClass(data.annualReturnPct)}
              />
            </PnlBand>
          </div>
        </div>
      )}
    </div>
  )
}
