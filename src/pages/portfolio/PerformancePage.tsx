import { useState, useMemo, useCallback } from 'react'
import { useOpportunities, useStrategyInstances } from '@/hooks/useStrategies'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { usePerformanceQuery } from '@/hooks/usePerformanceQuery'
import {
  getTimeRangeDates,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'
import { sumStkPositionMarketValueForBucket } from '@/utils/ledger/stkBuckets'
import { buildEquityGrowthChart, DEFAULT_LAYERS_VISIBLE, type GrowthLayer } from '@/utils/ledger/equityGrowthChart'
import { buildFiBarChart } from '@/utils/ledger/fiBarChart'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { PageHeader, PageShell } from '@/components/layout'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { EquityGrowthCard } from '@/components/performance/EquityGrowthCard'
import MonthlyPnLTable from '@/components/performance/MonthlyPnLTable'
import { buildPositionCategoryByAccountContract, serializePositionCategoryKey } from '@/utils/ledger/stkBuckets'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { PerformanceFilterBar } from '@/pages/portfolio/performance/PerformanceFilterBar'
import { PerformanceCalendarSection } from '@/pages/portfolio/performance/PerformanceCalendarSection'
import { PerformanceOnTheFlySection } from '@/pages/portfolio/performance/PerformanceOnTheFlySection'
import { PERFORMANCE_HELP } from '@/pages/portfolio/performance/performanceConstants'
import {
  buildCalendarGrid,
  buildDayMapFromApi,
  buildDayMapFromBulk,
  type CalendarAssetTab,
} from '@/pages/portfolio/performance/performanceCalendarModel'
import styles from '@/components/performance/performanceCalendar.module.css'
import pageStyles from '@/pages/portfolio/performance/PerformancePage.module.css'

export default function PerformancePage() {
  const [timeRange, setTimeRange] = useState<PerformanceTimeRange>('quarter')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [calendarAssetTab, setCalendarAssetTab] = useState<CalendarAssetTab>('options')
  const [selectedOppId, setSelectedOppId] = useState<number | null>(null)
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [growthUnit, setGrowthUnit] = useState<'pct' | 'usd'>('usd')
  const [growthLayersVisible, setGrowthLayersVisible] = useState(DEFAULT_LAYERS_VISIBLE)

  const handleLayerToggle = useCallback((layer: GrowthLayer) => {
    setGrowthLayersVisible((prev) => ({ ...prev, [layer]: !prev[layer] }))
  }, [])

  const { sinceStr, untilStr } = useMemo(
    () => getTimeRangeDates(timeRange, calendarMonth),
    [timeRange, calendarMonth],
  )

  const sinceTs = useMemo(() => Math.floor(new Date(sinceStr).getTime() / 1000), [sinceStr])
  const untilTs = useMemo(
    () => Math.floor(new Date(untilStr + 'T23:59:59').getTime() / 1000),
    [untilStr],
  )

  const oppQuery = useOpportunities()
  const instQuery = useStrategyInstances(selectedOppId != null ? { opportunityId: selectedOppId } : undefined)

  const perfQuery = usePerformanceQuery({
    since_ts: sinceTs,
    until_ts: untilTs,
    strategy_opportunity_id: selectedOppId ?? undefined,
    strategy_instance_id: selectedInstId ?? undefined,
  })

  const perf = perfQuery.data
  const summary = perf?.summary

  const bulkQuery = usePerformanceBulk({
    timeRange,
    calendarMonth,
    strategyOpportunityId: selectedOppId,
    strategyInstanceId: selectedInstId,
  })
  const bulk = bulkQuery.data

  const { data: monitorStatus } = useMonitorStatus()

  const positionCategoryKey = useMemo(
    () => serializePositionCategoryKey(monitorStatus),
    [monitorStatus],
  )
  const positionCategoryByAccountContract = useMemo(
    () => buildPositionCategoryByAccountContract(monitorStatus),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [positionCategoryKey],
  )

  const equityGrowthChart = useMemo(() => {
    if (!bulk?.byDayRangeData) return null
    const capitalBase = perf?.transaction?.capital_base
      ?? perf?.transaction?.start_equity ?? null
    return buildEquityGrowthChart({
      byDayRangeData: bulk.byDayRangeData,
      capitalBase,
      growthUnit,
      layersVisible: growthLayersVisible,
    })
  }, [bulk, perf, growthUnit, growthLayersVisible])

  const fiBarData = useMemo(() => {
    if (!bulk?.byDayRangeData) return null
    const fiMv = sumStkPositionMarketValueForBucket(monitorStatus, 'fixed_income')
    return buildFiBarChart({
      byDayRangeData: bulk.byDayRangeData,
      fiPositionMarketValue: fiMv,
      timeRange,
      calendarMonth,
      growthUnit,
    })
  }, [bulk, monitorStatus, timeRange, calendarMonth, growthUnit])

  const dayMapByTab = useMemo(() => {
    if (bulk?.calendarDayPnLByAsset && bulk.calendarStkNotionalByBucket) {
      return buildDayMapFromBulk(bulk.calendarDayPnLByAsset, bulk.calendarStkNotionalByBucket)
    }
    return buildDayMapFromApi(perf)
  }, [bulk, perf])

  const activeDayMap = useMemo(
    () => dayMapByTab[calendarAssetTab],
    [dayMapByTab, calendarAssetTab],
  )

  const calendarGrid = useMemo(
    () => buildCalendarGrid(calendarMonth, activeDayMap),
    [calendarMonth, activeDayMap],
  )

  const shiftMonth = useCallback(
    (delta: number) => {
      const [y, m] = calendarMonth.split('-').map(Number)
      const d = new Date(y, m - 1 + delta, 1)
      const ny = d.getFullYear()
      const nm = String(d.getMonth() + 1).padStart(2, '0')
      setCalendarMonth(`${ny}-${nm}`)
      setSelectedDay(null)
    },
    [calendarMonth],
  )

  const handleOppChange = useCallback((v: string) => {
    setSelectedOppId(v === 'all' ? null : Number(v))
    setSelectedInstId(null)
  }, [])

  const handleInstChange = useCallback((v: string) => {
    setSelectedInstId(v === 'all' ? null : Number(v))
  }, [])

  const filtersLoading = perfQuery.isLoading || bulkQuery.isLoading

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={styles.pageCard} aria-label="Performance">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Performance</p>}
          title={
            <span className="inline-flex items-center gap-1.5">
              Performance
              <InfoTooltip text={PERFORMANCE_HELP} />
            </span>
          }
        />

        {perfQuery.isError && (
          <QueryErrorAlert
            error={perfQuery.error}
            onRetry={() => void perfQuery.refetch()}
          />
        )}

        <section
          className={pageStyles.timeRangeBlock}
          aria-label="Time range and daily statistics"
        >
          <PerformanceFilterBar
            timeRange={timeRange}
            onTimeRange={setTimeRange}
            sinceStr={sinceStr}
            untilStr={untilStr}
            selectedOppId={selectedOppId}
            selectedInstId={selectedInstId}
            onOppChange={handleOppChange}
            onInstChange={handleInstChange}
            oppQuery={oppQuery}
            instQuery={instQuery}
            byDayRangeData={bulk?.byDayRangeData}
            isLoading={filtersLoading}
          />

          <EquityGrowthCard
            chartData={equityGrowthChart}
            fiBarData={fiBarData}
            growthUnit={growthUnit}
            onGrowthUnitChange={setGrowthUnit}
            layersVisible={growthLayersVisible}
            onLayerToggle={handleLayerToggle}
          />

          <MonthlyPnLTable
            byDayRangeData={bulk?.byDayRangeData ?? null}
            isLoading={bulkQuery.isLoading}
            className={pageStyles.byDayTableWrap}
          />
        </section>

        <PerformanceCalendarSection
          calendarMonth={calendarMonth}
          calendarAssetTab={calendarAssetTab}
          onCalendarAssetTab={setCalendarAssetTab}
          onShiftMonth={shiftMonth}
          calendarGrid={calendarGrid}
          selectedDay={selectedDay}
          onSelectedDay={setSelectedDay}
          summary={summary}
          perf={perf}
          bulk={bulk}
          isLoading={filtersLoading}
          positionCategoryByAccountContract={positionCategoryByAccountContract}
        />

        <PerformanceOnTheFlySection
          timeRange={timeRange}
          calendarMonth={calendarMonth}
          strategyOpportunityId={selectedOppId}
          strategyInstanceId={selectedInstId}
        />
      </section>
    </PageShell>
  )
}
