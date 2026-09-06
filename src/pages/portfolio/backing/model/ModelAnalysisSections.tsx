import { Fragment, useState } from 'react'
import type { ModelAnalysisResponse } from '@/types/modelAnalysis'
import { fmtUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  CollapsibleGroupTitle,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  ExpandToggleCell,
  InlinePnl,
  NestedDenseTable,
  denseTableNumCell,
} from '@/components/data-display'
import {
  fmtIvShockLabel,
  fmtModelDelta,
  fmtRatioAsPct,
  fmtSpotPrice,
  fmtSpotShockLabel,
  riskBadgeLabel,
} from '@/utils/modelAnalysisFormat'
import { UnderlyingDetailPanel } from './UnderlyingDetailPanel'
import {
  MAIN_TABLE_COL_SPAN,
  modelAnalysisEmptyHintClass,
  modelAnalysisStressNoteClass,
  modelAnalysisSummaryItemClass,
  modelAnalysisSummaryLabelClass,
  modelAnalysisSummaryStripClass,
  modelAnalysisSummaryValueClass,
  modelAnalysisTable,
} from './modelAnalysisUi'

interface MainTableProps {
  data: ModelAnalysisResponse
  /** The page's symbol scope, upper-cased: rows narrow the way the rest of the page does. */
  filterSymbol: string
  /** Collapsed by default; the band owns both, so a `?symbol=` deep link can open a row. */
  open: boolean
  onToggle: () => void
  expandedSymbol: string | null
  onToggleSymbol: (symbol: string) => void
}

export function ModelAnalysisMainTable({ data, filterSymbol, open, onToggle, expandedSymbol, onToggleSymbol }: MainTableProps) {
  const entries = data.per_underlying ?? []

  if (entries.length === 0) return null

  const shown = filterSymbol ? entries.filter((u) => u.symbol.toUpperCase().includes(filterSymbol)) : entries
  const undefinedRisk = shown.filter((u) => u.risk_type !== 'defined').length
  const nakedCalls = shown.reduce((n, u) => n + (u.naked_short_call_contracts ?? 0), 0)

  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={onToggle}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Per underlying</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {shown.length !== entries.length ? `${shown.length} of ${entries.length}` : entries.length} symbol
            {entries.length !== 1 ? 's' : ''}
            {shown.length === 0 ? null : undefinedRisk > 0 ? (
              <span className="text-loss"> · {undefinedRisk} undefined risk</span>
            ) : (
              ' · all defined risk'
            )}
            {nakedCalls > 0 ? <span className="text-loss"> · {nakedCalls} naked calls</span> : null}
          </span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open && shown.length === 0 ? (
        <CollapsibleGroupBody>
          <div className={modelAnalysisEmptyHintClass}>No modelled symbol matches {filterSymbol}</div>
        </CollapsibleGroupBody>
      ) : open ? (
        <CollapsibleGroupBody>
          <div className={modelAnalysisTable.shell}>
            <table className={modelAnalysisTable.table} aria-label="Model analysis per underlying">
              <DenseTableHeader className={modelAnalysisTable.stickyThead}>
                <DenseTableHeadRow>
                  <DenseTableHead scope="col" className="w-10" />
                  <DenseTableHead scope="col">Symbol</DenseTableHead>
                  <DenseTableHead align="right">Spot</DenseTableHead>
                  <DenseTableHead align="right">DTE</DenseTableHead>
                  <DenseTableHead align="right">Max Gain</DenseTableHead>
                  <DenseTableHead align="right">Max Loss</DenseTableHead>
                  <DenseTableHead>Risk</DenseTableHead>
                  <DenseTableHead align="right">CAR</DenseTableHead>
                  <DenseTableHead align="right">Annual %</DenseTableHead>
                  <DenseTableHead align="right">Delta</DenseTableHead>
                  <DenseTableHead align="right">Delta $</DenseTableHead>
                </DenseTableHeadRow>
              </DenseTableHeader>
              <DenseTableBody>
                {shown.map((u) => {
                  const expanded = expandedSymbol === u.symbol
                  return (
                    <Fragment key={u.symbol}>
                      <DenseTableRow
                        className={cn(modelAnalysisTable.clickableRow, expanded && modelAnalysisTable.expandedRow)}
                        onClick={() => onToggleSymbol(u.symbol)}
                        aria-expanded={expanded}
                      >
                        <DenseTableCell className="w-10 px-1">
                          <ExpandToggleCell
                            expanded={expanded}
                            onToggle={() => onToggleSymbol(u.symbol)}
                            label={`${expanded ? 'Collapse' : 'Expand'} ${u.symbol} details`}
                          />
                        </DenseTableCell>
                        <DenseTableCell className={modelAnalysisTable.symbolCell}>{u.symbol}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>{fmtSpotPrice(u.spot)}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>{u.dte_days ?? '—'}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {u.max_gain == null ? 'Unbounded' : <InlinePnl value={u.max_gain}>{fmtUsd(u.max_gain)}</InlinePnl>}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {u.max_loss == null ? (
                            'Unbounded'
                          ) : (
                            <InlinePnl value={-Math.abs(u.max_loss)}>{fmtUsd(u.max_loss)}</InlinePnl>
                          )}
                        </DenseTableCell>
                        <DenseTableCell>
                          <Badge
                            variant={u.risk_type === 'defined' ? 'outline' : 'destructive'}
                            className={u.risk_type === 'defined' ? 'border-success/40 bg-success-soft text-success' : undefined}
                          >
                            {riskBadgeLabel(u.risk_type)}
                          </Badge>
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {u.capital_at_risk.has_unbounded ? 'N/A' : fmtUsd(u.capital_at_risk.effective)}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>{fmtRatioAsPct(u.annualized_return_on_car)}</DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>
                          {fmtModelDelta(u.greeks.delta)}
                          {u.greeks.degraded ? ' *' : ''}
                        </DenseTableCell>
                        <DenseTableCell className={denseTableNumCell}>{fmtUsd(u.greeks.delta_dollars)}</DenseTableCell>
                      </DenseTableRow>
                      {expanded && (
                        <DenseTableRow className="hover:bg-secondary/15">
                          <DenseTableCell colSpan={MAIN_TABLE_COL_SPAN} className={modelAnalysisTable.detailCell}>
                            <UnderlyingDetailPanel entry={u} />
                          </DenseTableCell>
                        </DenseTableRow>
                      )}
                    </Fragment>
                  )
                })}
              </DenseTableBody>
            </table>
          </div>
        </CollapsibleGroupBody>
      ) : null}
    </CollapsibleGroup>
  )
}

interface AccountStressProps {
  data: ModelAnalysisResponse
}

export function AccountStressSection({ data }: AccountStressProps) {
  const [open, setOpen] = useState(false)
  const stress = data.account_stress
  const scenarios = stress?.scenarios ?? []

  if (!stress?.available || scenarios.length === 0) return null

  return (
    <CollapsibleGroup variant="card">
      <CollapsibleGroupHeader expanded={open} onToggle={() => setOpen((v) => !v)}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>Account Stress Matrix</CollapsibleGroupTitle>
        <CollapsibleGroupStats>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{scenarios.length} scenarios</span>
        </CollapsibleGroupStats>
      </CollapsibleGroupHeader>
      {open && (
        <CollapsibleGroupBody className="px-3 pb-3">
          <p className={modelAnalysisStressNoteClass}>
            Values are the <strong>sum</strong> of per-symbol stress totals for the same (spot shock, IV shock) key. Open
            any <strong>symbol</strong> row below for full CAR and stress methodology (formulas, Black–Scholes
            assumptions).
          </p>
          <NestedDenseTable>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Spot shock</DenseTableHead>
                <DenseTableHead>IV shock</DenseTableHead>
                <DenseTableHead align="right" title="What the shock itself costs — P&L relative to the unshocked scenario.">
                  Δ P&amp;L
                </DenseTableHead>
                <DenseTableHead
                  align="right"
                  title="Total P&L against cost basis at that price. A payoff figure, not a stress reading — a long-held position stays profitable under a large drop."
                >
                  P&amp;L @exp
                </DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {scenarios.map((sc, i) => (
                <DenseTableRow key={i}>
                  <DenseTableCell>{fmtSpotShockLabel(sc.spot_shock)}</DenseTableCell>
                  <DenseTableCell>{fmtIvShockLabel(sc.iv_shock)}</DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {sc.pnl_change != null ? (
                      <InlinePnl value={sc.pnl_change}>{fmtUsd(sc.pnl_change)}</InlinePnl>
                    ) : (
                      <span
                        className="text-muted-foreground"
                        title="This response predates bifrost-trade-core 0.19.0, which added the unshocked baseline."
                      >
                        —
                      </span>
                    )}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'text-muted-foreground')}>
                    {fmtUsd(sc.total_pnl)}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </NestedDenseTable>
        </CollapsibleGroupBody>
      )}
    </CollapsibleGroup>
  )
}

interface SummaryProps {
  data: ModelAnalysisResponse
}

export function ModelAnalysisSummaryStrip({ data }: SummaryProps) {
  // Core can answer with either container missing; every field then prints as —.
  const rollups: Partial<ModelAnalysisResponse['account_rollups']> = data.account_rollups ?? {}
  const summary: ModelAnalysisResponse['account_summary'] = data.account_summary ?? {}

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
    <div className={modelAnalysisSummaryStripClass} role="status" aria-label="Account summary">
      {items.map((item) => (
        <div key={item.label} className={modelAnalysisSummaryItemClass}>
          <span className={modelAnalysisSummaryLabelClass}>{item.label}</span>
          <span className={modelAnalysisSummaryValueClass}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}
