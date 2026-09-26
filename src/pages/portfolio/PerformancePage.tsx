import { useState, useMemo, useCallback, useRef } from 'react'
import { useOpportunities, useStrategyInstances } from '@/hooks/useStrategies'
import { usePerformanceBulk } from '@/hooks/usePerformanceBulk'
import { usePerformanceQuery } from '@/hooks/usePerformanceQuery'
import {
  getTimeRangeDates,
  getTimeRangeStamps,
  type PerformanceTimeRange,
} from '@/utils/ledger/performanceUtils'
import { sumStkPositionMarketValueForBucket } from '@/utils/ledger/stkBuckets'
import { buildEquityGrowthChart, DEFAULT_LAYERS_VISIBLE, type GrowthLayer, type OptionsPnLMode } from '@/utils/ledger/equityGrowthChart'
import { buildFiBarChart } from '@/utils/ledger/fiBarChart'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { HeroCard, HeroRow, PageHead, PageShell, SectionHead } from '@/components/layout'
import { ViewState } from '@bifrost/ui'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { AsofTag } from '@/components/AsofTag'
import { EquityGrowthCard } from '@/pages/portfolio/performance/components/EquityGrowthCard'
import MonthlyPnLTable from '@/pages/portfolio/performance/components/MonthlyPnLTable'
import OptionsModeBridgePanel from '@/pages/portfolio/performance/components/OptionsModeBridgePanel'
import { buildPositionCategoryByAccountContract, serializePositionCategoryKey } from '@/utils/ledger/stkBuckets'
import { PerformanceFilterBar } from '@/pages/portfolio/performance/PerformanceFilterBar'
import { PerformanceCalendarSection } from '@/pages/portfolio/performance/PerformanceCalendarSection'
import { PerformanceOnTheFlySection } from '@/pages/portfolio/performance/PerformanceOnTheFlySection'
import { PerformanceLayerChips, type LayerChipValues } from '@/pages/portfolio/performance/PerformanceLayerChips'
import { PerformanceReadingPanel } from '@/pages/portfolio/performance/PerformanceReadingPanel'
import { PerformanceReturnBasis } from '@/pages/portfolio/performance/PerformanceReturnBasis'
import { buildReadingMetrics, buildScopeNote } from '@/utils/performanceReading'
import { readingToneClass, splitReading } from '@/utils/performanceHeroes'
import {
  PERFORMANCE_TREES,
  dayCellDerivation,
  equityGrowthDerivation,
  onTheFlyDerivation,
  optionsModeDerivation,
  type PerformanceTree,
} from '@/pages/portfolio/performance/performanceDerivations'
import { DerivationBlock } from '@/components/positions/DerivationBlock'
import { buildOptionsModeBridgeSummary } from '@/utils/ledger/optionsModeBridge'
import {
  buildCalendarGrid,
  buildDayMapFromApi,
  buildDayMapFromBulk,
  type CalendarAssetTab,
} from '@/pages/portfolio/performance/performanceCalendarModel'

const PAGE_LEAD =
  'Did the system make money — by layer, by month, by day. Deposits and withdrawals recorded in Transfer & Pay are not P&L.'

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const RANGE_WORD: Record<PerformanceTimeRange, string> = {
  month: 'this month',
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
  const [tree, setTree] = useState<PerformanceTree | null>(null)
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

  const { sinceTs, untilTs } = useMemo(
    () => getTimeRangeStamps(timeRange, calendarMonth),
    [timeRange, calendarMonth],
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
      lastDate: todayIso(),
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
          lastDate: todayIso(),
        })
    if (!usd) return null
    const { options, stocks, fixed_income, cash_like } = usd.last
    return {
      last: { options, stocks, fixed_income, cash_like },
      optionsOpen: bulk.optAsOf?.openUnrealized ?? null,
    }
  }, [bulk, perf, growthUnit, equityGrowthChart, growthLayersVisible, optionsPnLMode])

  const bridgeSummary = useMemo(() => {
    if (!bulk?.byDayRangeData) return null
    return buildOptionsModeBridgeSummary({
      byDayRangeData: bulk.byDayRangeData,
      openUnrealized: bulk.optAsOf?.openUnrealized ?? 0,
      sameDayRolls: bulk.sameDayRolls ?? [],
    })
  }, [bulk])

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

  const derivation = useMemo(() => {
    if (tree === 'bridge') return optionsModeDerivation(bridgeSummary, bulk?.optAsOf?.asOfDateStr ?? null)
    if (tree === 'equity') {
      return equityGrowthDerivation({
        last: chipValues?.last ?? null,
        netPnl: equityGrowthChart?.last.totalRaw ?? null,
        bookR: bridgeSummary?.bookR ?? null,
        visible: growthLayersVisible,
        mode: optionsPnLMode,
      })
    }
    if (tree === 'calendar') {
      const cell = selectedDay
        ? calendarGrid.flatMap((w) => w.days).find((c) => c?.date === selectedDay) ?? null
        : null
      return dayCellDerivation(calendarAssetTab, cell)
    }
    if (tree === 'otf') return onTheFlyDerivation()
    return null
  }, [tree, bridgeSummary, bulk, chipValues, equityGrowthChart, growthLayersVisible, optionsPnLMode, selectedDay, calendarGrid, calendarAssetTab])

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

  /** Open a derivation from a panel's footer link and bring it into view. */
  const explain = useCallback((id: PerformanceTree) => {
    setTree(id)
    requestAnimationFrame(() =>
      document.getElementById('performance-derivation')?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
    )
  }, [])

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

  // §17.1: the performance read is the page's critical source. A failed read
  // with nothing to show is one failure; a failed refresh is a strip over the
  // last copy. The sections below that read the daily bulk keep their own states.
  const view = sourceState(perfQuery)
  const retry = () => void perfQuery.refetch()
  const { heroes, strip } = splitReading(readingMetrics, RANGE_WORD[timeRange])

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Performance"
        info={PAGE_LEAD}
        // Grey, and it will stay grey until something reports a session. The
        // page's own `optAsOf.asOfDateStr` is `chicagoTodayDateStr()` — the
        // browser's clock, not a reading — and printing a clock as a session
        // is the mistake this badge exists to prevent. Accounts is where the
        // book's freshness is actually judged.
        stamp={<AsofTag asof={null} judgedBy="Account Sync" href="/portfolio/accounts" />}
      />

      {/* One toolbar, above the data (§17.3, Rev .82): the range and scope, and
          the four derivations after the rule — so they stay while it loads. */}
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
        trees={PERFORMANCE_TREES}
        openTree={tree}
        onTree={(id) => setTree((cur) => (cur === id ? null : (id as PerformanceTree)))}
      />

      {view === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh performance history"
          detail={staleDetail(perfQuery, 'today’s P&L may be incomplete.')}
          onAction={retry}
        />
      ) : null}
      {view === 'loading' ? (
        <section className="overflow-hidden border mat-card">
          <ViewState kind="loading" title="Loading performance history" rows={8} cols={6} />
        </section>
      ) : null}
      {view === 'failed' ? (
        <section className="overflow-hidden border mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load performance history"
            detail={failedDetail(perfQuery, 'Returns were not computed — a blank chart here is not a flat period.')}
            onAction={retry}
          />
        </section>
      ) : null}

      {/* §16.2: the Profitability group is the hero row; the strip below keeps
          Consistency and Risk only, so nothing is printed twice. */}
      {heroes.length > 0 ? (
        <HeroRow label="Profitability">
          {heroes.map((h) => (
            <HeroCard
              key={h.label}
              label={h.label}
              value={h.value}
              valueClassName={readingToneClass(h.tone, h.raw)}
              sub={h.sub}
              title={h.title}
            />
          ))}
        </HeroRow>
      ) : null}

      <SectionHead
        note="Each card carries realized and unrealized, and switches its layer on the curve below"
        meta={RANGE_WORD[timeRange]}
      >
        By layer
      </SectionHead>
      <PerformanceLayerChips
        values={chipValues}
        layersVisible={growthLayersVisible}
        onLayerToggle={handleLayerToggle}
        optionsPnLMode={optionsPnLMode}
        netCashFlow={perf?.transaction?.net_cash_flow ?? null}
      />
      {derivation && (
        <div id="performance-derivation">
          <DerivationBlock derivation={derivation} onClose={() => setTree(null)} className="mt-0" />
        </div>
      )}
      {view === 'loading' || view === 'failed' ? null : (
        <>
          <PerformanceReadingPanel rangeLabel={RANGE_WORD[timeRange]} metrics={strip} />
          <PerformanceReturnBasis perf={perf} rangeEndsToday={rangeEndsToday} />
        </>
      )}

      <SectionHead note="How it got here">Shape</SectionHead>
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
        rangeStart={sinceStr}
        rangeLabel={RANGE_WORD[timeRange]}
        onExplainCell={() => explain('calendar')}
      />

      <SectionHead note="Above looks at trend — below reconciles. Month rows open into days; a day opens its records beside the calendar, in the Summary slot.">
        Audit
      </SectionHead>
      <MonthlyPnLTable
        byDayRangeData={bulk?.byDayRangeData ?? null}
        optOpenByOpenMonth={bulk?.byDayRangeData?.optOpenByOpenMonth ?? null}
        optOpenLegs={bulk?.optOpenLegs ?? null}
        asOfDateStr={bulk?.optAsOf?.asOfDateStr ?? null}
        isLoading={bulkQuery.isLoading}
        isError={bulkQuery.isError}
        onRetry={() => void bulkQuery.refetch()}
        onOpenDay={openDayFromAudit}
        selectedDay={dayPanel === 'records' ? selectedDay : null}
        onGlossary={() => explain('calendar')}
      />

      <PerformanceOnTheFlySection
        timeRange={timeRange}
        calendarMonth={calendarMonth}
        strategyOpportunityId={selectedOppId}
        strategyInstanceId={selectedInstId}
        onExplain={() => explain('otf')}
      />
    </PageShell>
  )
}
