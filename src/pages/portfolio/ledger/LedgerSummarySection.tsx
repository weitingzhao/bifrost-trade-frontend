import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'
import { DraggableExplainPanel } from '@/components/DraggableExplainPanel'
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
import { fmtCcy, pnlClass } from './ledgerFormat'
import { LedgerMetricExplainContent } from './LedgerMetricExplainContent'
import {
  buildLedgerMetricExplainPayload,
  ledgerMetricExplainTitle,
  type LedgerMetricExplainPayload,
} from '@/utils/ledger/ledgerSummaryExplainPayload'
import type { LedgerMetricExplainKind } from '@/utils/ledger/ledgerMetricExplainKinds'
import styles from './ledgerStyles'

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
}

function tabLabel(tab: MainTab): string {
  if (tab === 'fixed_income') return 'Fixed income'
  if (tab === 'cash_like') return 'Cash-like'
  return tab.charAt(0).toUpperCase() + tab.slice(1)
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
      className={cn(styles.metricTrigger, pnlClass(value), className)}
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
  stkFilteredExecutions,
  stkUnrealizedByKey,
  stkTotals,
}: Props) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [explain, setExplain] = useState<{
    kind: LedgerMetricExplainKind
    id: string
    anchor: { x: number; y: number }
    payload: LedgerMetricExplainPayload
  } | null>(null)

  const periodLabel = LEDGER_SUMMARY_PERIOD_TABS.find(t => t.id === summaryPeriod)?.label ?? summaryPeriod
  const ledgerTabLabel = tabLabel(activeTab)

  const showOptions = activeTab === 'options' || activeTab === 'strategy' || activeTab === 'instance'
  const showStocks = activeTab === 'stocks' || activeTab === 'fixed_income' || activeTab === 'cash_like'

  const optionSummaryRows = useMemo(
    () => rollupOptionsFromMonthly(optionsSummaryByMonth, summaryPeriod),
    [optionsSummaryByMonth, summaryPeriod],
  )

  const stkSummaryRows = useMemo(
    () => rollupStocksFromMonthly(stocksSummaryByMonth, summaryPeriod),
    [stocksSummaryByMonth, summaryPeriod],
  )

  const buildPayload = useCallback((kind: LedgerMetricExplainKind, id: string): LedgerMetricExplainPayload => {
    return buildLedgerMetricExplainPayload({
      kind,
      id,
      ledgerTabLabel,
      summaryPeriodModeLabel: periodLabel,
      ledgerSummaryPeriod: summaryPeriod,
      closedOptionGroups: summaryClosedGroups,
      stockFilteredExecutions: stkFilteredExecutions,
      closedOptGroupsPnlSum,
      stkUnrealizedByAccountContract: stkUnrealizedByKey,
    })
  }, [
    ledgerTabLabel,
    periodLabel,
    summaryPeriod,
    summaryClosedGroups,
    stkFilteredExecutions,
    closedOptGroupsPnlSum,
    stkUnrealizedByKey,
  ])

  const openExplain = useCallback((kind: LedgerMetricExplainKind, id: string, e: MouseEvent) => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current)
      hoverTimer.current = null
    }
    setExplain({
      kind,
      id,
      anchor: { x: e.clientX, y: e.clientY },
      payload: buildPayload(kind, id),
    })
  }, [buildPayload])

  const optionTotalGroups = useMemo(
    () => optionsSummaryByMonth.reduce((s, [, d]) => s + d.count, 0),
    [optionsSummaryByMonth],
  )

  if (!showOptions && !showStocks) {
    return (
      <section className={styles.summarySection} aria-label="Summary by period">
        <p className={styles.ledgerEmptyHint}>Select Options or STK tab for period summary.</p>
      </section>
    )
  }

  return (
    <>
      <section className={styles.summarySection} aria-label="Summary by period">
        <div className={styles.summaryHead}>
          <span className={styles.summaryTitle}>Summary</span>
          <div className={styles.periodTabs} role="tablist" aria-label="Summary aggregation period">
            {LEDGER_SUMMARY_PERIOD_TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={summaryPeriod === id}
                className={cn(styles.periodTab, summaryPeriod === id && styles.periodTabActive)}
                onClick={() => onSummaryPeriodChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showOptions && (
          <div className={styles.summaryBody}>
            <ul
              className={styles.calendarGrid}
              aria-label="Option closed groups by period"
              key={summaryPeriod}
            >
              {optionSummaryRows.map(([key, { count, realizedPnl }]) => (
                <li key={`${summaryPeriod}-${key}`} className={styles.periodCell}>
                  <span className={styles.periodCellLabel}>
                    {formatPeriodLabel(key, summaryPeriod)}
                  </span>
                  <span className={styles.periodCellMetrics}>
                    <span>{count} groups</span>
                    <span className={styles.metricSep} aria-hidden>·</span>
                    <MetricTrigger
                      value={realizedPnl}
                      ariaLabel="Open calculation details for this period realized PnL"
                      onOpen={e => openExplain('options_period_realized', `opt-pnl-${key}`, e)}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.summaryTotal} aria-label="Option summary totals">
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalMetrics}>
                <span>{optionTotalGroups} groups</span>
                <span className={styles.metricSep} aria-hidden>·</span>
                <MetricTrigger
                  value={closedOptGroupsPnlSum}
                  ariaLabel="Open calculation details for total option realized PnL"
                  onOpen={e => openExplain('options_total_realized', 'opt-total', e)}
                />
              </span>
            </div>
          </div>
        )}

        {showStocks && (
          <div className={styles.summaryBody}>
            <ul
              className={styles.calendarGrid}
              aria-label="Stock executions by period"
              key={summaryPeriod}
            >
              {stkSummaryRows.map(([key, { count, notional, realizedPnl }]) => (
                <li key={`${summaryPeriod}-${key}`} className={styles.periodCell}>
                  <span className={styles.periodCellLabel}>
                    {formatPeriodLabel(key, summaryPeriod)}
                  </span>
                  <span className={styles.periodCellMetrics}>
                    <span>{count} trades</span>
                    <span className={styles.metricSep} aria-hidden>·</span>
                    <MetricTrigger
                      value={realizedPnl}
                      ariaLabel="Open calculation details for period realized PnL"
                      onOpen={e => openExplain('stocks_period_realized', `stk-rz-${key}`, e)}
                    />
                  </span>
                  <button
                    type="button"
                    className={cn(styles.stocksNotionalLine, styles.metricTrigger)}
                    aria-label="Open calculation details for period notional"
                    onClick={e => openExplain('stocks_period_notional', `stk-nv-${key}`, e)}
                  >
                    Notional {fmtCcy(notional)}
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.summaryTotal} aria-label="Stock summary totals">
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalMetrics}>
                <span>{stkTotals.count} trades</span>
                <span className={styles.metricSep} aria-hidden>·</span>
                <MetricTrigger
                  value={stkTotals.realized}
                  ariaLabel="Open calculation details for total realized PnL"
                  onOpen={e => openExplain('stocks_total_realized', 'stk-total-rz', e)}
                />
                <span className={styles.metricSep} aria-hidden>·</span>
                <span className={styles.metricInlineLabel}>U</span>
                <MetricTrigger
                  value={stkTotals.unrealized}
                  ariaLabel="Open calculation details for total unrealized PnL"
                  onOpen={e => openExplain('stocks_total_unrealized', 'stk-total-u', e)}
                />
                <span className={styles.metricSep} aria-hidden>·</span>
                <span className={styles.metricInlineLabel}>nv</span>
                <MetricTrigger
                  value={stkTotals.notional}
                  className={styles.notionalValue}
                  ariaLabel="Open calculation details for total notional"
                  onOpen={e => openExplain('stocks_total_notional', 'stk-total-nv', e)}
                />
              </span>
            </div>
          </div>
        )}
      </section>

      {explain && (
        <DraggableExplainPanel
          open
          explanationId={`${explain.kind}-${explain.id}`}
          anchor={explain.anchor}
          onClose={() => setExplain(null)}
          title={ledgerMetricExplainTitle(explain.kind)}
        >
          <LedgerMetricExplainContent kind={explain.kind} payload={explain.payload} />
        </DraggableExplainPanel>
      )}
    </>
  )
}
