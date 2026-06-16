import { useCallback, useMemo, useState } from 'react'
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
  useAutoLoadTopBucket,
  useDistributionBucketLoader,
  useStockScreenerCriteria,
} from '@/hooks/useStockScreenerCriteria'
import { useStockScreenerFilters } from '@/hooks/useStockScreenerFilters'
import { useReadinessSort, useSymbolsReadinessSnapshot } from '@/hooks/useSymbolsReadinessSnapshot'
import { ConditionChipGroup } from './stockScreener/ConditionChipGroup'
import { DistFunnelCard } from './stockScreener/DistFunnelCard'
import { FilterActionBar } from './stockScreener/FilterActionBar'
import { ReadinessResultsTable } from './stockScreener/ReadinessResultsTable'
import { SectionHeader } from './stockScreener/SectionHeader'
import { SEGMENT } from './stockScreener/segmentStyles'
import { SymbolsStrip } from './stockScreener/SymbolsStrip'
import { TierFilterCard } from './stockScreener/TierFilterCard'
import {
  screenerFundRowClass,
  screenerStackColClass,
  screenerTechRowClass,
} from './stockScreener/stockScreenerUi'
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

  const filters = useStockScreenerFilters()

  const readiness = useSymbolsReadinessSnapshot(symbolText)
  const { sortCol, sortDir, toggleSort, sortedRows } = useReadinessSort(readiness.rows)

  const criteriaAsOf = formatCriteriaAsOf(criteriaStats?.computed_at)
  const criteriaError = criteriaQueryError instanceof Error ? criteriaQueryError.message : null

  const fundDist = useMemo(
    () => prepareDistBuckets(criteriaStats?.fundamental?.pass_count_distribution),
    [criteriaStats],
  )
  const techDist = useMemo(
    () => prepareDistBuckets(criteriaStats?.technical?.pass_count_distribution, 8),
    [criteriaStats],
  )

  const handleFundBucketClick = useCallback((n: number, count: number) => {
    techBucket.clearActive()
    filters.clearFilterPreview()
    fundBucket.handleBucketClick(n, count)
  }, [techBucket, fundBucket, filters])

  const handleTechBucketClick = useCallback((n: number, count: number) => {
    fundBucket.clearActive()
    filters.clearFilterPreview()
    techBucket.handleBucketClick(n, count)
  }, [fundBucket, techBucket, filters])

  useAutoLoadTopBucket(fundDist?.buckets ?? null, handleFundBucketClick)

  const handleSymbolTextChange = useCallback((text: string) => {
    fundBucket.clearActive()
    techBucket.clearActive()
    filters.clearFilterPreview()
    setSymbolText(text)
  }, [fundBucket, techBucket, filters])

  const handleApplyFilter = useCallback(() => {
    if (!filters.filterPreview) return
    fundBucket.clearActive()
    techBucket.clearActive()
    setSymbolText(filters.filterPreview.symbols.join(','))
  }, [filters.filterPreview, fundBucket, techBucket])

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

  return (
    <PageShell className="flex w-full min-w-0 flex-col gap-3">
      <PageHeader
        title="Stock Screener"
        description="Discover symbols by SEPA conditions and inspect their daily readiness snapshot."
      />

      {criteriaError && (
        <QueryErrorAlert error={criteriaError} onRetry={() => void refetch()} />
      )}

      {/* Technical */}
      <section className="space-y-2">
        <SectionHeader label="Technical" variant="tech" />
        <div className={screenerTechRowClass}>
          <DistFunnelCard
            variant="tech"
            suffix="11"
            buckets={techDist?.buckets ?? null}
            base={techDist?.base ?? 1}
            maxCount={techDist?.maxCount ?? 1}
            activeBucket={techBucket.activeBucket}
            loading={techBucket.loading}
            criteriaLoading={criteriaLoading}
            criteriaError={criteriaStats && !criteriaStats.ok ? criteriaStats.error : null}
            asOf={criteriaAsOf}
            onRefresh={() => void refetch()}
            onBucketClick={handleTechBucketClick}
            activeHint={techBucket.activeBucket != null ? (
              <div className="text-[10px] text-screener-tech mb-1">
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
          />

          <ConditionChipGroup
            title="SEPA Conditions"
            groups={techCondGroups}
            activeIds={filters.techCondFilter}
            onToggle={filters.toggleTechCondFilter}
            onClearAll={filters.clearTechCondFilter}
          />

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

          <div className={screenerStackColClass}>
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
      </section>

      {/* Fundamental */}
      <section className="space-y-2">
        <SectionHeader label="Fundamental" variant="fund" />
        <div className={screenerFundRowClass}>
          <DistFunnelCard
            variant="fund"
            suffix="8"
            buckets={fundDist?.buckets ?? null}
            base={fundDist?.base ?? 1}
            maxCount={fundDist?.maxCount ?? 1}
            activeBucket={fundBucket.activeBucket}
            loading={fundBucket.loading}
            criteriaLoading={criteriaLoading}
            asOf={criteriaAsOf}
            onRefresh={() => void refetch()}
            onBucketClick={handleFundBucketClick}
            activeHint={fundBucket.activeBucket != null ? (
              <div className="text-[10px] text-emerald-400 mb-1">
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
          />

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
          </div>
          <div className={screenerStackColClass}>
            {renderExtCard('balance')}
            {renderExtCard('sentiment')}
          </div>
          <div className={screenerStackColClass}>
            {renderExtCard('cashflow')}
            {renderExtCard('valuation')}
            {renderExtCard('profitability')}
          </div>
        </div>
      </section>

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
