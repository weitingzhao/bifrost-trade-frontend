import type { UseQueryResult } from '@tanstack/react-query'
import type { ByDayRangeData } from '@/types/trading'
import type { OpportunitiesResponse, StrategyInstancesResponse } from '@/types/strategy'
import type { PerformanceTimeRange } from '@/utils/ledger/performanceUtils'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtPnl, fmtUsd, formatRangeDate } from './performanceFormatters'
import { computeByDayRangeTotals } from './performanceRangeTotals'
import { TIME_RANGE_OPTIONS } from './performanceConstants'
import styles from '@/components/performance/performanceCalendar.module.css'

interface PerformanceFilterBarProps {
  timeRange: PerformanceTimeRange
  onTimeRange: (v: PerformanceTimeRange) => void
  sinceStr: string
  untilStr: string
  selectedOppId: number | null
  selectedInstId: number | null
  onOppChange: (v: string) => void
  onInstChange: (v: string) => void
  oppQuery: UseQueryResult<OpportunitiesResponse>
  instQuery: UseQueryResult<StrategyInstancesResponse>
  byDayRangeData: ByDayRangeData | null | undefined
  isLoading?: boolean
}

function toneClass(value: number, unrealized = false): string {
  if (Math.abs(value) < 0.005) return styles.sumNumber
  if (unrealized) return styles.toneUnrealized
  return value >= 0 ? styles.tonePositive : styles.toneNegative
}

export function PerformanceFilterBar({
  timeRange,
  onTimeRange,
  sinceStr,
  untilStr,
  selectedOppId,
  selectedInstId,
  onOppChange,
  onInstChange,
  oppQuery,
  instQuery,
  byDayRangeData,
  isLoading,
}: PerformanceFilterBarProps) {
  const totals = computeByDayRangeTotals(byDayRangeData)

  return (
    <div className={styles.filterBar} aria-label="Time range and daily statistics">
      {isLoading && (
        <p className="text-xs text-muted-foreground">Loading…</p>
      )}
      <div className={styles.filterGroup}>
        <fieldset className={styles.filterFieldset} aria-label="Time range">
          <span className={styles.filterLegend}>Time range</span>
          <div className={styles.timeRangePills} role="group">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  styles.timeRangePill,
                  timeRange === opt.id && styles.timeRangePillActive,
                )}
                onClick={() => onTimeRange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.filterFieldset} aria-label="Strategy filter">
          <span className={styles.filterLegend}>Strategy</span>
          <Select
            value={selectedOppId != null ? String(selectedOppId) : 'all'}
            onValueChange={onOppChange}
          >
            <SelectTrigger className={cn(styles.filterSelect, 'w-[9.5rem]')}>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(oppQuery.data?.items ?? []).map((o) => (
                <SelectItem key={o.strategy_opportunity_id} value={String(o.strategy_opportunity_id)}>
                  {o.name ?? `#${o.strategy_opportunity_id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>

        <fieldset className={styles.filterFieldset} aria-label="Instance filter">
          <span className={styles.filterLegend}>Instance</span>
          <Select
            value={selectedInstId != null ? String(selectedInstId) : 'all'}
            onValueChange={onInstChange}
            disabled={selectedOppId == null}
          >
            <SelectTrigger className={cn(styles.filterSelect, 'w-[9.5rem]')}>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {(instQuery.data?.items ?? []).map((i) => (
                <SelectItem key={i.strategy_instance_id} value={String(i.strategy_instance_id)}>
                  {i.label ?? `#${i.strategy_instance_id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>

        <span className={styles.rangeLabel} aria-label="Trade range">
          <span className={styles.rangeLabelTitle}>Range</span>
          {formatRangeDate(sinceStr)} ~ {formatRangeDate(untilStr)}
        </span>

        {totals && (
          <span className={styles.assetTotalsInline} aria-label="Total sum of all days">
            <span className={styles.assetTotalKv}>
              Option{' '}
              <span className={toneClass(totals.optRealized)}>{fmtPnl(totals.optRealized)}</span>
              {' / '}
              <span className={toneClass(totals.optUnrealized, true)}>{fmtPnl(totals.optUnrealized)}</span>
            </span>
            <span className={styles.assetTotalKv}>
              Stocks{' '}
              <span className={styles.sumNumber}>{fmtUsd(totals.stocksNotional)}</span>
              {' / '}
              <span className={toneClass(totals.stocksRealized)}>{fmtPnl(totals.stocksRealized)}</span>
            </span>
            <span className={styles.assetTotalKv}>
              FI{' '}
              <span className={styles.sumNumber}>{fmtUsd(totals.fiNotional)}</span>
              {' / '}
              <span className={toneClass(totals.fiRealized)}>{fmtPnl(totals.fiRealized)}</span>
            </span>
            <span className={styles.assetTotalKv}>
              Cash-like{' '}
              <span className={styles.sumNumber}>{fmtUsd(totals.cashNotional)}</span>
              {' / '}
              <span className={toneClass(totals.cashRealized)}>{fmtPnl(totals.cashRealized)}</span>
            </span>
          </span>
        )}
      </div>
    </div>
  )
}
