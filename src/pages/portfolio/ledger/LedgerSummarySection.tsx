import { useMemo, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { SegmentControl } from '@/components/data-display'
import {
  LEDGER_SUMMARY_PERIOD_TABS,
  formatPeriodLabel,
  rollupOptionsFromMonthly,
  rollupStocksFromMonthly,
  type LedgerSummaryPeriod,
} from '@/utils/ledger/summaryPeriod'
import type { OptExecutionGroup } from '@/utils/ledger/optExecutionGroups'
import type { Execution } from '@/types/positions'
import type { MainTab } from './ledgerTypes'
import { isSharesTab } from './ledgerTypes'
import { fmtCcy, pnlClass } from './ledgerFormat'
import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'
import { ledgerSummary } from './ledgerSummaryUi'

type OptionMonthRow = [string, { count: number; realizedPnl: number }]
type StockMonthRow = [string, { count: number; notional: number; realizedPnl: number }]

type Props = {
  activeTab: MainTab
  summaryPeriod: LedgerSummaryPeriod
  onSummaryPeriodChange: (p: LedgerSummaryPeriod) => void
  optionsSummaryByMonth: OptionMonthRow[]
  stocksSummaryByMonth: StockMonthRow[]
  summaryClosedGroups: OptExecutionGroup[]
  closedOptGroupsPnlSum: number
  stkFilteredExecutions: Execution[]
  stkUnrealizedByKey: Map<string, number | null>
  stkTotals: {
    count: number
    notional: number
    realized: number
    unrealized: number | null
  }
  undatedCount: number
  undatedNote: string
  onExplain: (kind: LedgerMetricExplainKind, id: string) => void
  onShowUndated: () => void
}

function MetricTrigger({
  value,
  className,
  ariaLabel,
  onOpen,
}: {
  value: number | null
  className?: string
  ariaLabel: string
  onOpen: (e: MouseEvent) => void
}) {
  const display = value == null ? '—' : fmtCcy(value)
  return (
    <button
      type="button"
      className={cn(ledgerSummary.metricTrigger, pnlClass(value), className)}
      aria-label={ariaLabel}
      onClick={onOpen}
    >
      {display}
    </button>
  )
}

export function LedgerSummarySection({
  activeTab,
  summaryPeriod,
  onSummaryPeriodChange,
  optionsSummaryByMonth,
  stocksSummaryByMonth,
  summaryClosedGroups,
  closedOptGroupsPnlSum,
  stkTotals,
  undatedCount,
  undatedNote,
  onExplain,
  onShowUndated,
}: Props) {
  const showOptions = activeTab === 'options' || activeTab === 'strategy' || activeTab === 'instance'
  const showStocks = isSharesTab(activeTab)

  const optionSummaryRows = useMemo(
    () => rollupOptionsFromMonthly(optionsSummaryByMonth, summaryPeriod),
    [optionsSummaryByMonth, summaryPeriod],
  )

  const stkSummaryRows = useMemo(
    () => rollupStocksFromMonthly(stocksSummaryByMonth, summaryPeriod),
    [stocksSummaryByMonth, summaryPeriod],
  )

  const optionTotalGroups = summaryClosedGroups.length

  const periodOptions = LEDGER_SUMMARY_PERIOD_TABS.map(({ id, label }) => ({ value: id, label }))

  if (!showOptions && !showStocks) {
    return (
      <section className={ledgerSummary.section} aria-label="Summary by period">
        <p className={ledgerSummary.emptyHint}>Select Options or STK tab for period summary.</p>
      </section>
    )
  }

  return (
    <section className={ledgerSummary.section} aria-label="Summary by period">
      <div className={ledgerSummary.head}>
        <span className={ledgerSummary.title}>Summary</span>
        <span className="text-dense-meta text-muted-foreground">click any figure for its derivation</span>
        <span className="ml-auto">
          <SegmentControl
            size="sm"
            ariaLabel="Summary aggregation period"
            value={summaryPeriod}
            onChange={v => onSummaryPeriodChange(v as LedgerSummaryPeriod)}
            options={periodOptions}
          />
        </span>
      </div>

      {showOptions && (
        <div className={ledgerSummary.body}>
          <ul
            className={ledgerSummary.calendarGrid}
            aria-label="Option closed groups by period"
            key={summaryPeriod}
          >
            {optionSummaryRows.map(([key, { count, realizedPnl }]) => (
              <li key={`${summaryPeriod}-${key}`} className={ledgerSummary.periodCell}>
                <span className={ledgerSummary.periodCellLabel}>
                  {formatPeriodLabel(key, summaryPeriod)}
                </span>
                <span className={ledgerSummary.periodCellMetrics}>
                  <span>{count} groups</span>
                  <span className={ledgerSummary.metricSep} aria-hidden>·</span>
                  <MetricTrigger
                    value={realizedPnl}
                    ariaLabel="Open calculation details for this period realized PnL"
                    onOpen={() => onExplain('options_period_realized', `opt-pnl-${key}`)}
                  />
                </span>
              </li>
            ))}
          </ul>
          <div className={ledgerSummary.summaryTotal} aria-label="Option summary totals">
            <span className={ledgerSummary.summaryTotalLabel}>Total</span>
            <span className={ledgerSummary.summaryTotalMetrics}>
              <span>{optionTotalGroups} groups</span>
              <span className={ledgerSummary.metricSep} aria-hidden>·</span>
              <MetricTrigger
                value={closedOptGroupsPnlSum}
                ariaLabel="Open calculation details for total option realized PnL"
                onOpen={() => onExplain('options_total_realized', 'opt-total')}
              />
            </span>
          </div>
        </div>
      )}

      {showStocks && (
        <div className={ledgerSummary.body}>
          <ul
            className={ledgerSummary.calendarGrid}
            aria-label="Stock executions by period"
            key={summaryPeriod}
          >
            {stkSummaryRows.map(([key, { count, notional, realizedPnl }]) => (
              <li key={`${summaryPeriod}-${key}`} className={ledgerSummary.periodCell}>
                <span className={ledgerSummary.periodCellLabel}>
                  {formatPeriodLabel(key, summaryPeriod)}
                </span>
                <span className={ledgerSummary.periodCellMetrics}>
                  <span>{count} trades</span>
                  <span className={ledgerSummary.metricSep} aria-hidden>·</span>
                  <MetricTrigger
                    value={realizedPnl}
                    ariaLabel="Open calculation details for period realized PnL"
                    onOpen={() => onExplain('stocks_period_realized', `stk-rz-${key}`)}
                  />
                </span>
                <button
                  type="button"
                  className={cn(ledgerSummary.stocksNotionalLine, ledgerSummary.metricTrigger)}
                  aria-label="Open calculation details for period notional"
                  onClick={() => onExplain('stocks_period_notional', `stk-nv-${key}`)}
                >
                  Notional {fmtCcy(notional)}
                </button>
              </li>
            ))}
          </ul>
          <div className={ledgerSummary.summaryTotal} aria-label="Stock summary totals">
            <span className={ledgerSummary.summaryTotalLabel}>Total</span>
            <span className={ledgerSummary.summaryTotalMetrics}>
              <span>{stkTotals.count} trades</span>
              <span className={ledgerSummary.metricSep} aria-hidden>·</span>
              <MetricTrigger
                value={stkTotals.realized}
                ariaLabel="Open calculation details for total realized PnL"
                onOpen={() => onExplain('stocks_total_realized', 'stk-total-rz')}
              />
              <span className={ledgerSummary.metricSep} aria-hidden>·</span>
              <span className={ledgerSummary.metricInlineLabel}>U</span>
              <MetricTrigger
                value={stkTotals.unrealized}
                ariaLabel="Open calculation details for total unrealized PnL"
                onOpen={() => onExplain('stocks_total_unrealized', 'stk-total-u')}
              />
              <span className={ledgerSummary.metricSep} aria-hidden>·</span>
              <span className={ledgerSummary.metricInlineLabel}>nv</span>
              <MetricTrigger
                value={stkTotals.notional}
                className={ledgerSummary.notionalValue}
                ariaLabel="Open calculation details for total notional"
                onOpen={() => onExplain('stocks_total_notional', 'stk-total-nv')}
              />
            </span>
          </div>
        </div>
      )}

      {undatedCount > 0 ? (
        <button
          type="button"
          onClick={onShowUndated}
          className="mt-2 flex w-full flex-wrap items-center gap-1.5 border-0 border-t border-border bg-transparent px-0 pt-2 text-left"
        >
          <span className="size-2 shrink-0 rounded-full bg-slate-500" />
          <span className="min-w-0 flex-1 text-dense-meta text-muted-foreground text-pretty">{undatedNote}</span>
          <span className="text-dense-meta text-link">show them →</span>
        </button>
      ) : null}
    </section>
  )
}
