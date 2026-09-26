import { useCallback, useMemo, useState } from 'react'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import {
  PageFaceSwitch,
  PageHeader,
  PageShell,
  SectionPanel,
  SECTION_CAP_CLASS,
} from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import {
  EXT_COND_CATALOG,
  EXT_GROUP_LABELS,
  SEPA_COND_CATALOG,
  STRUCTURE_INDICATORS,
  SENTIMENT_INDICATORS,
  TECH_COND_CATALOG,
  TECH_GROUP_LABELS,
  TIER_CATALOG,
} from '@/constants/stockScreenerCatalog'
import {
  useConditionPassLoader,
  useDistributionBucketLoader,
  useStockScreenerCriteria,
} from '@/hooks/useStockScreenerCriteria'
import { useStockScreenerFilters } from '@/hooks/useStockScreenerFilters'
import { useReadinessSort, useSymbolsReadinessSnapshot } from '@/hooks/useSymbolsReadinessSnapshot'
import { CollapsibleFilterPanel } from './stockScreener/CollapsibleFilterPanel'
import { ConditionChipGroup } from './stockScreener/ConditionChipGroup'
import { FilterActionBar } from './stockScreener/FilterActionBar'
import { ReadinessResultsTable } from './stockScreener/ReadinessResultsTable'
import { SEGMENT } from './stockScreener/segmentStyles'
import { SepaHeroCard } from './stockScreener/SepaHeroCard'
import { SymbolsStrip } from './stockScreener/SymbolsStrip'
import { TierFilterCard } from './stockScreener/TierFilterCard'
import { screenerStackColClass } from './stockScreener/stockScreenerUi'
import { ScreenerFunnelPanel } from './stockScreener/ScreenerFunnelPanel'
import { FUNNEL_STAGES, atLeast } from './stockScreener/screenerFunnel'
import { useNarrativeWindow } from '@/hooks/useNarrative'
import {
  NARRATIVE_CONDITIONS,
  NARRATIVE_WINDOW_DAYS,
  isNarrativeCondition,
  namesByCondition,
  namesPassing,
} from '@/lib/research/narrativeItems'
import { SCREENER_PRESETS, PRESET_PAGE_LIMIT } from './stockScreener/screenerPresets'
import { fetchMomentumRadar } from '@/api/researchEngine'
import { useQuery } from '@tanstack/react-query'
import type { ReadinessSnapshotRow } from '@/types/stockScreener'
import { formatCriteriaAsOf, prepareDistBuckets } from '@/utils/stockScreener'

export default function StockScreenerPage() {
  const [symbolText, setSymbolText] = useState('')
  // The design's `min` stepper, per stage that has one. Its defaults are the
  // prototype's: eight of the eleven trend conditions, none of the growth.
  const [mins, setMins] = useState<Record<string, number>>(() =>
    Object.fromEntries(FUNNEL_STAGES.filter((st) => st.min != null).map((st) => [st.id, st.min!])),
  )
  const [inspector, setInspector] = useState<{
    symbol: string
    seed?: { passCount: number; passedConditions?: string[]; insufficientData?: boolean }
  } | null>(null)

  const { data: criteriaStats, isLoading: criteriaLoading, error: criteriaQueryError, refetch } = useStockScreenerCriteria()

  const setSymbolsFromBucket = useCallback((syms: string[]) => {
    setSymbolText(syms.join(','))
  }, [])

  const fundBucket = useDistributionBucketLoader('fund', setSymbolsFromBucket)
  const techBucket = useDistributionBucketLoader('tech', setSymbolsFromBucket)
  const fundCond = useConditionPassLoader('fund', setSymbolsFromBucket)
  const techCond = useConditionPassLoader('tech', setSymbolsFromBucket)

  const filters = useStockScreenerFilters()

  const readiness = useSymbolsReadinessSnapshot(symbolText)
  const { sortCol, sortDir, toggleSort, sortedRows } = useReadinessSort(readiness.rows)

  const techAsOf = formatCriteriaAsOf(
    criteriaStats?.technical.eval_date ?? criteriaStats?.computed_at,
  )
  const fundAsOf = formatCriteriaAsOf(
    criteriaStats?.fundamental.eval_date ?? criteriaStats?.computed_at,
  )
  const criteriaError = criteriaQueryError instanceof Error ? criteriaQueryError.message : null

  const fundDist = useMemo(
    () => prepareDistBuckets(criteriaStats?.fundamental?.pass_count_distribution),
    [criteriaStats],
  )
  const techDist = useMemo(
    () => prepareDistBuckets(criteriaStats?.technical?.pass_count_distribution, 8),
    [criteriaStats],
  )

  const clearHeroSelection = useCallback(() => {
    fundBucket.clearActive()
    techBucket.clearActive()
    fundCond.clearActive()
    techCond.clearActive()
    filters.clearFilterPreview()
  }, [fundBucket, techBucket, fundCond, techCond, filters])

  const handleFundBucketClick = useCallback((n: number, count: number) => {
    techBucket.clearActive()
    fundCond.clearActive()
    techCond.clearActive()
    filters.clearFilterPreview()
    fundBucket.handleBucketClick(n, count)
  }, [techBucket, fundBucket, fundCond, techCond, filters])

  const handleTechBucketClick = useCallback((n: number, count: number) => {
    fundBucket.clearActive()
    fundCond.clearActive()
    techCond.clearActive()
    filters.clearFilterPreview()
    techBucket.handleBucketClick(n, count)
  }, [fundBucket, techBucket, fundCond, techCond, filters])

  const handleFundConditionClick = useCallback((id: string, passCount: number) => {
    techBucket.clearActive()
    fundBucket.clearActive()
    techCond.clearActive()
    filters.clearFilterPreview()
    fundCond.handleConditionClick(id, passCount)
  }, [techBucket, fundBucket, techCond, fundCond, filters])

  const handleTechConditionClick = useCallback((id: string, passCount: number) => {
    fundBucket.clearActive()
    techBucket.clearActive()
    fundCond.clearActive()
    filters.clearFilterPreview()
    techCond.handleConditionClick(id, passCount)
  }, [fundBucket, techBucket, fundCond, techCond, filters])

  const handleSymbolTextChange = useCallback((text: string) => {
    clearHeroSelection()
    setSymbolText(text)
  }, [clearHeroSelection])

  const handleApplyFilter = useCallback(() => {
    if (!filters.filterPreview) return
    fundBucket.clearActive()
    techBucket.clearActive()
    fundCond.clearActive()
    techCond.clearActive()
    setSymbolText(filters.filterPreview.symbols.join(','))
  }, [filters.filterPreview, fundBucket, techBucket, fundCond, techCond])

  const toggleInspector = useCallback((symbol: string, row?: ReadinessSnapshotRow) => {
    const sym = symbol.trim().toUpperCase()
    setInspector((prev) => {
      if (prev?.symbol === sym) return null
      if (!row) return { symbol: sym }
      return {
        symbol: sym,
        seed: {
          passCount: row.fundamental_pass_count ?? 0,
          passedConditions: row.passed_conditions,
          insufficientData: row.fundamental_insufficient,
        },
      }
    })
  }, [])

  // ── Condition group memos ──

  const techCondGroups = useMemo(() =>
    (['vol', 'price52', 'sma', 'price'] as const).map((g) => ({
      key: g,
      label: TECH_GROUP_LABELS[g],
      headerClass: SEGMENT.techGroupHeader[g],
      items: TECH_COND_CATALOG.filter((c) => c.group === g).map(({ id, label }) => ({
        id,
        label,
        chipClass: SEGMENT.techChip[g],
      })),
    })),
  [])

  const fundCoreGroups = useMemo(() =>
    (['eps', 'rev'] as const).map((g) => ({
      key: g,
      label: g === 'eps' ? 'EPS' : 'Revenue',
      headerClass: SEGMENT.fundGroupHeader[g],
      items: SEPA_COND_CATALOG.filter((c) => c.group === g).map(({ id, label }) => ({
        id,
        label,
        chipClass: SEGMENT.fundChip[g],
      })),
    })),
  [])

  const renderExtCard = (groupKey: string) => {
    const items = EXT_COND_CATALOG.filter((c) => c.group === groupKey)
    if (!items.length) return null
    return (
      <ConditionChipGroup
        key={groupKey}
        title={EXT_GROUP_LABELS[groupKey] ?? groupKey}
        cardAccentKey={groupKey}
        stacked
        groups={[{
          key: groupKey,
          label: EXT_GROUP_LABELS[groupKey] ?? groupKey,
          headerClass: SEGMENT.extTitle[groupKey],
          items: items.map(({ id, label }) => ({
            id,
            label,
            chipClass: SEGMENT.extChip[groupKey],
          })),
        }]}
        activeIds={filters.condFilter}
        onToggle={filters.toggleCondFilter}
        onClearGroup={() => filters.clearExtGroupFilter(groupKey, EXT_COND_CATALOG)}
      />
    )
  }

  // ── Summary tags for collapsed panels ──

  const techFilterActive = filters.techCondFilter.size
  const techMomActive = filters.tierFilters.momentum.indicators.size + (filters.tierFilters.momentum.minScore > 0 ? 1 : 0)
  const techStrActive = filters.tierFilters.structure.indicators.size + (filters.tierFilters.structure.minScore > 0 ? 1 : 0)
  const techSenActive = filters.tierFilters.sentiment.indicators.size + (filters.tierFilters.sentiment.minScore > 0 ? 1 : 0)
  const techTotalActive = techFilterActive + techMomActive + techStrActive + techSenActive

  const techTags = [
    techFilterActive > 0 && { label: 'SEPA', count: techFilterActive, colorClass: 'bg-violet-400/15 text-violet-700 dark:text-violet-300' },
    techMomActive > 0 && { label: 'Mom', count: techMomActive, colorClass: 'bg-amber-500/15 text-[var(--sk-warn)]' },
    techStrActive > 0 && { label: 'Str', count: techStrActive, colorClass: 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300' },
    techSenActive > 0 && { label: 'Sen', count: techSenActive, colorClass: 'bg-pink-400/15 text-pink-700 dark:text-pink-300' },
  ].filter(Boolean) as { label: string; count: number; colorClass: string }[]

  const fundFilterActive = filters.condFilter.size
  const fundTotalActive = fundFilterActive

  const fundTags = [
    fundFilterActive > 0 && { label: 'Conditions', count: fundFilterActive, colorClass: 'bg-emerald-400/15 text-emerald-700 dark:text-emerald-300' },
  ].filter(Boolean) as { label: string; count: number; colorClass: string }[]

  // ── The funnel (design Criteria · Funnel) ──
  //
  // It drives the page's own filter sets rather than keeping a second copy:
  // the trend chips are the technical conditions, the growth chips the
  // fundamental ones, and the five stages with no data are inert.
  // The Momentum stage's chips, read from the radar. The tier mart behind
  // `momentum-filter` is still accumulating; this route answers today.
  const momentumQ = useQuery({
    queryKey: ['screener', 'momentum-grades'],
    queryFn: async () => {
      const grades = ['A+', 'A', 'B', 'C'] as const
      const res = await Promise.all(
        grades.map((g) => fetchMomentumRadar({ grade: g, limit: PRESET_PAGE_LIMIT })),
      )
      return grades.map((g, i) => {
        const rows = res[i].rows ?? []
        return {
          id: `grade_${g === 'A+' ? 'aplus' : g.toLowerCase()}`,
          // **Names, not rows.** The radar returns a row per symbol per
          // date — grade A comes back as 92 rows over 56 names — and every
          // other chip on this panel counts names out of the universe. Two
          // chips side by side meaning different things is worse than either
          // number being wrong.
          pass: new Set(rows.map((r) => r.symbol)).size,
          // The route caps its page, so a full page is a floor, not a count.
          capped: rows.length >= PRESET_PAGE_LIMIT,
        }
      })
    },
    staleTime: 5 * 60_000,
  })

  const [presetBusy, setPresetBusy] = useState<string | null>(null)
  const applyPreset = useCallback(
    async (id: string) => {
      const preset = SCREENER_PRESETS.find((x) => x.id === id)
      if (preset?.load == null) return
      setPresetBusy(id)
      try {
        const symbols = await preset.load()
        setSymbolText(symbols.join(','))
      } finally {
        setPresetBusy(null)
      }
    },
    [],
  )

  // Catalyst's SEC 8-K chips (Rev .43): one read of the whole 7-day window,
  // asked for in full so a chip never counts a truncated page.
  const narrQ = useNarrativeWindow(NARRATIVE_WINDOW_DAYS, { limit: 2000 })
  const narrByCondition = useMemo(
    () => (narrQ.data ? namesByCondition(narrQ.data.tags) : null),
    [narrQ.data],
  )
  const [narrActive, setNarrActive] = useState<ReadonlySet<string>>(() => new Set())

  const universe = criteriaStats?.universe_count ?? null
  const funnelActive = useMemo(
    () => new Set<string>([...filters.techCondFilter, ...filters.condFilter, ...narrActive]),
    [filters.techCondFilter, filters.condFilter, narrActive],
  )
  const stageCounts = useMemo(
    () => ({
      trend: atLeast(criteriaStats?.technical?.pass_count_distribution, mins.trend ?? 0),
      growth: atLeast(criteriaStats?.fundamental?.pass_count_distribution, mins.growth ?? 0),
      // Every graded name the radar can reach. Two of the four grades come
      // back at the route's cap, so this is a floor — the panel says so.
      momentum: momentumQ.data?.reduce((n, g) => n + g.pass, 0) ?? null,
      // Nothing picked passes the whole universe through, as a `min` of 0
      // does; otherwise the names passing any picked 8-K chip.
      catalyst:
        narrActive.size === 0
          ? (criteriaStats?.universe_count ?? null)
          : narrByCondition
            ? namesPassing(narrByCondition, narrActive).size
            : null,
    }),
    [criteriaStats, mins, momentumQ.data, narrActive, narrByCondition],
  )
  const chipCounts = useMemo(
    () => ({
      trend: criteriaStats?.technical?.conditions ?? null,
      growth: criteriaStats?.fundamental?.conditions ?? null,
      momentum: momentumQ.data ?? null,
      catalyst: narrByCondition
        ? NARRATIVE_CONDITIONS.map((c) => ({
            id: c.id,
            pass: narrByCondition.get(c.id)?.size ?? 0,
            capped: narrQ.data?.truncated === true,
          }))
        : null,
    }),
    [criteriaStats, momentumQ.data, narrByCondition, narrQ.data],
  )
  // Narrative page rule 4: an 8-K condition cuts a screen but cannot start
  // one. Picked alone, Run says so instead of running the universe.
  const measuredPicked = filters.techCondFilter.size + filters.condFilter.size > 0
  const runBlocked =
    narrActive.size > 0 && !measuredPicked
      ? 'Narrative conditions cut a screen; they cannot start one — pick a measured condition too'
      : null
  // The design's "no Search step" cannot be honoured literally — the counts
  // and the names come from different endpoints — so the step moves into the
  // panel and does both halves in one press.
  const [runBusy, setRunBusy] = useState(false)
  const runFunnel = useCallback(async () => {
    if (!filters.anyFilterActive) return
    setRunBusy(true)
    try {
      const symbols = await filters.runFilter()
      if (symbols != null) {
        fundBucket.clearActive()
        techBucket.clearActive()
        fundCond.clearActive()
        techCond.clearActive()
        // The 8-K chips are the last cut, applied here: the measured screen
        // runs server-side and knows nothing of the narrative column.
        const kept =
          narrActive.size > 0 && narrByCondition
            ? (() => {
                const pass = namesPassing(narrByCondition, narrActive)
                return symbols.filter((sym) => pass.has(sym.toUpperCase()))
              })()
            : symbols
        setSymbolText(kept.join(','))
      }
    } finally {
      setRunBusy(false)
    }
  }, [filters, fundBucket, techBucket, fundCond, techCond, narrActive, narrByCondition])

  const toggleFunnelChip = useCallback(
    (stageId: string, conditionId: string) => {
      if (stageId === 'trend') filters.toggleTechCondFilter(conditionId)
      else if (stageId === 'growth') filters.toggleCondFilter(conditionId)
      else if (stageId === 'catalyst' && isNarrativeCondition(conditionId)) {
        setNarrActive((prev) => {
          const next = new Set(prev)
          if (next.has(conditionId)) next.delete(conditionId)
          else next.add(conditionId)
          return next
        })
      }
    },
    [filters],
  )
  const clearFunnel = useCallback(() => {
    filters.clearAllFilters()
    setNarrActive(new Set())
  }, [filters])

  return (
    <PageShell className="flex w-full min-w-0 flex-col gap-2">
      <PageHeader
        title="Screener · Stocks"
        description="Conditions in, a set out — deterministic and saveable. Pick a universe, stack criteria, watch the count fall. Ranking the survivors is the model’s job."
        actions={
          <>
            <PageFaceSwitch path="/research/screener" />
            {/* `sepa` until 2026-09-21, which made everything asked here read
                as SEPA's — a different station with a different store. The
                Pipeline census keeps the old token pointing at Stock ratings
                so rows already on file stay readable. */}
            <AskCopilotButton
              originPage="stock-screener"
              originLabel="Stock screen"
              symbol={
                inspector?.symbol ||
                symbolText.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).find(Boolean)
              }
              snapshot={compactSnapshot({
                result_count: sortedRows.length,
                symbol_text: symbolText.slice(0, 120),
              })}
              suggestedPrompt="From this SEPA stock screener view, which names look most interesting to investigate next?"
            />
          </>
        }
      />

      {criteriaError && (
        <QueryErrorAlert error={criteriaError} onRetry={() => void refetch()} />
      )}

      {/* ── The design's three columns: universe rail · funnel · results ── */}
      <div className="flex w-full min-w-0 flex-wrap items-start gap-2">
        <aside className="flex w-full flex-col gap-2 min-[1100px]:w-[15rem] min-[1100px]:flex-none">
          <SectionPanel cap="Universe" title="What the screen starts from">
            <div className="flex items-baseline justify-between gap-2 px-3 py-2">
              <span className="text-dense-label">Readiness snapshot</span>
              <span className="font-mono text-dense-label tabular-nums">
                {universe == null ? '—' : universe.toLocaleString()}
              </span>
            </div>
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              One universe on this side, evaluated {techAsOf || 'on an unknown date'}. The design
              offers a choice of four; the others have no list behind them here.
            </p>
          </SectionPanel>
          <SectionPanel cap="Presets" title="Starting points, not models">
            <div className="flex flex-col">
              {SCREENER_PRESETS.map((pr) =>
                pr.load == null ? (
                  <span
                    key={pr.id}
                    title={pr.missing ?? undefined}
                    className="flex items-baseline justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-muted-foreground last:border-b-0"
                  >
                    <span className="text-dense-label">{pr.label}</span>
                    <span className="font-mono text-dense-caption">{pr.meta}</span>
                  </span>
                ) : (
                  <button
                    key={pr.id}
                    type="button"
                    disabled={presetBusy != null}
                    onClick={() => void applyPreset(pr.id)}
                    title={`Load ${pr.label} (${pr.meta}) into Results`}
                    className="flex cursor-pointer items-baseline justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-left last:border-b-0 hover:bg-secondary/40 disabled:cursor-default disabled:opacity-60"
                  >
                    <span className="text-dense-label">{pr.label}</span>
                    <span className="font-mono text-dense-caption text-muted-foreground">
                      {presetBusy === pr.id ? 'loading…' : pr.meta}
                    </span>
                  </button>
                ),
              )}
            </div>
            <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              A preset here resolves to a set of names and lands in Results. It is not a saved
              screen — nothing on this side stores criteria. The two that are greyed say why on
              hover.
            </p>
          </SectionPanel>
          <SectionPanel cap="My screens" title="Saved by you">
            <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
              Nothing saves a screen yet. The design writes one as a Workbench preset or an
              Autopilot objective, both through the Decision Inbox; neither write exists here.
            </p>
          </SectionPanel>
        </aside>

        <div className="min-w-0 max-w-[32.5rem] flex-[1_1_24rem]">
          <ScreenerFunnelPanel
            universe={universe}
            stageCounts={stageCounts}
            chipCounts={chipCounts}
            mins={mins}
            onMinChange={(id, next) => setMins((m) => ({ ...m, [id]: next }))}
            active={funnelActive}
            onToggle={toggleFunnelChip}
            onClearAll={clearFunnel}
            loading={criteriaLoading}
            onRun={() => void runFunnel()}
            runBusy={runBusy || filters.filterLoading}
            ranCount={readiness.symbols.length > 0 ? readiness.symbols.length : null}
            runBlocked={runBlocked}
            narrativeCoverage={narrQ.data?.sources.filings_8k.names ?? null}
          />
        </div>

        <div className="min-w-0 flex-[999_1_35rem]">
          <SymbolsStrip
            symbolText={symbolText}
            onSymbolTextChange={handleSymbolTextChange}
            parsedCount={readiness.symbols.length}
            asOf={readiness.asOf}
            loading={readiness.isLoading}
            error={readiness.error}
            summary={readiness.summary}
          />
          <div className="mt-2">
            <ReadinessResultsTable
              rows={readiness.rows}
              sortedRows={sortedRows}
              sortCol={sortCol}
              sortDir={sortDir}
              loading={readiness.isLoading}
              error={readiness.error}
              symbolCount={readiness.symbols.length}
              activeSymbol={inspector?.symbol ?? null}
              onSort={toggleSort}
              onOpenInspector={toggleInspector}
            />
          </div>
        </div>
      </div>

      {/* ── The older arrangement of the same conditions, kept until the Owner
          rules on it. The funnel above replaces both of these surfaces in the
          design; what they still carry that it does not is the distribution
          histogram and the tier cards for the three stages with no data. ── */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
        <span className={SECTION_CAP_CLASS}>Also here</span>
        <span className="text-dense-meta text-muted-foreground">
          the same conditions in this page’s earlier arrangement — the design replaces both with the
          funnel above, and where each capability should land is the Owner’s call, not a deletion I
          should make
        </span>
      </div>

      {/* ── SEPA Dashboard: hero cards ── */}
      <div className="grid w-full grid-cols-1 gap-2 min-[900px]:grid-cols-2 items-stretch">
        <SepaHeroCard
          variant="tech"
          stats={criteriaStats ?? undefined}
          buckets={techDist}
          activeBucket={techBucket.activeBucket}
          loading={techBucket.loading || techCond.loading}
          criteriaLoading={criteriaLoading}
          asOf={techAsOf}
          onRefresh={() => void refetch()}
          onBucketClick={handleTechBucketClick}
          onConditionClick={handleTechConditionClick}
          activeConditionId={techCond.activeConditionId}
          activeHint={techBucket.activeBucket != null ? (
            <div className="text-dense-caption text-screener-tech mb-0.5">
              {techBucket.loading && <span>Loading…</span>}
              {techBucket.error && <span className="text-destructive">{techBucket.error}</span>}
              {!techBucket.loading && !techBucket.error && techBucket.loadedCount != null && (
                <span>
                  <span className="font-mono font-semibold">{techBucket.activeBucket}/11</span>
                  {' '}— {techBucket.loadedCount} → Results
                </span>
              )}
            </div>
          ) : null}
          conditionHint={techCond.activeConditionId != null ? (
            <div className="text-dense-caption text-screener-tech mb-0.5">
              {techCond.loading && <span>Loading…</span>}
              {techCond.error && <span className="text-destructive">{techCond.error}</span>}
              {!techCond.loading && !techCond.error && techCond.loadedCount != null && (
                <span>
                  <span className="font-mono font-semibold">{techCond.activeConditionId}</span>
                  {' '}— {techCond.loadedCount} → Results
                </span>
              )}
            </div>
          ) : null}
        />

        <SepaHeroCard
          variant="fund"
          stats={criteriaStats ?? undefined}
          buckets={fundDist}
          activeBucket={fundBucket.activeBucket}
          loading={fundBucket.loading || fundCond.loading}
          criteriaLoading={criteriaLoading}
          asOf={fundAsOf}
          onRefresh={() => void refetch()}
          onBucketClick={handleFundBucketClick}
          onConditionClick={handleFundConditionClick}
          activeConditionId={fundCond.activeConditionId}
          activeHint={fundBucket.activeBucket != null ? (
            <div className="text-dense-caption text-emerald-700 dark:text-emerald-400 mb-0.5">
              {fundBucket.loading && <span>Loading…</span>}
              {fundBucket.error && <span className="text-destructive">{fundBucket.error}</span>}
              {!fundBucket.loading && !fundBucket.error && fundBucket.loadedCount != null && (
                <span>
                  <span className="font-mono font-semibold">{fundBucket.activeBucket}/8</span>
                  {' '}— {fundBucket.loadedCount} → Results
                </span>
              )}
            </div>
          ) : null}
          conditionHint={fundCond.activeConditionId != null ? (
            <div className="text-dense-caption text-screener-fund mb-0.5">
              {fundCond.loading && <span>Loading…</span>}
              {fundCond.error && <span className="text-destructive">{fundCond.error}</span>}
              {!fundCond.loading && !fundCond.error && fundCond.loadedCount != null && (
                <span>
                  <span className="font-mono font-semibold">{fundCond.activeConditionId}</span>
                  {' '}— {fundCond.loadedCount} → Results
                </span>
              )}
            </div>
          ) : null}
        />
      </div>

      {/* ── Collapsible filter panels — mirror hero grid ── */}
      <div className="grid w-full grid-cols-1 gap-2 min-[900px]:grid-cols-2 items-start">
        <CollapsibleFilterPanel
          variant="tech"
          label="Technical"
          tags={techTags}
          totalActive={techTotalActive}
        >
          <div className="grid w-full grid-cols-1 gap-1.5 min-[560px]:grid-cols-2 min-[1200px]:grid-cols-2">
            <ConditionChipGroup
              title="SEPA Conditions"
              groups={techCondGroups}
              activeIds={filters.techCondFilter}
              onToggle={filters.toggleTechCondFilter}
              onClearAll={filters.clearTechCondFilter}
            />
            <div className={screenerStackColClass}>
              <TierFilterCard
                tier="momentum"
                groupedMomentum
                indicators={TIER_CATALOG.momentum}
                activeIds={filters.tierFilters.momentum.indicators}
                minScore={filters.tierFilters.momentum.minScore}
                onToggle={(id) => filters.toggleTierIndicator('momentum', id)}
                onMinScoreChange={(s) => filters.setTierMinScore('momentum', s)}
                onClear={() => filters.clearTierFilter('momentum')}
              />
              <TierFilterCard
                tier="structure"
                indicators={STRUCTURE_INDICATORS}
                activeIds={filters.tierFilters.structure.indicators}
                minScore={filters.tierFilters.structure.minScore}
                onToggle={(id) => filters.toggleTierIndicator('structure', id)}
                onMinScoreChange={(s) => filters.setTierMinScore('structure', s)}
                onClear={() => filters.clearTierFilter('structure')}
              />
              <TierFilterCard
                tier="sentiment"
                indicators={SENTIMENT_INDICATORS}
                activeIds={filters.tierFilters.sentiment.indicators}
                minScore={filters.tierFilters.sentiment.minScore}
                onToggle={(id) => filters.toggleTierIndicator('sentiment', id)}
                onMinScoreChange={(s) => filters.setTierMinScore('sentiment', s)}
                onClear={() => filters.clearTierFilter('sentiment')}
              />
            </div>
          </div>
        </CollapsibleFilterPanel>

        <CollapsibleFilterPanel
          variant="fund"
          label="Fundamental"
          tags={fundTags}
          totalActive={fundTotalActive}
        >
          <div className="grid w-full grid-cols-1 gap-1.5 min-[560px]:grid-cols-2 min-[1000px]:grid-cols-3">
            <ConditionChipGroup
              title="SEPA Conditions"
              groups={fundCoreGroups}
              activeIds={filters.condFilter}
              onToggle={filters.toggleCondFilter}
              onClearAll={() => {
                filters.clearSepaGroupFilter('eps', SEPA_COND_CATALOG)
                filters.clearSepaGroupFilter('rev', SEPA_COND_CATALOG)
              }}
            />
            <div className={screenerStackColClass}>
              {renderExtCard('quality')}
              {renderExtCard('efficiency')}
              {renderExtCard('balance')}
              {renderExtCard('sentiment')}
            </div>
            <div className={screenerStackColClass}>
              {renderExtCard('cashflow')}
              {renderExtCard('valuation')}
              {renderExtCard('profitability')}
            </div>
          </div>
        </CollapsibleFilterPanel>
      </div>

      {filters.anyFilterActive && (
        <FilterActionBar
          condCount={filters.condFilter.size}
          techCount={filters.techCondFilter.size}
          tierFilters={filters.tierFilters}
          filterPreview={filters.filterPreview}
          filterLoading={filters.filterLoading}
          filterError={filters.filterError}
          onSearch={filters.previewFilter}
          onApply={handleApplyFilter}
          onRetry={filters.previewFilter}
          onClear={filters.clearAllFilters}
        />
      )}

      <InspectorDrawer
        state={
          inspector
            ? {
                type: 'stock',
                symbol: inspector.symbol,
                fundamentalSeed: inspector.seed,
              }
            : { type: null }
        }
        onClose={() => setInspector(null)}
      />
    </PageShell>
  )
}
