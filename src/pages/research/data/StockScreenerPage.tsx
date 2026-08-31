import { useCallback, useMemo, useState } from 'react'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { PageHeader, PageShell } from '@/components/layout'
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
import type { ReadinessSnapshotRow } from '@/types/stockScreener'
import { formatCriteriaAsOf, prepareDistBuckets } from '@/utils/stockScreener'

export default function StockScreenerPage() {
  const [symbolText, setSymbolText] = useState('')
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
    techFilterActive > 0 && { label: 'SEPA', count: techFilterActive, colorClass: 'bg-violet-400/15 text-violet-300' },
    techMomActive > 0 && { label: 'Mom', count: techMomActive, colorClass: 'bg-amber-500/15 text-amber-400' },
    techStrActive > 0 && { label: 'Str', count: techStrActive, colorClass: 'bg-emerald-400/15 text-emerald-300' },
    techSenActive > 0 && { label: 'Sen', count: techSenActive, colorClass: 'bg-pink-400/15 text-pink-300' },
  ].filter(Boolean) as { label: string; count: number; colorClass: string }[]

  const fundFilterActive = filters.condFilter.size
  const fundTotalActive = fundFilterActive

  const fundTags = [
    fundFilterActive > 0 && { label: 'Conditions', count: fundFilterActive, colorClass: 'bg-emerald-400/15 text-emerald-300' },
  ].filter(Boolean) as { label: string; count: number; colorClass: string }[]

  return (
    <PageShell className="flex w-full min-w-0 flex-col gap-2">
      <PageHeader
        title="Stock Screener"
        description="Discover symbols by SEPA conditions and inspect their daily readiness snapshot."
        actions={
          <AskCopilotButton
            originPage="sepa"
            originLabel="Stock Screener"
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
        }
      />

      {criteriaError && (
        <QueryErrorAlert error={criteriaError} onRetry={() => void refetch()} />
      )}

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
            <div className="text-dense-caption text-emerald-400 mb-0.5">
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

      <SymbolsStrip
        symbolText={symbolText}
        onSymbolTextChange={handleSymbolTextChange}
        parsedCount={readiness.symbols.length}
        asOf={readiness.asOf}
        loading={readiness.isLoading}
        error={readiness.error}
        summary={readiness.summary}
      />

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
