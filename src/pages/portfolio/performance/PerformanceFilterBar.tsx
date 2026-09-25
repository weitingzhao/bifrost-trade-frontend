import type { UseQueryResult } from '@tanstack/react-query'
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
import { SegmentControl, type SegmentOption } from '@/components/data-display'
import { formatRangeDate } from './performanceFormatters'
import { TIME_RANGE_OPTIONS } from './performanceConstants'
import { perfUi } from './performanceUi'

const TIME_RANGE_SEGMENT_OPTIONS: SegmentOption[] = TIME_RANGE_OPTIONS.map(o => ({
  value: o.id,
  label: o.label,
}))

const selectTrigger = 'h-5.5 w-[10.5rem] rounded-sm border-border bg-background px-1.5 text-dense-body'

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
  /** `N active days · N trades · capital base $X`. */
  scopeNote: string
  isLoading?: boolean
}

/** What the page is reading: the range, the strategy and instance it is narrowed to, and how much that holds. */
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
  scopeNote,
  isLoading,
}: PerformanceFilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border px-2.5 py-1.75 mat-card"
      aria-label="Time range and strategy scope"
    >
      <span className="inline-flex items-center gap-2">
        <span className={perfUi.cap}>Time range</span>
        <SegmentControl
          size="xs"
          options={TIME_RANGE_SEGMENT_OPTIONS}
          value={timeRange}
          onChange={v => onTimeRange(v as PerformanceTimeRange)}
          ariaLabel="Time range"
        />
      </span>

      <label className="inline-flex items-center gap-1.5 text-dense-body text-muted-foreground">
        Strategy
        <Select value={selectedOppId != null ? String(selectedOppId) : 'all'} onValueChange={onOppChange}>
          <SelectTrigger className={selectTrigger} aria-label="Strategy">
            <SelectValue placeholder="All strategies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All strategies</SelectItem>
            {(oppQuery.data?.items ?? []).map(o => (
              <SelectItem key={o.strategy_opportunity_id} value={String(o.strategy_opportunity_id)}>
                {o.name ?? `#${o.strategy_opportunity_id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="inline-flex items-center gap-1.5 text-dense-body text-muted-foreground">
        Instance
        <Select
          value={selectedInstId != null ? String(selectedInstId) : 'all'}
          onValueChange={onInstChange}
          disabled={selectedOppId == null}
        >
          <SelectTrigger className={selectTrigger} aria-label="Instance">
            <SelectValue placeholder="All instances" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All instances</SelectItem>
            {(instQuery.data?.items ?? []).map(i => (
              <SelectItem key={i.strategy_instance_id} value={String(i.strategy_instance_id)}>
                {i.label ?? `#${i.strategy_instance_id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <span
        className={cn(perfUi.mono, 'whitespace-nowrap border px-1.75 py-0.5 text-dense-meta text-muted-foreground mat-tag')}
        aria-label="Trade range"
      >
        RANGE {formatRangeDate(sinceStr)} ~ {formatRangeDate(untilStr)}
      </span>

      <span className={cn(perfUi.mono, 'ml-auto whitespace-nowrap text-dense-meta text-muted-foreground')}>
        {isLoading ? 'Loading…' : scopeNote}
      </span>
    </div>
  )
}
