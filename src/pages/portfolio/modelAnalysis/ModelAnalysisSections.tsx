import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import { fmtUsd } from '@/lib/format'
import {
  fmtIvShockLabel,
  fmtModelDelta,
  fmtRatioAsPct,
  fmtSpotPrice,
  fmtSpotShockLabel,
  riskBadgeLabel,
} from '@/utils/modelAnalysisFormat'
import { cn } from '@/lib/utils'
import { UnderlyingDetailPanel } from './UnderlyingDetailPanel'
import styles from '../modelAnalysis.module.css'

interface Props {
  data: ModelAnalysisResponse
}

export function ModelAnalysisMainTable({ data }: Props) {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null)
  const entries = data.per_underlying

  if (entries.length === 0) return null

  return (
    <div className={styles.tableWrap}>
      <table className={cn(styles.compactTable, 'w-full border-collapse')}>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Spot</th>
            <th>DTE</th>
            <th>Max Gain</th>
            <th>Max Loss</th>
            <th>Risk</th>
            <th>CAR</th>
            <th>Annual %</th>
            <th>Delta</th>
            <th>Delta $</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(u => {
            const expanded = expandedSymbol === u.symbol
            return (
              <Fragment key={u.symbol}>
                <tr
                  className={cn(styles.clickable, expanded && styles.expanded)}
                  onClick={() => setExpandedSymbol(expanded ? null : u.symbol)}
                  aria-expanded={expanded}
                >
                  <td className={styles.symbolCell}>{u.symbol}</td>
                  <td>{fmtSpotPrice(u.spot)}</td>
                  <td>{u.dte_days ?? '—'}</td>
                  <td className={styles.pnlPositive}>
                    {u.max_gain == null ? 'Unbounded' : fmtUsd(u.max_gain)}
                  </td>
                  <td className={styles.pnlNegative}>
                    {u.max_loss == null ? 'Unbounded' : fmtUsd(u.max_loss)}
                  </td>
                  <td>
                    <span
                      className={
                        u.risk_type === 'defined' ? styles.riskDefined : styles.riskUnlimited
                      }
                    >
                      {riskBadgeLabel(u.risk_type)}
                    </span>
                  </td>
                  <td>
                    {u.capital_at_risk.has_unbounded ? 'N/A' : fmtUsd(u.capital_at_risk.effective)}
                  </td>
                  <td>{fmtRatioAsPct(u.annualized_return_on_car)}</td>
                  <td>
                    {fmtModelDelta(u.greeks.delta)}
                    {u.greeks.degraded ? ' *' : ''}
                  </td>
                  <td>{fmtUsd(u.greeks.delta_dollars)}</td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={10} className={styles.detailCell}>
                      <UnderlyingDetailPanel entry={u} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface AccountStressProps {
  data: ModelAnalysisResponse
}

export function AccountStressSection({ data }: AccountStressProps) {
  const [open, setOpen] = useState(false)
  const scenarios = data.account_stress.scenarios ?? []

  if (!data.account_stress.available || scenarios.length === 0) return null

  return (
    <div className={styles.stressCollapsible}>
      <button
        type="button"
        className={styles.stressCollapsibleTrigger}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span>Account Stress Matrix</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className={styles.stressCollapsibleBody}>
          <p className={styles.stressNote}>
            Values are the <strong>sum</strong> of per-symbol stress totals for the same (spot shock, IV shock) key.
            Open any <strong>symbol</strong> row below for full CAR and stress methodology (formulas, Black–Scholes assumptions).
          </p>
          <div className={styles.nestedTableWrap}>
            <table className={styles.nestedTable}>
              <thead>
                <tr>
                  <th>Spot shock</th>
                  <th>IV shock</th>
                  <th>P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc, i) => (
                  <tr key={i}>
                    <td>{fmtSpotShockLabel(sc.spot_shock)}</td>
                    <td>{fmtIvShockLabel(sc.iv_shock)}</td>
                    <td className={sc.total_pnl >= 0 ? styles.pnlPositive : styles.pnlNegative}>
                      {fmtUsd(sc.total_pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

interface SummaryProps {
  data: ModelAnalysisResponse
}

export function ModelAnalysisSummaryStrip({ data }: SummaryProps) {
  const rollups = data.account_rollups
  const summary = data.account_summary

  const items = [
    { label: 'Net Liquidation', value: fmtUsd(summary.net_liquidation) },
    { label: 'Cash', value: fmtUsd(summary.total_cash) },
    { label: 'Buying Power', value: fmtUsd(summary.buying_power) },
    {
      label: 'Total CAR',
      value: rollups.car_has_unbounded ? 'Unbounded' : fmtUsd(rollups.total_car),
    },
    { label: 'Wtd Annual Return', value: fmtRatioAsPct(rollups.weighted_annualized_return) },
    { label: 'Portfolio Delta', value: fmtModelDelta(rollups.total_delta) },
    { label: 'Delta $', value: fmtUsd(rollups.total_delta_dollars) },
  ]

  return (
    <div className={styles.summaryStrip}>
      {items.map(item => (
        <div key={item.label} className={styles.summaryItem}>
          <span className={styles.summaryLabel}>{item.label}</span>
          <span className={styles.summaryValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
