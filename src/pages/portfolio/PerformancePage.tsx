import { useState, useMemo, useCallback, useRef } from 'react'
import { useOpportunities, useStrategyInstances } from '@/hooks/useStrategies'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { usePerformanceQuery } from '@/hooks/usePerformanceQuery'
import {
  getTimeRangeDates,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'
import { sumStkPositionMarketValueForBucket } from '@/utils/ledger/stkBuckets'
import { buildEquityGrowthChart, DEFAULT_LAYERS_VISIBLE, type GrowthLayer, type OptionsPnLMode } from '@/utils/ledger/equityGrowthChart'
import { buildFiBarChart } from '@/utils/ledger/fiBarChart'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { PageHeader, PageShell } from '@/components/layout'
import { EquityGrowthCard } from '@/pages/portfolio/performance/components/EquityGrowthCard'
import MonthlyPnLTable from '@/pages/portfolio/performance/components/MonthlyPnLTable'
import OptionsModeBridgePanel from '@/pages/portfolio/performance/components/OptionsModeBridgePanel'
import { buildPositionCategoryByAccountContract, serializePositionCategoryKey } from '@/utils/ledger/stkBuckets'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { PerformanceFilterBar } from '@/pages/portfolio/performance/PerformanceFilterBar'
import { PerformanceCalendarSection } from '@/pages/portfolio/performance/PerformanceCalendarSection'
import { PerformanceOnTheFlySection } from '@/pages/portfolio/performance/PerformanceOnTheFlySection'
import { PerformanceTier } from '@/pages/portfolio/performance/PerformanceTier'
import { PerformanceLayerChips, type LayerChipValues } from '@/pages/portfolio/performance/PerformanceLayerChips'
import { PerformanceReadingPanel } from '@/pages/portfolio/performance/PerformanceReadingPanel'
import { PerformanceReturnBasis } from '@/pages/portfolio/performance/PerformanceReturnBasis'
import { buildReadingMetrics, buildScopeNote } from '@/pages/portfolio/performance/performanceReading'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'
import {
  buildCalendarGrid,
  buildDayMapFromApi,
  buildDayMapFromBulk,
  type CalendarAssetTab,
} from '@/pages/portfolio/performance/performanceCalendarModel'

const PAGE_LEAD =
  'Did the system make money — by layer, by month, by day. Deposits and withdrawals recorded in Transfer & Pay are not P&L.'

const RANGE_WORD: Record<PerformanceTimeRange, string> = {
  quarter: 'this quarter',
  halfyear: 'half year',
  year: 'year',
  '3year': '3 years',
}

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
  const [dayPanel, setDayPanel] = useState<'summary' | 'records'>('summary')
  const daySlotRef = useRef<HTMLElement>(null)
  const [growthUnit, setGrowthUnit] = useState<'pct' | 'usd'>('usd')
  const [growthLayersVisible, setGrowthLayersVisible] = useState(DEFAULT_LAYERS_VISIBLE)
  const [optionsPnLMode, setOptionsPnLMode] = useState<OptionsPnLMode>('book')

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
      optionsMode: optionsPnLMode,
    })
  }, [bulk, perf, growthUnit, growthLayersVisible, optionsPnLMode])

  // The chips speak dollars whatever the curve's unit; same builder, same last point.
  const chipValues = useMemo((): LayerChipValues | null => {
    if (!bulk?.byDayRangeData) return null
    const usd =
      growthUnit === 'usd'
        ? equityGrowthChart
        : buildEquityGrowthChart({
          byDayRangeData: bulk.byDayRangeData,
          capitalBase: perf?.transaction?.capital_base ?? perf?.transaction?.start_equity ?? null,
          growthUnit: 'usd',
          layersVisible: growthLayersVisible,
          optionsMode: optionsPnLMode,
        })
    if (!usd) return null
    const { options, stocks, fixed_income, cash_like } = usd.last
    return {
      last: { options, stocks, fixed_income, cash_like },
      optionsOpen: bulk.optAsOf?.openUnrealized ?? null,
    }
  }, [bulk, perf, growthUnit, equityGrowthChart, growthLayersVisible, optionsPnLMode])

  const readingMetrics = useMemo(() => buildReadingMetrics(perf), [perf])
  const scopeNote = useMemo(() => buildScopeNote(bulk?.byDayRangeData, perf), [bulk, perf])
  const rangeEndsToday = useMemo(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return untilStr >= today
  }, [untilStr])

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
      setDayPanel('summary')
    },
    [calendarMonth],
  )

  /** From the audit table: open that day's records beside the calendar. */
  const openDayFromAudit = useCallback((date: string) => {
    setCalendarMonth(date.slice(0, 7))
    setSelectedDay(date)
    setDayPanel('records')
    requestAnimationFrame(() => daySlotRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }, [])

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
      <section className={perfUi.pageCard} aria-label="Performance">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Portfolio / Performance</p>}
          title="Performance"
          titleSize="large"
          description={PAGE_LEAD}
        />

        {perfQuery.isError && (
          <QueryErrorAlert
            error={perfQuery.error}
            onRetry={() => void perfQuery.refetch()}
          />
        )}

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
          scopeNote={scopeNote}
          isLoading={filtersLoading}
        />

        <PerformanceTier
          label="Reading"
          note="each chip carries what the layer made and switches that layer on the curve below"
        />
        <PerformanceLayerChips
          values={chipValues}
          layersVisible={growthLayersVisible}
          onLayerToggle={handleLayerToggle}
          optionsPnLMode={optionsPnLMode}
          netCashFlow={perf?.transaction?.net_cash_flow ?? null}
        />
        <PerformanceReadingPanel rangeLabel={RANGE_WORD[timeRange]} metrics={readingMetrics} />
        <PerformanceReturnBasis perf={perf} rangeEndsToday={rangeEndsToday} />

        <PerformanceTier
          label="Shape"
          note="how it got here · the switches on the curve reach the curve only"
        />
        <div className="flex flex-col gap-3.5">
          <EquityGrowthCard
            chartData={equityGrowthChart}
            fiBarData={fiBarData}
            growthUnit={growthUnit}
            onGrowthUnitChange={setGrowthUnit}
            layersVisible={growthLayersVisible}
            onLayerToggle={handleLayerToggle}
            optionsPnLMode={optionsPnLMode}
            onOptionsPnLModeChange={setOptionsPnLMode}
          />

          <OptionsModeBridgePanel
            byDayRangeData={bulk?.byDayRangeData ?? null}
            openUnrealized={bulk?.optAsOf?.openUnrealized ?? 0}
            sameDayRolls={bulk?.sameDayRolls ?? []}
            asOfDateStr={bulk?.optAsOf?.asOfDateStr ?? null}
            optionsPnLMode={optionsPnLMode}
          />
        </div>

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
          rightTab={dayPanel}
          onRightTab={setDayPanel}
          slotRef={daySlotRef}
        />

        <PerformanceTier
          label="Audit"
          note="above looks at trend — below reconciles. Month rows open into days."
        />
        <MonthlyPnLTable
          byDayRangeData={bulk?.byDayRangeData ?? null}
          optOpenByOpenMonth={bulk?.byDayRangeData?.optOpenByOpenMonth ?? null}
          optOpenLegs={bulk?.optOpenLegs ?? null}
          asOfDateStr={bulk?.optAsOf?.asOfDateStr ?? null}
          isLoading={bulkQuery.isLoading}
          isError={bulkQuery.isError}
          onRetry={() => void bulkQuery.refetch()}
          onOpenDay={openDayFromAudit}
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
